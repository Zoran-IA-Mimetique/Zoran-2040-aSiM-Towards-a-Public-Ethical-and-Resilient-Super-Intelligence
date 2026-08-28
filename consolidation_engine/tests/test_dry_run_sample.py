"""Dry-run complet sur l'échantillon gelé : classifications attendues,
déterminisme bit à bit, rollback avant patch, guards, PACK_REQUEST."""

import json
import os
import shutil
import tempfile
import unittest

from zce import engine, util

BASE = os.path.join(os.path.dirname(__file__), "..")
SAMPLE = os.path.join(BASE, "sample")
NOW = "2026-08-28T12:00:00Z"

EXPECTED_LABELS = {
    "components/nl_k3_boundary_v1/boundary.py": "KEEP",
    "components/nl_k3_boundary_v1/test_boundary.py": "SUPPORT",
    "components/k3_frame_algebra_v1_1/algebra.py": "WIRE",
    "lib/zoran-core-runtime.ts": "WIRE",
    "components/zoran_chat_runtime_v1/runtime.py": "CORRECT",
    "docs/notes.md": "SUPPORT",
    "docs/notes_copy.md": "DUPLICATE",
    "archive/old_report.md": "ARCHIVE",
    "unknown/tampered.py": "QUARANTINE",
    "components/ghost_component/ghost.py": "QUARANTINE",
}


def run(out_dir):
    return engine.run_dry_run(
        root=os.path.join(SAMPLE, "frozen_tree"),
        manifest_path=os.path.join(SAMPLE, "inputs", "manifest.json"),
        graph_path=os.path.join(SAMPLE, "inputs", "relation_graph.json"),
        ledger_path=os.path.join(SAMPLE, "inputs", "gap_ledger.json"),
        out_dir=out_dir, now=NOW,
        schemas_dir=os.path.join(BASE, "schemas"))


