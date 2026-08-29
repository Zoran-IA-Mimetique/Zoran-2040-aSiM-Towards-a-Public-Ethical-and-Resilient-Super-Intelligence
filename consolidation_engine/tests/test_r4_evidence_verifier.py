#!/usr/bin/env python3
"""Tests adversariaux du vérificateur R4, sans dépendance réseau."""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import types
import unittest
from unittest import mock
import zipfile

from tools import verify_r3_evidence as verifier


ENGINE = Path(__file__).resolve().parents[1]
R3 = ENGINE / "evidence" / "r3"
R4 = ENGINE / "evidence" / "r4"
SCRIPT = ENGINE / "tools" / "verify_r3_evidence.py"
WORKFLOW = ENGINE.parent / ".github" / "workflows" / "zce-r3-evidence.yml"


def write_closed_sums(root: Path) -> None:
    lines = []
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            relative = path.relative_to(root).as_posix()
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            lines.append(f"{digest}  {relative}")
    (root / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


class R4EvidenceVerifierTests(unittest.TestCase):
    def assert_rejected(self, function, *args) -> None:
        with self.assertRaises(verifier.VerificationError):
            function(*args)

    def run_replay(self, r3: Path, r4: Path, work: Path,
                   *, repin_r4: bool = False) -> subprocess.CompletedProcess:
        script = SCRIPT
        if repin_r4:
            source = SCRIPT.read_text(encoding="utf-8")
            old = (
                f'R4_SHA256SUMS_SHA256 = "{verifier.R4_SHA256SUMS_SHA256}"'
            )
            new = f'R4_SHA256SUMS_SHA256 = "{verifier.sha256_file(r4 / "SHA256SUMS")}"'
            self.assertEqual(source.count(old), 1)
            script = work.parent / "verify_r4_repin_test_only.py"
            script.write_text(source.replace(old, new), encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(script), "--evidence-dir", str(r3),
             "--r4-evidence-dir", str(r4), "--workdir", str(work),
             "--require-c31-v2"],
            cwd=ENGINE, text=True, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, check=False,
        )

    def test_strict_json_rejects_duplicate_key(self):
        self.assert_rejected(
            verifier.strict_json_bytes, b'{"a":1,"a":2}', "duplicate")

    def test_strict_json_rejects_non_finite_number(self):
        for payload in (b'{"a":NaN}', b'{"a":1e309}', b'{"a":-1e309}'):
            with self.subTest(payload=payload):
                self.assert_rejected(
                    verifier.strict_json_bytes, payload, "non-finite")

    def test_nested_evidence_path_is_accepted(self):
        self.assertEqual(
            verifier.safe_relative("source/R2_DETTE_COH_9808AE1.jsonl").as_posix(),
            "source/R2_DETTE_COH_9808AE1.jsonl",
        )

    def test_evidence_parent_traversal_is_rejected(self):
        self.assert_rejected(verifier.safe_relative, "raw/../escape")

    def test_evidence_backslash_is_rejected(self):
        self.assert_rejected(verifier.safe_relative, "raw\\escape")

    def test_closed_sums_supports_nested_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            item = root / "raw" / "item.jsonl"
            item.parent.mkdir()
            item.write_bytes(b"{}\n")
            write_closed_sums(root)
            self.assertEqual(verifier.validate_closed_sums(root), {"raw/item.jsonl"})

    def test_closed_sums_rejects_unlisted_extra_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            item = root / "item"
            item.write_bytes(b"x")
            write_closed_sums(root)
            (root / "extra").write_bytes(b"y")
            self.assert_rejected(verifier.validate_closed_sums, root)

    def test_closed_sums_rejects_duplicate_line(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            item = root / "item"
            item.write_bytes(b"x")
            line = f"{verifier.sha256_file(item)}  item\n"
            (root / "SHA256SUMS").write_text(line + line, encoding="utf-8")
            self.assert_rejected(verifier.validate_closed_sums, root)

    def test_zip_parent_traversal_is_rejected(self):
        self.assert_rejected(
            verifier._zip_path, "ZORAN_OPPOSED_PAIR_GATE_V1_1/../escape")

    def test_zip_traversal_is_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "bad.zip"
            with zipfile.ZipFile(bundle, "w") as archive:
                archive.writestr(
                    "ZORAN_OPPOSED_PAIR_GATE_V1_1/../../escape", b"owned")
            self.assert_rejected(
                verifier.validate_and_extract_zip, bundle, root / "work")
            self.assertFalse((root / "escape").exists())

    def test_zip_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "bad.zip"
            link = zipfile.ZipInfo("ZORAN_OPPOSED_PAIR_GATE_V1_1/link")
            link.create_system = 3
            link.external_attr = (stat.S_IFLNK | 0o777) << 16
            with zipfile.ZipFile(bundle, "w") as archive:
                archive.writestr(link, "target")
            self.assert_rejected(
                verifier.validate_and_extract_zip, bundle, root / "work")

    def test_zip_duplicate_member_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "bad.zip"
            name = "ZORAN_OPPOSED_PAIR_GATE_V1_1/item"
            with zipfile.ZipFile(bundle, "w") as archive:
                archive.writestr(name, b"one")
                with self.assertWarns(UserWarning):
                    archive.writestr(name, b"two")
            self.assert_rejected(
                verifier.validate_and_extract_zip, bundle, root / "work")

    def test_zip_high_ratio_is_rejected_before_crc_read(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "bomb.zip"
            with zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr(
                    "ZORAN_OPPOSED_PAIR_GATE_V1_1/bomb", b"0" * 1_000_000)
            self.assert_rejected(
                verifier.validate_and_extract_zip, bundle, root / "work")

    def test_self_manifested_sitecustomize_zip_substitution_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bundle = root / "substituted.zip"
            marker = root / "sitecustomize-executed"
            payload = (
                "from pathlib import Path\n"
                f"Path({str(marker)!r}).write_text('executed')\n"
                "import os\nos._exit(0)\n"
            ).encode("utf-8")
            with zipfile.ZipFile(R3 / verifier.BUNDLE) as source, \
                    zipfile.ZipFile(bundle, "w", zipfile.ZIP_DEFLATED) as target:
                manifest = json.loads(source.read(verifier.ZIP_MANIFEST))
                for info in source.infolist():
                    if info.filename != verifier.ZIP_MANIFEST:
                        target.writestr(info, source.read(info.filename))
                manifest["files"].append({
                    "path": "sitecustomize.py",
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "size_bytes": len(payload),
                })
                manifest["files"].sort(key=lambda item: item["path"])
                target.writestr(
                    verifier.ZIP_MANIFEST,
                    json.dumps(manifest, sort_keys=True, ensure_ascii=False,
                               separators=(",", ":")).encode("utf-8"),
                )
                target.writestr(f"{verifier.ZIP_ROOT}/sitecustomize.py", payload)
            with self.assertRaisesRegex(verifier.VerificationError,
                                        "OPG_ZIP_BYTES"):
                verifier.validate_and_extract_zip(bundle, root / "work")
            self.assertFalse(marker.exists())

    def test_exact_recovered_c31_ledger_passes(self):
        raw = (R4 / "source" / "R2_DETTE_COH_9808AE1.jsonl").read_bytes()
        observed = verifier.validate_debt_ledger(raw)
        self.assertEqual(len(observed["entries"]), 9)
        self.assertEqual(observed["head"], verifier.R2_LEDGER_HEAD)

    def test_one_byte_c31_mutation_is_rejected(self):
        raw = bytearray(
            (R4 / "source" / "R2_DETTE_COH_9808AE1.jsonl").read_bytes())
        raw[10] ^= 1
        self.assert_rejected(verifier.validate_debt_ledger, bytes(raw))

    def test_full_r3_r4_replay_passes(self):
        with tempfile.TemporaryDirectory() as temporary:
            work = Path(temporary) / "work"
            result = self.run_replay(R3, R4, work)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("PASS_R4_EVIDENCE", result.stdout)

    def test_manifest_pins_are_revalidated_after_all_replay_work(self):
        for target in ("r3", "r4"):
            with self.subTest(target=target), \
                    tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "r3"
                r4 = root / "r4"
                work = root / "work"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                if target == "r3":
                    original = verifier.validate_and_extract_zip

                    def mutate_after_initial_checks(bundle, destination):
                        extracted = original(bundle, destination)
                        report = r3 / "ZCE_R3_PREPUBLICATION_REPORT.md"
                        report.write_text(
                            "attacker replacement during replay\n",
                            encoding="utf-8",
                        )
                        write_closed_sums(r3)
                        return extracted

                    patcher = mock.patch.object(
                        verifier, "validate_and_extract_zip",
                        side_effect=mutate_after_initial_checks)
                    marker = "R3_MANIFEST_PIN_FINAL"
                else:
                    original = verifier.validate_pinned_r4_receipts

                    def mutate_after_initial_checks(directory):
                        original(directory)
                        mission = (
                            r4 / "source" / "ZCE_R4_MISSION_CONTRACT.json"
                        )
                        mission.write_bytes(mission.read_bytes() + b"\n")
                        write_closed_sums(r4)

                    patcher = mock.patch.object(
                        verifier, "validate_pinned_r4_receipts",
                        side_effect=mutate_after_initial_checks)
                    marker = "R4_MANIFEST_PIN_FINAL"
                argv = [str(SCRIPT), "--evidence-dir", str(r3),
                        "--r4-evidence-dir", str(r4), "--workdir", str(work),
                        "--require-c31-v2"]
                with patcher, mock.patch.object(sys, "argv", argv), \
                        self.assertRaisesRegex(verifier.VerificationError, marker):
                    verifier.main()

    def test_git_global_template_hook_cannot_execute(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            template = root / "template"
            hooks = template / "hooks"
            hooks.mkdir(parents=True)
            marker = root / "hook-executed"
            hook = hooks / "post-checkout"
            hook.write_text(
                "#!/bin/sh\nprintf compromised > " + str(marker) + "\n",
                encoding="utf-8",
            )
            hook.chmod(0o755)
            config = root / "malicious.gitconfig"
            config.write_text(
                "[init]\n\ttemplateDir = " + str(template) + "\n",
                encoding="utf-8",
            )
            env = os.environ.copy()
            env["GIT_CONFIG_GLOBAL"] = str(config)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--evidence-dir", str(R3),
                 "--r4-evidence-dir", str(R4),
                 "--workdir", str(root / "work"), "--require-c31-v2"],
                cwd=ENGINE, env=env, text=True, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse(marker.exists(), "untrusted Git hook executed")

    def test_c31_blocker_hash_substitution_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            receipt_path = r4 / "C31_LEDGER_PIN_AND_DERIVATION_V2.json"
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            receipt["external_promotion_blockers"][0]["evidence_sha256"] = "0" * 64
            receipt_path.write_text(
                json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            write_closed_sums(r4)
            result = self.run_replay(
                r3, r4, root / "work", repin_r4=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("C31_C26_BLOCKER_LINK", result.stderr)

    def test_every_r4_receipt_is_bound_to_the_mission(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            path = r4 / "GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json"
            value = json.loads(path.read_text(encoding="utf-8"))
            value["mission_contract_sha256"] = "0" * 64
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
            write_closed_sums(r4)
            result = self.run_replay(r3, r4, root / "work", repin_r4=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("R4_MISSION_RECEIPT_LINK", result.stderr)

    def test_mission_source_quote_substitution_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            path = r4 / "source" / "ZCE_R4_MISSION_CONTRACT.json"
            value = json.loads(path.read_text(encoding="utf-8"))
            value["requirements"][0]["source_quote"] = "jamais main"
            value["requirements"][0]["sha256"] = verifier.canonical_sha256({
                "id": value["requirements"][0]["id"],
                "value": value["requirements"][0]["value"],
                "source_quote": value["requirements"][0]["source_quote"],
            })
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
            write_closed_sums(r4)
            result = self.run_replay(r3, r4, root / "work", repin_r4=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("R4_MISSION_FILE_BYTES", result.stderr)

    def test_remote_run_head_substitution_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            path = r4 / "GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json"
            value = json.loads(path.read_text(encoding="utf-8"))
            value["observed_run"]["head_sha"] = "0" * 40
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
            write_closed_sums(r4)
            result = self.run_replay(r3, r4, root / "work", repin_r4=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("R4_REMOTE_SUPERSESSION", result.stderr)

    def test_cli_symlink_roots_and_overlapping_workdir_are_rejected(self):
        cases = ("r3-root", "r4-parent", "workdir-symlink", "workdir-overlap")
        for case in cases:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "real-r3"
                r4 = root / "real-r4"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                work = root / "work"
                expected = ""
                if case == "r3-root":
                    link = root / "r3-link"
                    link.symlink_to(r3, target_is_directory=True)
                    r3_arg, r4_arg, work_arg = link, r4, work
                    expected = "R3_ROOT_SYMLINK"
                elif case == "r4-parent":
                    parent_link = root / "parent-link"
                    parent_link.symlink_to(root, target_is_directory=True)
                    r3_arg, r4_arg = r3, parent_link / "real-r4"
                    work_arg = work
                    expected = "R4_ROOT_SYMLINK"
                elif case == "workdir-symlink":
                    real_work = root / "real-work"
                    real_work.mkdir()
                    work_link = root / "work-link"
                    work_link.symlink_to(real_work, target_is_directory=True)
                    r3_arg, r4_arg, work_arg = r3, r4, work_link
                    expected = "ROOT_WORKDIR_SYMLINK"
                else:
                    r3_arg, r4_arg = r3, r4
                    work_arg = r4 / "unlisted-workdir"
                    expected = "ROOT_WORKDIR_EVIDENCE_OVERLAP"
                result = self.run_replay(r3_arg, r4_arg, work_arg)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected, result.stderr)
                if case == "workdir-overlap":
                    self.assertFalse(work_arg.exists())

    def test_r2_audit_or_snapshot_self_consistent_rewrite_is_rejected(self):
        for mode in ("audit-controls", "snapshot-semantics"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "r3"
                r4 = root / "r4"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                receipt_path = r4 / "R2_EVIDENCE_SUPERSESSION_V2.json"
                receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
                if mode == "audit-controls":
                    audit_path = (
                        r4 / "source" /
                        "ZCE_R2_MAX_HARNESS_TERMINAL_AUDIT.json"
                    )
                    audit = json.loads(audit_path.read_text(encoding="utf-8"))
                    audit["controls"]["C01"] = False
                    audit_path.write_text(
                        json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                    receipt["chain"][1]["audit_file_sha256"] = (
                        verifier.sha256_file(audit_path)
                    )
                else:
                    snapshot_path = (
                        r4 / "source" /
                        "ZCE_R2_MAX_HARNESS_TERMINAL_SNAPSHOT.json"
                    )
                    snapshot = json.loads(
                        snapshot_path.read_text(encoding="utf-8"))
                    snapshot["engine"]["standard_library_only"] = False
                    snapshot_path.write_text(
                        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                    receipt["chain"][1]["snapshot_file_sha256"] = (
                        verifier.sha256_file(snapshot_path)
                    )
                    receipt["chain"][1]["snapshot_canonical_sha256"] = (
                        verifier.canonical_sha256(snapshot)
                    )
                receipt_path.write_text(
                    json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                write_closed_sums(r4)
                result = self.run_replay(
                    r3, r4, root / "work", repin_r4=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(
                    "R2_SUPERSESSION_PINNED_DIGESTS:R2_TERMINAL_MAX_HARNESS",
                    result.stderr,
                )

    def test_receipt_controlled_parent_path_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            path = r4 / "C31_LEDGER_PIN_AND_DERIVATION_V2.json"
            value = json.loads(path.read_text(encoding="utf-8"))
            value["criticality_policy"]["path"] = "../r3/item.json"
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
            write_closed_sums(r4)
            result = self.run_replay(r3, r4, root / "work", repin_r4=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("C31_CRITICALITY_POLICY_PATH", result.stderr)

    def test_governance_replay_and_policy_injections_are_rejected(self):
        cases = ("replay-command", "head-binding", "criticality-policy")
        for case in cases:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "r3"
                r4 = root / "r4"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                if case == "replay-command":
                    path = r4 / "R4_CONTRADICTION_REPLAY_PACK_V1.json"
                    value = json.loads(path.read_text(encoding="utf-8"))
                    value["replay_commands"] = ['rm -rf "$HOME"']
                    marker = "R4_REPLAY_PACK"
                elif case == "head-binding":
                    path = r4 / "GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json"
                    value = json.loads(path.read_text(encoding="utf-8"))
                    value["r4_head_binding"]["workflow_assertion"] = (
                        "trust synthetic merge"
                    )
                    marker = "R4_REMOTE_SUPERSESSION"
                else:
                    policy_path = (
                        r4 / "C31_FAIL_CLOSED_CRITICALITY_POLICY_V1.json"
                    )
                    policy = json.loads(policy_path.read_text(encoding="utf-8"))
                    policy["rules"] = []
                    policy_path.write_text(
                        json.dumps(policy, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                    path = r4 / "C31_LEDGER_PIN_AND_DERIVATION_V2.json"
                    value = json.loads(path.read_text(encoding="utf-8"))
                    value["criticality_policy"]["content_sha256"] = (
                        verifier.sha256_file(policy_path)
                    )
                    marker = "C31_CRITICALITY_POLICY"
                path.write_text(
                    json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                write_closed_sums(r4)
                result = self.run_replay(
                    r3, r4, root / "work", repin_r4=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(marker, result.stderr)

        r3_attacks = (
            ("timestamp", "R2_TIMESTAMP_PROVENANCE_V1.json",
             lambda value: value.__setitem__(
                 "prohibited_claim", "timestamps prove external chronology")),
            ("supply", "SUPPLY_CHAIN_AND_SCOPE_GAPS_V1.json",
             lambda value: value.__setitem__("verdict", "PASS_PROMOTABLE")),
            ("report", "ZCE_R3_PREPUBLICATION_REPORT.md", None),
        )
        for label, name, mutate in r3_attacks:
            with self.subTest(r3_attack=label), \
                    tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "r3"
                r4 = root / "r4"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                path = r3 / name
                if mutate is None:
                    path.write_text("attacker replacement report\n", encoding="utf-8")
                else:
                    value = json.loads(path.read_text(encoding="utf-8"))
                    mutate(value)
                    path.write_text(
                        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                write_closed_sums(r3)
                result = self.run_replay(
                    r3, r4, root / "work", repin_r4=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("R3_MANIFEST_PIN", result.stderr)

    def test_replay_pack_captures_head_and_uses_shared_stdlib_executor(self):
        pack = verifier.strict_json_file(
            R4 / "R4_CONTRADICTION_REPLAY_PACK_V1.json")
        commands = pack["replay_commands"]
        self.assertEqual(len(commands), 14)
        first = commands[0]
        joined = "\n".join(commands)
        self.assertIn("/pulls/10 --jq '.head.sha'", first)
        self.assertIn("readonly ZCE_EXPECTED_HEAD", first)
        self.assertIn("*[!0-9a-f]*", first)
        self.assertIn("GIT_CONFIG_GLOBAL=/dev/null", first)
        self.assertIn("GIT_CONFIG_NOSYSTEM=1", first)
        self.assertIn("core.hooksPath=/dev/null", joined)
        self.assertIn("refs/remotes/origin/pr-10-head", commands[2])
        self.assertIn("--execute-repository-tests", joined)
        self.assertIn("--execute-opg", joined)
        self.assertIn("--require-cpython-3-11-16", joined)
        self.assertNotIn("pytest", joined)
        self.assertNotIn("PYTHONPATH", joined)
        self.assertNotIn("jq -S", joined)
        self.assertEqual(joined.count('.name==\"deterministic\"'), 1)
        self.assertEqual(joined.count('.name==\"r3-evidence\"'), 1)
        self.assertEqual(joined.count('.app.id==15368'), 2)
        self.assertIn("/pulls/10 --jq '.head.sha'", commands[-1])
        self.assertIn('= \"$ZCE_EXPECTED_HEAD\"', commands[-1])
        self.assertIn("git status --porcelain=v1 --untracked-files=all",
                      commands[-1])
        self.assertIn("git diff --check", commands[-1])
        self.assertEqual(pack["c26_acceptance"]["current_verdict"], "FAIL")
        self.assertEqual(
            pack["replay_execution_contract"]["review_semantics"],
            "EXACT_HEAD_REVIEWS_ARE_REPORTED_NOT_PROMOTED; "
            "DISTINCT_APPROVED_REVIEW_REMAINS_C26_REQUIRED",
        )

    def test_opg_executor_strictly_compares_replayed_receipt(self):
        class ExactTwenty(unittest.TestCase):
            pass

        for index in range(20):
            setattr(ExactTwenty, f"test_{index:02d}", lambda self: None)
        test_module = types.ModuleType("exact_twenty")
        test_module.ExactTwenty = ExactTwenty
        baseline = {
            "schema": "zoran.opg.falsification.v1.1",
            "cases_requested": 1_000_000,
            "cases_executed": 1_000_000,
            "violations": 0,
            "status": "PASS_1M_IMPLEMENTATION_GATE",
            "elapsed_seconds": 1.0,
        }
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            result_path = (
                root / "opposed_pair_gate/results/FALSIFICATION_1M.json"
            )
            result_path.parent.mkdir(parents=True)
            result_path.write_text(
                json.dumps(baseline, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            exact_campaign = types.SimpleNamespace(
                run=lambda count: dict(baseline, elapsed_seconds=2.0))
            with contextlib.redirect_stdout(io.StringIO()), \
                    contextlib.redirect_stderr(io.StringIO()), \
                    mock.patch.object(
                        verifier, "_load_module_from_path",
                        side_effect=[test_module, exact_campaign]):
                verifier.execute_opg_evidence(root)

            coerced_campaign = types.SimpleNamespace(
                run=lambda count: dict(baseline, violations=False,
                                       elapsed_seconds=2.0))
            with contextlib.redirect_stdout(io.StringIO()), \
                    contextlib.redirect_stderr(io.StringIO()), \
                    mock.patch.object(
                        verifier, "_load_module_from_path",
                        side_effect=[test_module, coerced_campaign]), \
                    self.assertRaisesRegex(
                        verifier.VerificationError,
                        "OPG_EXEC_CAMPAIGN_RECEIPT_MISMATCH"):
                verifier.execute_opg_evidence(root)

    def test_exact_python_runtime_guard_is_type_and_patch_strict(self):
        good_implementation = types.SimpleNamespace(name="cpython")
        with mock.patch.object(verifier.sys, "implementation",
                               good_implementation), \
                mock.patch.object(verifier.sys, "version_info",
                                  (3, 11, 16, "final", 0)):
            verifier.require_exact_python_runtime()
        bad_cases = [
            (types.SimpleNamespace(name="pypy"), (3, 11, 16, "final", 0)),
            (good_implementation, (3, 11, 15, "final", 0)),
            (good_implementation, (3, 12, 13, "final", 0)),
        ]
        for implementation, version in bad_cases:
            with self.subTest(implementation=implementation.name,
                              version=version[:3]), \
                    mock.patch.object(verifier.sys, "implementation",
                                      implementation), \
                    mock.patch.object(verifier.sys, "version_info", version), \
                    self.assertRaisesRegex(
                        verifier.VerificationError,
                        "PYTHON_RUNTIME_NOT_CPYTHON_3_11_16"):
                verifier.require_exact_python_runtime()

        baseline_r3 = {
            name: verifier.strict_json_file(R3 / name)
            for name in verifier.R3_CONTRACTS
        }
        supply_cases = (
            (("r2_local_evidence", "git_commit_signed"), 0),
            (("master_r2_1_repository_index", "records"), 939.0),
            (("verdict",), 0),
        )
        for path_parts, replacement in supply_cases:
            with self.subTest(supply_type_path="/".join(path_parts)):
                parsed = json.loads(json.dumps(baseline_r3, ensure_ascii=False))
                target = parsed["SUPPLY_CHAIN_AND_SCOPE_GAPS_V1.json"]
                for part in path_parts[:-1]:
                    target = target[part]
                target[path_parts[-1]] = replacement
                with self.assertRaisesRegex(
                        verifier.VerificationError,
                        "SUPPLY_CHAIN_GAP_CONTRACT"):
                    verifier.validate_r3_receipts(parsed)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            r3 = root / "r3"
            r4 = root / "r4"
            shutil.copytree(R3, r3)
            shutil.copytree(R4, r4)
            mission = r4 / "source" / "ZCE_R4_MISSION_CONTRACT.json"
            mission.write_bytes(mission.read_bytes() + b"\n")
            write_closed_sums(r4)
            result = self.run_replay(r3, r4, root / "work")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("R4_MANIFEST_PIN", result.stderr)

    def test_c26_admin_policy_weakening_is_rejected(self):
        baseline_path = R4 / "C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json"
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))

        def leaves(value, path=()):
            if isinstance(value, dict):
                for key in sorted(value):
                    yield from leaves(value[key], path + (key,))
            elif isinstance(value, list):
                if not value:
                    yield path, value
                else:
                    for index, item in enumerate(value):
                        yield from leaves(item, path + (index,))
            else:
                yield path, value

        def substitute(value):
            if isinstance(value, bool):
                return not value
            if isinstance(value, int):
                return value + 1
            if isinstance(value, str):
                return value + "__MUTATED__"
            if isinstance(value, list):
                return ["MUTATED_EMPTY_LIST"]
            return "MUTATED_NULL"

        cases = list(leaves(baseline))
        self.assertGreaterEqual(len(cases), 68)
        for path_parts, original in cases:
            label = "/".join(str(part) for part in path_parts)
            with self.subTest(path=label), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                r3 = root / "r3"
                r4 = root / "r4"
                shutil.copytree(R3, r3)
                shutil.copytree(R4, r4)
                path = (
                    r4 / "C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json"
                )
                value = json.loads(json.dumps(baseline, ensure_ascii=False))
                target = value
                for part in path_parts[:-1]:
                    target = target[part]
                target[path_parts[-1]] = substitute(original)
                path.write_text(
                    json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                c31_path = r4 / "C31_LEDGER_PIN_AND_DERIVATION_V2.json"
                c31 = json.loads(c31_path.read_text(encoding="utf-8"))
                c31["external_promotion_blockers"][0]["evidence_sha256"] = (
                    verifier.sha256_file(path)
                )
                c31_path.write_text(
                    json.dumps(c31, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                write_closed_sums(r4)
                if path_parts[0] == "schema":
                    result = self.run_replay(
                        r3, r4, root / "work", repin_r4=True)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("JSON_SCHEMA_MISMATCH", result.stderr)
                elif path_parts[0] == "mission_contract_sha256":
                    parsed = {
                        name: verifier.strict_json_file(R4 / name)
                        for name in verifier.R4_CONTRACTS
                    }
                    parsed[path.name] = value
                    with self.assertRaisesRegex(
                            verifier.VerificationError,
                            "R4_MISSION_RECEIPT_LINK"):
                        verifier.validate_mission_contract(R4, parsed)
                else:
                    with self.assertRaisesRegex(
                            verifier.VerificationError, "C26_"):
                        verifier.validate_c26({path.name: value})

        typed_cases = [
            (path_parts, original)
            for path_parts, original in cases
            if type(original) in (bool, int)
        ]
        self.assertGreaterEqual(len(typed_cases), 20)
        for path_parts, original in typed_cases:
            label = "/".join(str(part) for part in path_parts)
            with self.subTest(type_substitution=label):
                value = json.loads(json.dumps(baseline, ensure_ascii=False))
                target = value
                for part in path_parts[:-1]:
                    target = target[part]
                replacement = int(original) if type(original) is bool \
                    else float(original)
                target[path_parts[-1]] = replacement
                with self.assertRaisesRegex(
                        verifier.VerificationError, "C26_"):
                    verifier.validate_c26({baseline_path.name: value})

    def test_workflow_runtime_labels_are_exact_and_no_network_installer(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertNotIn("ubuntu-latest", workflow)
        self.assertNotIn('python-version: "3.11"', workflow)
        self.assertNotIn("pip install", workflow)
        self.assertEqual(workflow.count("runs-on: ubuntu-24.04"), 2)
        self.assertEqual(workflow.count('python-version: "3.11.16"'), 2)
        self.assertIn("expected exactly %d repository tests", workflow)
        self.assertIn("result.skipped", workflow)
        self.assertIn("result.expectedFailures", workflow)
        self.assertIn("result.unexpectedSuccesses", workflow)
        self.assertEqual(
            workflow.count(
                "PASS:91:0-skipped:0-expected-failures:0-unexpected-successes"
            ),
            2,
        )
        self.assertIn('test ! -e "$output"', workflow)
        self.assertIn("def closed_files(root):", workflow)
        self.assertNotIn("assert got_cmp", workflow)


if __name__ == "__main__":
    unittest.main(verbosity=2)