class TestDryRunSample(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="zce_test_")
        cls.out = os.path.join(cls.tmp, "run1")
        cls.summary = run(cls.out)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _load(self, name):
        return util.load_json(os.path.join(self.out, name))

    def test_all_seven_labels_expected(self):
        decisions = self._load("ZCE_DECISIONS_V1.json")["body"]["decisions"]
        got = {d["path"]: d["label"] for d in decisions}
        self.assertEqual(got, EXPECTED_LABELS)
        for d in decisions:
            self.assertTrue(d["rule_id"] and d["cause"], d)

    def test_coherence_numbers_local_frame(self):
        measure = self._load("ZCE_COHERENCE_MEASURE_V1.json")["body"]
        local_before = measure["before"]["frames"]["local"]
        # 4 objets sans intervention / 10 ; 3 relations résolues / 4 → 30,00.
        self.assertEqual(local_before["counts"]["mission_aligned"], 4)
        self.assertEqual(local_before["counts"]["mission_applicable"], 10)
        self.assertEqual(local_before["counts"]["relations_coherent"], 3)
        self.assertEqual(local_before["counts"]["relations_applicable"], 4)
        self.assertAlmostEqual(local_before["s"], 30.0)
        # Projection v1.0.1 : +2 cibles patchées (adaptateur, doublon) ;
        # algèbre K3 bloquée (protégée) ET runtime bloqué (reçu Amygdale→K3
        # manquant) ; 2 quarantaines maintenues → 60,00.
        local_after = measure["after"]["frames"]["local"]
        self.assertAlmostEqual(local_after["s"], 60.0)
        self.assertAlmostEqual(measure["overall_delta_s"], 30.0)
        self.assertAlmostEqual(measure["before"]["overall_point"], 30.0)
        self.assertFalse(measure["runtime_promotion"])

    def test_protected_k3_target_blocked_and_no_apply(self):
        plan = self._load("ZCE_PATCH_PLAN_V1.json")["body"]
        blocked_paths = {b["path"]: b["blocked_by"] for b in plan["blocked"]}
        self.assertIn("components/k3_frame_algebra_v1_1/algebra.py", blocked_paths)
        self.assertIn("GUARD_PROTECTED_COMPONENTS",
                      blocked_paths["components/k3_frame_algebra_v1_1/algebra.py"])
        # v1.0.1 : le runtime porte GAP-005 (MISSING_GUARD sans reçu) → bloqué.
        self.assertIn("components/zoran_chat_runtime_v1/runtime.py", blocked_paths)
        self.assertIn("GUARD_AMYGDALA_K3_RECEIPT",
                      blocked_paths["components/zoran_chat_runtime_v1/runtime.py"])
        self.assertEqual(len(plan["patches"]), 2)
        for p in plan["patches"]:
            self.assertEqual(p["status"], "PROPOSED_DRY_RUN")
            self.assertFalse(p["applied"])
            self.assertTrue(p["rollback_id"])
            self.assertTrue(p["reference_sha256"])

    def test_rollback_sealed_before_patch_plan(self):
        journal_path = os.path.join(self.out, "ZCE_JOURNAL_V1.jsonl")
        with open(journal_path, "r", encoding="utf-8") as f:
            entries = [json.loads(line) for line in f if line.strip()]
        seq = {e["event"]: e["seq"] for e in entries}
        self.assertLess(seq["ROLLBACK_PLAN_SEALED"], seq["PATCH_PLAN_PROPOSED"])
        seqs = [e["seq"] for e in entries]
        self.assertEqual(seqs, sorted(set(seqs)))

    def test_pack_request_for_missing_brick(self):
        requests = self._load("ZCE_PACK_REQUESTS_V1.json")["body"]["requests"]
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["brick"], "components/gm4_verbalizer_v1")
        self.assertEqual(requests[0]["status"], "OPEN")

    def test_certificate_verdict_is_derived_not_hardcoded(self):
        # v1.0.1 : cadre local FAIL (30,00) → PASS_DRY_RUN interdit.
        cert = self._load("ZCE_CONTROL_CERTIFICATE_V1.json")
        self.assertEqual(cert["body"]["verdict"], "FAIL_DRY_RUN")
        self.assertEqual(cert["body"]["k3_verdict"], "FAIL")
        self.assertEqual(cert["k3_verdict"], "FAIL")
        basis = cert["body"]["verdict_basis"]
        self.assertEqual(basis["min_frame"], "local")
        self.assertIn("local", basis["failing_frames"])
        # Aucune sortie stampée ne porte un PASS non mesuré.
        for name in engine.OUTPUT_FILES:
            self.assertEqual(self._load(name)["k3_verdict"], "FAIL")

    def test_certificate_hashes_every_output(self):
        cert = self._load("ZCE_CONTROL_CERTIFICATE_V1.json")["body"]
        self.assertEqual(cert["verdict"], "FAIL_DRY_RUN")
        for name in engine.OUTPUT_FILES + ["ZCE_JOURNAL_V1.jsonl"]:
            claimed = [c for c in cert["claims"]
                       if c["claim"].startswith("sorties hachées")][0]["receipt"]
            self.assertIn(name, claimed)
            path = os.path.join(self.out, name)
            with open(path, "rb") as f:
                self.assertEqual(util.sha256_bytes(f.read()), claimed[name])

    def test_frozen_tree_never_modified(self):
        # Le SHA de chaque fichier de l'arbre gelé est inchangé après le run.
        manifest = util.load_json(os.path.join(SAMPLE, "inputs", "manifest.json"))
        for entry in manifest["objects"]:
            path = os.path.join(SAMPLE, "frozen_tree", entry["path"])
            if entry["path"].startswith(("unknown/", "components/ghost_component/")):
                continue
            self.assertEqual(util.sha256_file(path), entry["content_sha256"],
                             "arbre gelé modifié: %s" % entry["path"])

    def test_bitwise_determinism_on_replay(self):
        out2 = os.path.join(self.tmp, "run2")
        run(out2)
        for name in engine.OUTPUT_FILES + ["ZCE_JOURNAL_V1.jsonl",
                                           "ZCE_CONTROL_CERTIFICATE_V1.json"]:
            with open(os.path.join(self.out, name), "rb") as f1, \
                 open(os.path.join(out2, name), "rb") as f2:
                self.assertEqual(f1.read(), f2.read(), "sortie non déterministe: %s" % name)


class TestFailClosed(unittest.TestCase):
    def test_invalid_manifest_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = os.path.join(tmp, "bad_manifest.json")
            util.write_json(bad, {"schema": "zoran.zce.manifest.v1"})
            with self.assertRaises(engine.InputRejected):
                engine.load_and_validate_inputs(
                    bad,
                    os.path.join(SAMPLE, "inputs", "relation_graph.json"),
                    os.path.join(SAMPLE, "inputs", "gap_ledger.json"),
                    os.path.join(BASE, "schemas"))


if __name__ == "__main__":
    unittest.main()
