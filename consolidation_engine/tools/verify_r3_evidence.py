#!/usr/bin/env python3
"""Vérificateur déterministe fail-closed des preuves ZCE R3 et R4.

Aucune dépendance Python externe. Le script ferme les index de fichiers,
valide les contrats JSON connus, inspecte le ZIP OPG avant extraction, rejoue
les chaînes du ledger/K3 depuis un bundle Git complet, puis vérifie C26, C31
et les supersessions append-only. Il ne promeut ni ne déploie rien.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import zipfile


BUNDLE = "ZORAN_OPPOSED_PAIR_GATE_V1_1.zip"
ZIP_ROOT = "ZORAN_OPPOSED_PAIR_GATE_V1_1"
ZIP_MANIFEST = f"{ZIP_ROOT}/MANIFEST_SHA256.json"
OPG_ZIP_SHA256 = "267394d8a0620be5ace50b7c8f164d684d75d1e57e136b361b5bc7772976d520"
OPG_ZIP_SIZE = 25602
R3_SHA256SUMS_SHA256 = "4f87b2e42390181099b58cfc9a86e23e71a41c0999276d2a50c5c49ad59468a9"
R4_SHA256SUMS_SHA256 = "6982e5e24edf95466bb45afd0640b1d6ccfb602b24bf81278b9761c227a3272c"
OPG_ALLOWED_PATHS = (
    "LETTRE_MISSION_CHATGPT_WORK_OPG_V1.md",
    "OPG_INTEGRATION_K3_ZMOS.md",
    "OPG_V1_1_R3_REPAIR_RECEIPT.json",
    "README.md",
    "ZCE_ROBOT_ADAPTER_OPG_V1.md",
    "ZORAN_PLAN_CANONIQUE_MINIMAL_V1_2_PATCH.md",
    "opposed_pair_gate/__init__.py",
    "opposed_pair_gate/k3_adapter.py",
    "opposed_pair_gate/opposed_pair_gate.py",
    "opposed_pair_gate/results/FALSIFICATION_1M.json",
    "opposed_pair_gate/results/NAIVE_FORMULATIONS_FALSIFIED.json",
    "opposed_pair_gate/schemas/opposed_pair_preregistration.schema.json",
    "opposed_pair_gate/schemas/opposed_pair_receipt.schema.json",
    "opposed_pair_gate/schemas/opposed_pair_spec.schema.json",
    "opposed_pair_gate/schemas/s_measurement_receipt.schema.json",
    "opposed_pair_gate/tests/run_falsification_1m.py",
    "opposed_pair_gate/tests/test_gate.py",
)
MAX_ARCHIVE_BYTES = 16 * 1024 * 1024
MAX_MEMBER_BYTES = 8 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED = 32 * 1024 * 1024
MAX_MEMBERS = 64
MAX_COMPRESSION_RATIO = 250
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
SUM_RE = re.compile(r"^([0-9a-f]{64})  (\S+)$")

MISSION_SHA = "cc4c8aa7260b5ade8bfa970137cc9a73e58cd4b0c9024620e1458fbf9c423fb7"
MISSION_FILE_SHA256 = "9473b1814bfa20725882bd611c2dc0d39bc2d0a7c4bc7208af85602b936f9c4a"
REPOSITORY = (
    "Zoran-IA-Mimetique/"
    "Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence"
)
PULL_REQUEST = 10
BRANCH = "claude/zoran-consolidation-engine-qj175v"
BASE_SHA = "cdf9039777b4f71f62153a06d96ecf949ed94cc5"
BASELINE_HEAD = "8d7d027a35d542576f6f0186b3e78f5e4f5f026b"
BASELINE_RUN_ID = 33247790517
R2_BUNDLE_SHA = "efabe41e40d0c4fa650f216778bc50726999ae657a78f87f6d9b65217b118777"
R2_COMMIT = "9808ae11d2f7f9ab3c8f9f435620f67c6bcdb6b6"
R2_TREE = "28301c9dde19ea6456cdfff0259ad4f71214415e"
R2_LEDGER_SHA = "cffee20b5609d9a042d3e42ffe2e031337555e20dc3954dc991c0a54ae757430"
R2_AUDIT_SHA = "39b0bab524eddb7118e70cad8ff551c50d8c3d89f20bda1793884fb8418ede95"
R2_LEDGER_HEAD = "99c61c6627e5da042d9bbbf2fba742a0c3b5a6281962825cea295112d11b0982"
R2_AUDIT_HEAD = "3aa65f17affe2cb3c5b704945dd9f30d8d8adb1957933d503653b29520974612"
R2_LEDGER_REPO_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/governance/dette_coh.jsonl"
R2_AUDIT_REPO_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/governance/k3_audit.jsonl"
R2_PRE_REPO_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/governance/ZCE_PRE_RECEIPT_R2.json"
R2_POST_REPO_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/governance/ZCE_POST_RECEIPT_R2.json"
R2_TERMINAL_RECEIPT_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/ZCE_PARTIAL_R2_TERMINAL_RECEIPT.json"
R2_TERMINAL_REPORT_PATH = "ZORAN_ZCE_PARTIAL_ROBOT_R2/ZCE_PARTIAL_R2_TERMINAL_REPORT.md"

R4_PINNED_ROOT_SHA256 = {
    "C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json":
        "6d89c0fe3c480a9b780a936387dfd092c8a0f7864c13b653a8f1668806fecaf7",
    "C31_AUTHORITY_PACK_DEBT_RELATION_V1.json":
        "c0c3ddb86f0e02252fdef05d4732e9f32015ac7c4450a956da9e6592d17991e3",
    "C31_FAIL_CLOSED_CRITICALITY_POLICY_V1.json":
        "89268da245f74b04d751fcdeeb2ae4312059340185f83e241359da271b120ef5",
    "C31_LEDGER_PIN_AND_DERIVATION_V2.json":
        "500fb1cfb8d1823de11dfb5cd404cc291b8db52be9e829cbacc626b7ecb5a2f5",
    "GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json":
        "4c3b1194b1db310e1b29564754f6ceeee2b4e6b538e97936e15f0bdae04ddeba",
    "R2_EVIDENCE_SUPERSESSION_V2.json":
        "1a5fb39d127c7db36b53ea5c9ae9e8c06874b42f87cc3ae3d31188c6c16762d5",
    "R4_CONTRADICTION_REPLAY_PACK_V1.json":
        "7b66e780e691bbe78ede71bbcd9079742cab78b4d77c8f8afaf868761f1c4f15",
}

EXPECTED_DEBT_KEYS = [
    "9767b83cd21d55aa8301a0a59bb8c706dbb4498bf61debe55bc1e71e52f9a2d0",
    "84f6527b65c052ba64edcd1a73610d37e3b7f11ebef29b6c6cf414b91191107f",
    "8344950e6070d7345936da9bbdf67d1593b169b1ad2d65096a0d24130086c85d",
    "a99a431471a300c36cd18a70aafef24e78b6be9bbb851890d3b86e6d274332db",
    "a65e129979aeaed2bf9c516e4e38ce7e7154f97191fa06743b78b13c566096cb",
    "8e98e389308b86de9b024b43c4107f4617dd65274bea4839139e717a467ef6ab",
    "e8696a8860dbbe5cdab478b3d162faae09144296c1efb75c0d4b3fc80a15b2a2",
    "7a39ba8c9e0676388857a6b821d9e54e2449ad8d5f9a26e406f6a64a543bb916",
    "7c179390262bd4618ba6afd22e79f35e24872b0be43ca754a811640a495fb36e",
]
EXPECTED_SCOPES = [
    "frame:upper", "frame:science", "frame:privacy", "frame:law",
    "frame:energy", "frame:climate", "frame:planetary",
    "frame:downstream_consumers", "frame:upper:authority_signature",
]
EXPECTED_EVENT_HASHES = [
    "2f3e70744f78c8e8998e73c2af635852727881089d699a34139a2524484ee80c",
    "5df1308c4b0922b2e40baf691d052a842a515fa770b3003e468a0e0a8399ffcd",
    "600a4852a22c6aaaa62246eb69962c3cd22935519123fc582e5158d939c3ae31",
    "3267ca32d7b3ab73f0328824fe15322f4eba021f2fa87fac99a483c8151b0976",
    "02e68c592fa4b06476bf857a4a6e832f1829f3cfeadf53e587464bd43c2ff9d0",
    "10bb780f1db13498ee9b4d2e3cb8aabe8d521615a95fe7be0cd210abbf10e9ac",
    "bd12724c0cd617292d82f13d28ebf2aa875aae5d2b0211fdd78db85a37fc852a",
    "e6c5652c99c4109d66fdcd2930d636fcd1b7aa7c8c02809ee0ae5e87ccb6ac26",
    R2_LEDGER_HEAD,
]

R3_CONTRACTS = {
    "C31_CRITICAL_DEBT_DERIVATION_V1.json": (
        "zoran.zce.c31-critical-debt-derivation.v1",
        {"schema", "object_id", "mission_contract_sha256", "ledger",
         "external_critical_blockers", "derivation",
         "derived_open_critical_debt", "c31_verdict", "closure_rule"}),
    "GIT_REMOTE_PROMOTION_EVIDENCE_V1.json": (
        "zoran.zce.git-remote-promotion-evidence.v1",
        {"schema", "object_id", "product_target", "public_evidence_target",
         "c26_verdict"}),
    "MASTER_R2_1_REAUDIT_RECEIPT_R3.json": (
        "zoran.zce.master-r2.1-reaudit.v1",
        {"schema", "object_id", "mission_contract_sha256", "source",
         "integrity", "tests", "successor_policy", "bounded_verdict",
         "global_zoran"}),
    "OPG_V1_1_R3_REPAIR_RECEIPT.json": (
        "zoran.opg.r3-repair-receipt.v1",
        {"schema", "object_id", "mission_contract_sha256", "input",
         "falsified_cases", "repairs", "tests", "bounded_verdict",
         "runtime_integration", "external_causal_validation",
         "productive_k3_amygdala_authorities", "global_zoran_promotion"}),
    "PACK_REQUEST_K3_AMYGDALA_PRODUCTIVE_AUTHORITIES_V1.json": (
        "zoran.pack-request.k3-amygdala-productive-authorities.v1",
        {"schema", "object_id", "status", "observed",
         "required_human_inputs", "robot_must_not", "closure_gate"}),
    "R2_EVIDENCE_SUPERSESSION_V1.json": (
        "zoran.zce.r2-evidence-supersession.v1",
        {"schema", "object_id", "policy", "chain", "blocked_controls",
         "interpretation"}),
    "R2_TIMESTAMP_PROVENANCE_V1.json": (
        "zoran.zce.timestamp-provenance.v1",
        {"schema", "object_id", "fixed_epoch", "fixed_epoch_semantics",
         "is_observed_wall_clock", "is_external_time_anchor",
         "prohibited_claim", "observed_time_status", "c02_note"}),
    "SUPPLY_CHAIN_AND_SCOPE_GAPS_V1.json": (
        "zoran.zce.supply-chain-scope-gaps.v1",
        {"schema", "object_id", "r2_local_evidence",
         "master_r2_1_repository_index", "required_for_promotion",
         "candidate_upstream", "verdict"}),
}

R4_CONTRACTS = {
    "C31_LEDGER_PIN_AND_DERIVATION_V2.json": (
        "zoran.zce.c31-critical-debt-derivation.v2",
        {"schema", "object_id", "mission_contract_sha256", "supersedes",
         "source_bundle", "ledger", "k3_audit", "criticality_policy",
         "external_promotion_blockers", "remediation_aliases", "derivation",
         "derived_open_critical_debt", "zero_open_critical_debt_proven",
         "c31_verdict", "closure_rule", "global_zoran"}),
    "C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json": (
        "zoran.zce.c26-protected-promotion-authority-pack-request.v1",
        {"schema", "object_id", "type", "mission_contract_sha256",
         "observation", "required_admin_action", "required_reviewer_action",
         "promotion_guards", "robot_authority", "closure_evidence_required",
         "status", "c26_verdict", "global_zoran"}),
    "C31_FAIL_CLOSED_CRITICALITY_POLICY_V1.json": (
        "zoran.zce.c31-fail-closed-criticality-policy.v1",
        {"schema", "object_id", "mission_contract_sha256", "scope", "rules",
         "prohibited_inferences", "promotion_effect", "global_zoran"}),
    "C31_AUTHORITY_PACK_DEBT_RELATION_V1.json": (
        "zoran.zce.c31-authority-pack-debt-relation.v1",
        {"schema", "object_id", "mission_contract_sha256", "relation", "from",
         "to", "k3_witness", "matching_rule",
         "identity_equivalence", "contributes_additional_debt_count",
         "possible_additional_count_range", "bounded_relation_verdict",
         "global_zoran"}),
    "R2_EVIDENCE_SUPERSESSION_V2.json": (
        "zoran.zce.r2-evidence-supersession.v2",
        {"schema", "object_id", "mission_contract_sha256", "policy",
         "supersedes", "source_bundle", "chain", "digest_semantics",
         "blocked_controls", "interpretation", "global_zoran"}),
    "GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json": (
        "zoran.zce.git-remote-promotion-evidence-supersession.v2",
        {"schema", "object_id", "mission_contract_sha256", "policy",
         "supersedes", "scope", "repository", "pull_request", "branch",
         "base_sha", "observed_head", "observed_run", "review_state",
         "r4_head_binding", "known_external_blockers", "c26_verdict",
         "global_zoran"}),
    "R4_CONTRADICTION_REPLAY_PACK_V1.json": (
        "zoran.zce.r4-contradiction-replay-pack.v1",
        {"schema", "object_id", "mission_contract_sha256", "repository",
         "pull_request", "branch", "base_sha", "r4_parent_head",
         "exact_r4_head_resolution", "proof_index", "replay_commands",
         "c31_acceptance", "c26_acceptance", "non_measured_limits",
         "global_zoran"}),
}


class VerificationError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_bytes(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":"), allow_nan=False).encode("utf-8")


def canonical_sha256(value: object) -> str:
    return sha256_bytes(canonical_bytes(value))


def _pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, f"JSON_DUPLICATE_KEY:{key}")
        result[key] = value
    return result


def _constant(value: str):
    raise VerificationError(f"JSON_NON_FINITE_NUMBER:{value}")


def _finite_float(value: str):
    number = float(value)
    require(math.isfinite(number), f"JSON_NON_FINITE_NUMBER:{value}")
    return number


def strict_json_bytes(data: bytes, label: str):
    try:
        return json.loads(data.decode("utf-8"), object_pairs_hook=_pairs,
                          parse_constant=_constant, parse_float=_finite_float)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise VerificationError(f"JSON_INVALID:{label}:{exc}") from exc


def strict_json_file(path: Path):
    return strict_json_bytes(path.read_bytes(), str(path))


def strict_typed_equal(actual, expected) -> bool:
    """JSON equality that never equates bool/int/float by Python coercion."""
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, dict):
        return (actual.keys() == expected.keys() and
                all(strict_typed_equal(actual[key], expected[key])
                    for key in expected))
    if isinstance(expected, list):
        return (len(actual) == len(expected) and
                all(strict_typed_equal(left, right)
                    for left, right in zip(actual, expected)))
    return actual == expected


def validate_mission_contract(r4_dir: Path, parsed: dict) -> None:
    path = r4_dir / "source/ZCE_R4_MISSION_CONTRACT.json"
    require(sha256_file(path) == MISSION_FILE_SHA256, "R4_MISSION_FILE_BYTES")
    mission = strict_json_file(path)
    require(set(mission) == {"schema", "source_text", "source_sha256",
            "objective", "requirements", "contract_sha256", "execution_plan"},
            "R4_MISSION_CONTRACT_KEYS")
    source_text = mission["source_text"]
    require(mission["schema"] == "zoran.mission-contract.v1" and
            isinstance(source_text, str) and source_text.strip() and
            sha256_bytes(source_text.encode("utf-8")) == mission["source_sha256"],
            "R4_MISSION_SOURCE")
    objective = mission["objective"]
    objective_material = {"id": "objective", "value": objective["value"],
                          "source_quote": objective["source_quote"]}
    require(set(objective) == {"id", "value", "source_quote", "sha256"} and
            objective["id"] == "objective" and
            objective["source_quote"] in source_text and
            canonical_sha256(objective_material) == objective["sha256"],
            "R4_MISSION_OBJECTIVE")
    requirements = mission["requirements"]
    require(isinstance(requirements, list) and len(requirements) == 8,
            "R4_MISSION_REQUIREMENT_COUNT")
    ids = []
    for index, item in enumerate(requirements):
        require(set(item) == {"id", "value", "source_quote", "sha256"} and
                isinstance(item["source_quote"], str) and item["source_quote"] and
                item["source_quote"] in source_text and
                canonical_sha256({"id": item["id"], "value": item["value"],
                                  "source_quote": item["source_quote"]}) ==
                item["sha256"], f"R4_MISSION_REQUIREMENT:{index + 1}")
        ids.append(item["id"])
    require(len(set(ids)) == len(ids), "R4_MISSION_REQUIREMENT_IDS")
    execution = {
        "objective": objective["value"],
        "requirements": [{"id": item["id"], "value": item["value"]}
                         for item in requirements],
    }
    require(mission["execution_plan"] == execution, "R4_MISSION_EXECUTION_PLAN")
    contract_material = {
        "source_sha256": mission["source_sha256"],
        "objective": objective["value"],
        "requirements": execution["requirements"],
    }
    require(canonical_sha256(contract_material) ==
            mission["contract_sha256"] == MISSION_SHA,
            "R4_MISSION_CONTRACT_HASH")
    require(all(value["mission_contract_sha256"] == MISSION_SHA
                for value in parsed.values()), "R4_MISSION_RECEIPT_LINK")


def safe_relative(name: str) -> PurePosixPath:
    require(isinstance(name, str), "BAD_RELATIVE_NAME_TYPE")
    require("\\" not in name and "\x00" not in name,
            f"BAD_RELATIVE_NAME:{name!r}")
    path = PurePosixPath(name)
    require(not path.is_absolute() and path.as_posix() == name,
            f"NON_CANONICAL_RELATIVE_PATH:{name}")
    require(path.parts and all(part not in ("", ".", "..") for part in path.parts),
            f"RELATIVE_PATH_TRAVERSAL:{name}")
    return path


def confined_file(root: Path, name: str, label: str) -> Path:
    """Resolve a receipt-controlled path strictly below its evidence root."""
    relative = safe_relative(name)
    resolved_root = root.resolve()
    path = (root / Path(*relative.parts)).resolve()
    require(path.is_relative_to(resolved_root), f"{label}:ESCAPE")
    require(path.is_file() and not path.is_symlink(), f"{label}:MISSING")
    return path


def reject_symlink_components(path: Path, label: str) -> None:
    """Reject a symlink at the root or in any existing parent component."""
    absolute = path.absolute()
    for component in [*reversed(absolute.parents), absolute]:
        require(not component.is_symlink(), f"{label}:{component}")


def paths_overlap(first: Path, second: Path) -> bool:
    first = first.resolve()
    second = second.resolve()
    return (first == second or first.is_relative_to(second) or
            second.is_relative_to(first))


def validate_closed_sums(root: Path) -> set[str]:
    require(root.is_dir() and not root.is_symlink(), "EVIDENCE_ROOT_INVALID")
    sums = root / "SHA256SUMS"
    require(sums.is_file() and not sums.is_symlink(), "SHA256SUMS_MISSING")
    lines = sums.read_text(encoding="utf-8").splitlines()
    require(lines, "SHA256SUMS_EMPTY")
    listed = {}
    ordered_names = []
    for number, line in enumerate(lines, 1):
        match = SUM_RE.fullmatch(line)
        require(match is not None, f"SHA256SUMS_BAD_LINE:{number}")
        expected, name = match.groups()
        safe_relative(name)
        require(name != "SHA256SUMS", "SHA256SUMS_SELF_REFERENCE")
        require(name not in listed, f"SHA256SUMS_DUPLICATE:{name}")
        listed[name] = expected
        ordered_names.append(name)
    require(ordered_names == sorted(ordered_names), "SHA256SUMS_NOT_SORTED")
    actual = set()
    for path in root.rglob("*"):
        relative = path.relative_to(root).as_posix()
        require(not path.is_symlink(), f"EVIDENCE_SYMLINK:{relative}")
        if path.is_dir():
            continue
        require(path.is_file(), f"EVIDENCE_NON_FILE:{relative}")
        if relative != "SHA256SUMS":
            actual.add(relative)
    require(actual == set(listed),
            f"SHA256SUMS_NOT_CLOSED:listed={sorted(listed)}:actual={sorted(actual)}")
    for name, expected in listed.items():
        path = root / Path(*safe_relative(name).parts)
        require(sha256_file(path) == expected, f"SHA256_DIVERGENT:{name}")
    return actual


def validate_contract_set(root: Path, names: set[str], contracts) -> dict:
    json_names = {name for name in names if "/" not in name and name.endswith(".json")}
    require(json_names == set(contracts),
            f"JSON_CONTRACT_SET_MISMATCH:got={sorted(json_names)}")
    parsed = {}
    for name, (schema, keys) in contracts.items():
        value = strict_json_file(root / name)
        require(isinstance(value, dict), f"JSON_NOT_OBJECT:{name}")
        require(value.get("schema") == schema, f"JSON_SCHEMA_MISMATCH:{name}")
        require(set(value) == keys, f"JSON_TOP_LEVEL_CONTRACT:{name}")
        parsed[name] = value
    return parsed


def validate_pinned_r4_receipts(r4_dir: Path) -> None:
    """Prevent self-consistent rewrites of the static R4 governance receipts."""
    for name, expected in R4_PINNED_ROOT_SHA256.items():
        require(sha256_file(r4_dir / name) == expected,
                f"R4_PINNED_RECEIPT_BYTES:{name}")


def validate_r3_receipts(parsed: dict) -> None:
    opg = parsed["OPG_V1_1_R3_REPAIR_RECEIPT.json"]
    require(opg["tests"]["unit_and_adversarial"] ==
            {"passed": 20, "total": 20, "verdict": "PASS"},
            "OPG_20_TEST_RECEIPT")
    require(opg["tests"]["campaign"] ==
            {"passed": 1_000_000, "total": 1_000_000, "violations": 0,
             "verdict": "PASS_1M_IMPLEMENTATION_GATE"}, "OPG_1M_RECEIPT")
    require(opg["bounded_verdict"] == "PASS_CANDIDATE_IMPLEMENTATION_NON_PROMOTED",
            "OPG_BOUNDED_VERDICT")
    for key in ("runtime_integration", "external_causal_validation",
                "global_zoran_promotion"):
        require(opg[key] == "NON_MESURÉ", f"OPG_LIMIT_LOST:{key}")
    master = parsed["MASTER_R2_1_REAUDIT_RECEIPT_R3.json"]
    require(master["integrity"] == {"manifest_entries_passed": 15,
            "manifest_entries_total": 15, "verdict": "PASS"},
            "MASTER_INTEGRITY_RECEIPT")
    focused = master["tests"]["focused_exact_wheelhouse"]
    require((focused["passed"], focused["total"], focused["verdict"]) ==
            (62, 62, "PASS"), "MASTER_62_TESTS")
    require(master["tests"]["negative_campaign_a"] ==
            master["tests"]["negative_campaign_b"] and
            master["tests"]["a_b_byte_identical"] is True,
            "MASTER_AB_IDENTITY")
    require(master["global_zoran"] == "NON_MESURÉ", "MASTER_GLOBAL_LIMIT")
    legacy_c31 = parsed["C31_CRITICAL_DEBT_DERIVATION_V1.json"]
    require(legacy_c31["derived_open_critical_debt"] == 11 and
            legacy_c31["c31_verdict"] == "FAIL", "LEGACY_C31_IDENTITY")
    legacy_super = parsed["R2_EVIDENCE_SUPERSESSION_V1.json"]
    require([(item["passed"], item["total"]) for item in legacy_super["chain"]] ==
            [(19, 32), (26, 32), (30, 32)] and
            legacy_super["blocked_controls"] == ["C26", "C31"],
            "LEGACY_SUPERSESSION_IDENTITY")
    supply = parsed["SUPPLY_CHAIN_AND_SCOPE_GAPS_V1.json"]
    require(strict_typed_equal(supply, {
        "schema": "zoran.zce.supply-chain-scope-gaps.v1",
        "object_id": "ZCE-SUPPLY-CHAIN-SCOPE-GAPS-R3",
        "r2_local_evidence": {
            "run_manifest_sha256":
                "bcfe6c9a246785e9790dc4af7aa3d0105222d16064d35c406320ec8a96619e61",
            "control_certificate_sha256":
                "797a4b5c6ab8849f2c96f4212fad1bda7eca828fa030777de15569c94f26dd44",
            "git_commit_signed": False,
            "artifact_attestation": False,
            "sbom": False,
        },
        "master_r2_1_repository_index": {
            "records": 939,
            "index_file_sha256":
                "904f344cd76c58999c9cffddcea53ae645ffa1488681d6d8d477c7f56cfb0d6b",
            "index_sha256":
                "dfd5e20e859dea6b882d44d49faba7466a90550ead50abe89a68c1821f347775",
        },
        "required_for_promotion": [
            "SPDX_OR_CYCLONEDX_SBOM",
            "SIGNED_IN_TOTO_ATTESTATION_BOUND_TO_EXACT_HEAD_AND_ARTIFACT",
            "20_OBJECTS_TO_EVIDENCE_FILES_CROSSWALK",
        ],
        "candidate_upstream": {
            "action":
                "actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6",
            "status": "NOT_YET_EXECUTED",
        },
        "verdict": "EXPLICIT_GAP_PROMOTION_BLOCKED",
    }), "SUPPLY_CHAIN_GAP_CONTRACT")


def _zip_path(name: str) -> PurePosixPath:
    path = safe_relative(name)
    require(len(path.parts) >= 2 and path.parts[0] == ZIP_ROOT,
            f"ZIP_WRONG_ROOT:{name}")
    require(len(path.parts) <= 10 and len(name) <= 240, f"ZIP_NAME_BUDGET:{name}")
    return path


def validate_and_extract_zip(bundle: Path, workdir: Path) -> Path:
    require(bundle.is_file() and not bundle.is_symlink(), "OPG_ZIP_MISSING")
    require(bundle.stat().st_size == OPG_ZIP_SIZE and
            sha256_file(bundle) == OPG_ZIP_SHA256, "OPG_ZIP_BYTES")
    require(bundle.stat().st_size <= MAX_ARCHIVE_BYTES, "OPG_ZIP_TOO_LARGE")
    require(not workdir.exists() or not any(workdir.iterdir()), "WORKDIR_NOT_EMPTY")
    workdir.mkdir(parents=True, exist_ok=True)
    require(not workdir.is_symlink(), "WORKDIR_SYMLINK")
    resolved = workdir.resolve()
    try:
        archive = zipfile.ZipFile(bundle)
    except zipfile.BadZipFile as exc:
        raise VerificationError("OPG_BAD_ZIP") from exc
    require(archive.comment == b"", "OPG_ZIP_COMMENT")
    infos = archive.infolist()
    require(1 <= len(infos) <= MAX_MEMBERS, "OPG_ZIP_MEMBER_COUNT")
    names = [item.filename for item in infos]
    require(len(names) == len(set(names)), "OPG_ZIP_DUPLICATE_MEMBER")
    require(len({name.casefold() for name in names}) == len(names),
            "OPG_ZIP_CASE_COLLISION")
    total = 0
    for info in infos:
        _zip_path(info.filename)
        require(not info.is_dir(), f"OPG_ZIP_DIRECTORY:{info.filename}")
        mode = info.external_attr >> 16
        require(stat.S_IFMT(mode) in (0, stat.S_IFREG),
                f"OPG_ZIP_SPECIAL_OR_SYMLINK:{info.filename}")
        require(not (info.flag_bits & 0x1), f"OPG_ZIP_ENCRYPTED:{info.filename}")
        require(info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED),
                f"OPG_ZIP_COMPRESSION:{info.filename}")
        require(info.file_size <= MAX_MEMBER_BYTES,
                f"OPG_ZIP_MEMBER_TOO_LARGE:{info.filename}")
        ratio = info.file_size / max(1, info.compress_size)
        require(ratio <= MAX_COMPRESSION_RATIO,
                f"OPG_ZIP_RATIO_TOO_HIGH:{info.filename}")
        total += info.file_size
    require(total <= MAX_TOTAL_UNCOMPRESSED, "OPG_ZIP_BOMB_BUDGET")
    require(names.count(ZIP_MANIFEST) == 1, "OPG_MANIFEST_COUNT")
    require(archive.testzip() is None, "OPG_ZIP_CRC_FAILURE")
    manifest = strict_json_bytes(archive.read(ZIP_MANIFEST), ZIP_MANIFEST)
    require(isinstance(manifest, dict) and set(manifest) ==
            {"schema", "object_id", "files"}, "OPG_MANIFEST_CONTRACT")
    require(manifest["schema"] == "zoran.opg.manifest.v1.1" and
            manifest["object_id"] == "ZORAN-OPPOSED-PAIR-GATE-V1-1-R3",
            "OPG_MANIFEST_IDENTITY")
    entries = manifest["files"]
    require(isinstance(entries, list) and len(entries) == 17,
            "OPG_MANIFEST_EXPECTED_17")
    paths = []
    for entry in entries:
        require(isinstance(entry, dict) and set(entry) ==
                {"path", "sha256", "size_bytes"}, "OPG_MANIFEST_ENTRY_CONTRACT")
        relative = safe_relative(entry["path"])
        require(SHA_RE.fullmatch(entry["sha256"]) is not None and
                type(entry["size_bytes"]) is int and
                0 <= entry["size_bytes"] <= MAX_MEMBER_BYTES,
                f"OPG_MANIFEST_ENTRY_VALUE:{entry['path']}")
        paths.append(relative.as_posix())
    require(paths == list(OPG_ALLOWED_PATHS), "OPG_MANIFEST_EXACT_ALLOWLIST")
    expected_members = {ZIP_MANIFEST} | {f"{ZIP_ROOT}/{path}" for path in paths}
    require(set(names) == expected_members, "OPG_ZIP_MANIFEST_SET")
    for info in infos:
        relative = _zip_path(info.filename)
        destination = (workdir / Path(*relative.parts)).resolve()
        require(destination.is_relative_to(resolved), "OPG_ZIP_ESCAPE")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(info) as source, destination.open("xb") as target:
            shutil.copyfileobj(source, target, 65536)
    archive.close()
    root = workdir / ZIP_ROOT
    for entry in entries:
        path = root / Path(*PurePosixPath(entry["path"]).parts)
        require(path.is_file() and not path.is_symlink(), "OPG_FILE_MISSING")
        require(path.stat().st_size == entry["size_bytes"] and
                sha256_file(path) == entry["sha256"],
                f"OPG_FILE_DIVERGENT:{entry['path']}")
    return root


def validate_opg_tree(r3_dir: Path, root: Path) -> None:
    schemas = sorted((root / "opposed_pair_gate/schemas").glob("*.schema.json"))
    require(len(schemas) == 4, "OPG_EXPECTED_4_SCHEMAS")
    identifiers = set()
    for path in schemas:
        value = strict_json_file(path)
        identifier = value.get("$id") if isinstance(value, dict) else None
        require(value.get("$schema") == "https://json-schema.org/draft/2020-12/schema" and
                value.get("type") == "object" and
                value.get("additionalProperties") is False and
                isinstance(identifier, str) and identifier not in identifiers,
                f"OPG_SCHEMA_CONTRACT:{path.name}")
        identifiers.add(identifier)
        require(set(value.get("required", [])) <= set(value.get("properties", {})),
                f"OPG_SCHEMA_REQUIRED:{path.name}")
    campaign = strict_json_file(root / "opposed_pair_gate/results/FALSIFICATION_1M.json")
    require(campaign["schema"] == "zoran.opg.falsification.v1.1" and
            campaign["status"] == "PASS_1M_IMPLEMENTATION_GATE" and
            campaign["cases_requested"] == campaign["cases_executed"] == 1_000_000 and
            campaign["violations"] == 0 and campaign["first_violations"] == [] and
            len(campaign["counts"]) == 8 and
            set(campaign["counts"].values()) == {125_000}, "OPG_CAMPAIGN_RECEIPT")
    require((r3_dir / "OPG_V1_1_R3_REPAIR_RECEIPT.json").read_bytes() ==
            (root / "OPG_V1_1_R3_REPAIR_RECEIPT.json").read_bytes(),
            "OPG_RECEIPT_RELATION")


def validate_hash_chain(raw: bytes, label: str) -> tuple[list[dict], str | None]:
    require(raw.endswith(b"\n") and b"\r" not in raw, f"CHAIN_LINE_ENDINGS:{label}")
    entries = []
    previous = None
    for number, line in enumerate(raw.splitlines(), 1):
        require(line, f"CHAIN_BLANK_LINE:{label}:{number}")
        entry = strict_json_bytes(line, f"{label}:{number}")
        require(isinstance(entry, dict) and set(entry) >=
                {"sequence", "previous_hash", "event_hash"},
                f"CHAIN_ENTRY_CONTRACT:{label}:{number}")
        body = {key: value for key, value in entry.items() if key != "event_hash"}
        require(entry["sequence"] == number and entry["previous_hash"] == previous and
                canonical_sha256(body) == entry["event_hash"],
                f"CHAIN_HASH:{label}:{number}")
        previous = entry["event_hash"]
        entries.append(entry)
    require(entries, f"CHAIN_EMPTY:{label}")
    return entries, previous


def validate_debt_ledger(raw: bytes) -> dict:
    require(len(raw) == 5436 and sha256_bytes(raw) == R2_LEDGER_SHA,
            "R2_LEDGER_BYTES")
    entries, head = validate_hash_chain(raw, "R2_LEDGER")
    require(len(entries) == 9 and head == R2_LEDGER_HEAD, "R2_LEDGER_COUNT_HEAD")
    for index, entry in enumerate(entries):
        require(set(entry) == {"sequence", "previous_hash", "event", "event_hash"},
                f"R2_LEDGER_ENTRY_KEYS:{index + 1}")
        event = entry["event"]
        require(set(event) == {"amount", "context", "debt_key", "evidence_sha256",
                "monetary_value", "observed_at", "scope", "transaction_id",
                "type", "unit"}, f"R2_LEDGER_EVENT_KEYS:{index + 1}")
        require(event["type"] == "OPEN" and event["amount"] == 1 and
                event["unit"] == "UNWEIGHTED_COUNT" and
                event["monetary_value"] == "NON_MESURÉ" and
                event["transaction_id"] == "ZCE-PARTIAL-ROBOT-R2-FINAL-BUILD" and
                event["scope"] == EXPECTED_SCOPES[index] and
                event["debt_key"] == EXPECTED_DEBT_KEYS[index] and
                entry["event_hash"] == EXPECTED_EVENT_HASHES[index],
                f"R2_LEDGER_EVENT_IDENTITY:{index + 1}")
        require(canonical_sha256({"context": event["context"],
                                  "scope": event["scope"]}) == event["debt_key"],
                f"R2_LEDGER_DEBT_KEY_DERIVATION:{index + 1}")
    return {"entries": entries, "head": head}


def _run(command: list[str], cwd: Path) -> str:
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_OPTIONAL_LOCKS": "0",
    }
    try:
        result = subprocess.run(command, cwd=cwd, check=True, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                env=env)
    except subprocess.CalledProcessError as exc:
        raise VerificationError(f"COMMAND_FAILED:{command}:{exc.stderr.strip()}") from exc
    return result.stdout.strip()


def _git_bytes(repo: Path, spec: str) -> bytes:
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_OPTIONAL_LOCKS": "0",
    }
    try:
        result = subprocess.run(
            ["git", "-c", "core.hooksPath=/dev/null", "show", spec],
            cwd=repo, check=True, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, env=env)
    except subprocess.CalledProcessError as exc:
        raise VerificationError(f"GIT_SHOW_FAILED:{spec}") from exc
    return result.stdout


def validate_r2_bundle(r4_dir: Path, workdir: Path) -> dict:
    bundle = r4_dir / "source/ZCE_R2_GIT_EVIDENCE_9808ae1.bundle"
    require(bundle.stat().st_size == 56734 and sha256_file(bundle) == R2_BUNDLE_SHA,
            "R2_BUNDLE_BYTES")
    # `git bundle verify` exige un dépôt comme cwd. Utiliser un dépôt vierge dans
    # le workdir rend le rejeu indépendant de l'emplacement de evidence/r4.
    verify_repo = workdir / "bundle-verify-repo"
    require(not verify_repo.exists(), "R2_BUNDLE_VERIFY_WORKDIR_NOT_FRESH")
    verify_repo.mkdir(parents=True)
    _run(["git", "-c", "core.hooksPath=/dev/null", "-c",
          "init.templateDir=", "init", "--quiet"], verify_repo)
    _run(["git", "-c", "core.hooksPath=/dev/null", "bundle", "verify",
          str(bundle)], verify_repo)
    clone = workdir / "r2-bundle"
    require(not clone.exists(), "R2_BUNDLE_WORKDIR_NOT_FRESH")
    _run(["git", "-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=",
          "clone", "--quiet", "--branch", "main", "--single-branch",
          str(bundle), str(clone)], r4_dir)
    require(_run(["git", "-c", "core.hooksPath=/dev/null", "rev-parse",
                  "HEAD"], clone) == R2_COMMIT and
            _run(["git", "-c", "core.hooksPath=/dev/null", "rev-parse",
                  "HEAD^{tree}"], clone) == R2_TREE,
            "R2_BUNDLE_HEAD_TREE")
    paths = (R2_LEDGER_REPO_PATH, R2_AUDIT_REPO_PATH, R2_PRE_REPO_PATH,
             R2_POST_REPO_PATH, R2_TERMINAL_RECEIPT_PATH, R2_TERMINAL_REPORT_PATH)
    files = {path: _git_bytes(clone, f"HEAD:{path}") for path in paths}
    require(files[R2_LEDGER_REPO_PATH] ==
            (r4_dir / "source/R2_DETTE_COH_9808AE1.jsonl").read_bytes(),
            "R2_BUNDLE_LEDGER_RELATION")
    require(files[R2_AUDIT_REPO_PATH] ==
            (r4_dir / "source/R2_K3_AUDIT_9808AE1.jsonl").read_bytes(),
            "R2_BUNDLE_AUDIT_RELATION")
    ledger = validate_debt_ledger(files[R2_LEDGER_REPO_PATH])
    audit_raw = files[R2_AUDIT_REPO_PATH]
    require(len(audit_raw) == 36512 and sha256_bytes(audit_raw) == R2_AUDIT_SHA,
            "R2_AUDIT_BYTES")
    audits, audit_head = validate_hash_chain(audit_raw, "R2_K3_AUDIT")
    require(len(audits) == 2 and audit_head == R2_AUDIT_HEAD, "R2_AUDIT_COUNT_HEAD")
    pre = strict_json_bytes(files[R2_PRE_REPO_PATH], R2_PRE_REPO_PATH)
    post = strict_json_bytes(files[R2_POST_REPO_PATH], R2_POST_REPO_PATH)
    require(sha256_bytes(files[R2_PRE_REPO_PATH]) ==
            "55051d194b9afd7364048eb47e9740bb99b293d08478ed84cdc84b9b1d585828" and
            sha256_bytes(files[R2_POST_REPO_PATH]) ==
            "99870733f6c3183cd71ee4719586ed4f54d495e402ae3edb877aa179a8076766",
            "R2_PRE_POST_BYTES")
    require(pre["audit"] == audits[0] and post["audit"] == audits[1],
            "R2_PRE_POST_AUDIT_RELATION")
    require(pre["dette_coh"]["open_count"] == 9 and
            pre["dette_coh"]["chain_head"] == ledger["head"] and
            pre["reasons"] == ["AUTHORITY_SIGNATURE_UNVERIFIED"] and
            pre["verdict"] == "NON_MESURÉ" and post["verdict"] == "NON_MESURÉ",
            "R2_LEDGER_PRE_POST_RELATION")
    require(sha256_bytes(files[R2_TERMINAL_RECEIPT_PATH]) ==
            "3f36d3309b59e3c297740f061c85a039aa26881a3ad9aabda32bb20497b17044" and
            sha256_bytes(files[R2_TERMINAL_REPORT_PATH]) ==
            "e443ef59c89082a2101d462b38eb652d51e60433a7066a4efac43baa2f819493",
            "R2_TERMINAL_19_BYTES")
    return {"files": files, "ledger": ledger, "audits": audits,
            "pre": pre, "post": post}


def validate_authority_alias(r3_dir: Path, r4_dir: Path, parsed: dict,
                             bundle: dict) -> None:
    relation = parsed["C31_AUTHORITY_PACK_DEBT_RELATION_V1.json"]
    pack_path = r3_dir / "PACK_REQUEST_K3_AMYGDALA_PRODUCTIVE_AUTHORITIES_V1.json"
    require(relation["relation"] == "POSSIBLY_REMEDIATES" and
            relation["from"]["path"] == "../r3/PACK_REQUEST_K3_AMYGDALA_PRODUCTIVE_AUTHORITIES_V1.json" and
            relation["from"]["content_sha256"] == sha256_file(pack_path),
            "C31_ALIAS_PACK_RELATION")
    pack = strict_json_file(pack_path)
    require(relation["from"]["object_id"] == pack["object_id"] and
            relation["from"]["status"] == pack["status"] and
            relation["from"]["observed_distinct_productive_k3_authorities"] ==
            pack["observed"]["distinct_productive_k3_authorities"] == 0 and
            relation["from"]["observed_distinct_productive_amygdala_authorities"] ==
            pack["observed"]["distinct_productive_amygdala_authorities"] == 0,
            "C31_ALIAS_PACK_CONTENT")
    event = bundle["ledger"]["entries"][8]["event"]
    target = relation["to"]
    require(target["sequence"] == 9 and target["scope"] == event["scope"] and
            target["debt_key"] == event["debt_key"] and
            target["evidence_sha256"] == event["evidence_sha256"] and
            target["event_hash"] == bundle["ledger"]["entries"][8]["event_hash"] and
            target["source_sha256"] == R2_LEDGER_SHA,
            "C31_ALIAS_LEDGER_CONTENT")
    witness = relation["k3_witness"]
    require(witness["file_sha256"] ==
            sha256_bytes(bundle["files"][R2_PRE_REPO_PATH]) and
            witness["reason"] in bundle["pre"]["reasons"] and
            witness["ledger_chain_head"] == bundle["ledger"]["head"] and
            relation["identity_equivalence"] == "NON_MESURÉ" and
            relation["contributes_additional_debt_count"] == "NON_MESURÉ" and
            relation["possible_additional_count_range"] == [0, 1] and
            relation["bounded_relation_verdict"] == "NON_MESURÉ" and
            relation["global_zoran"] == "NON_MESURÉ", "C31_ALIAS_K3_WITNESS")


def validate_c26(parsed: dict) -> None:
    value = parsed["C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json"]
    observed = value["observation"]
    require(strict_typed_equal({
        "object_id": value["object_id"],
        "type": value["type"],
        "status": value["status"],
        "c26_verdict": value["c26_verdict"],
        "global_zoran": value["global_zoran"],
    }, {
        "object_id": "C26_PROTECTED_PROMOTION_AUTHORITY_V1",
        "type": "PACK_REQUEST",
        "status": "BLOCKED_EXTERNAL_AUTHORITY",
        "c26_verdict": "FAIL",
        "global_zoran": "NON_MESURÉ",
    }), "C26_FAIL_CLOSED")
    expected_checks = [
        {"context": "deterministic", "app_id": 15368,
         "head_sha": BASELINE_HEAD,
         "run_id": BASELINE_RUN_ID, "conclusion": "SUCCESS"},
        {"context": "r3-evidence", "app_id": 15368,
         "head_sha": BASELINE_HEAD,
         "run_id": BASELINE_RUN_ID, "conclusion": "SUCCESS"},
    ]
    expected_observation = {
        "observed_at": "2026-08-29T11:41:22Z",
        "repository": REPOSITORY,
        "pull_request": PULL_REQUEST,
        "pull_request_state": "OPEN_DRAFT",
        "pull_request_head": BASELINE_HEAD,
        "base_branch": "main",
        "base_sha": BASE_SHA,
        "main_protected": False,
        "protection_enabled": False,
        "required_status_checks_enforcement": "off",
        "required_status_check_contexts": [],
        "rulesets": [],
        "protection_read_http_status": 403,
        "protection_read_error": "Resource not accessible by integration",
        "requested_reviewers": [],
        "independent_approved_reviews": 0,
    }
    observed_without_checks = {
        key: observed[key] for key in expected_observation
    }
    require(strict_typed_equal(observed_without_checks, expected_observation),
            "C26_OBSERVED_ABSENCE")
    require(strict_typed_equal(observed["observed_checks"], expected_checks),
            "C26_OBSERVED_CHECK_BINDING")
    require(strict_typed_equal(value["required_admin_action"], {
        "required_status_checks": {
            "strict": True,
            "checks": [
                {"context": "deterministic", "app_id": 15368},
                {"context": "r3-evidence", "app_id": 15368},
            ],
        },
        "enforce_admins": True,
        "required_pull_request_reviews": {
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": True,
            "require_code_owner_reviews": False,
            "require_last_push_approval": True,
        },
        "required_conversation_resolution": True,
        "allow_force_pushes": False,
        "allow_deletions": False,
    }), "C26_ADMIN_POLICY")
    require(strict_typed_equal(value["required_reviewer_action"], {
        "candidate_login": "NON_MESURÉ",
        "distinct_from": "Zoran-IA-Mimetique",
        "minimum_permission": ["write", "maintain", "admin"],
        "required_review_state": "APPROVED",
        "review_commit": "EXACT_FINAL_PR_HEAD",
    }), "C26_REVIEWER_POLICY")
    require(strict_typed_equal(value["promotion_guards"], [
        "PR_NOT_DRAFT",
        "HEAD_UNCHANGED_AFTER_APPROVAL",
        "CHECKS_SUCCESS_ON_EXACT_FINAL_HEAD",
        "ALL_REVIEW_THREADS_RESOLVED",
        "NO_BYPASS",
    ]), "C26_PROMOTION_GUARDS")
    require(strict_typed_equal(value["robot_authority"], {
        "branch_protection_write_tool_available": False,
        "collaborator_invite_tool_available": False,
        "may_self_appoint_independent_reviewer": False,
        "may_merge_or_mutate_main": False,
    }), "C26_AUTHORITY_BOUNDARY")
    require(strict_typed_equal(value["closure_evidence_required"], [
        "main protected=true or an equivalent active ruleset",
        "both stable status checks required on the exact final head",
        "one distinct reviewer with verified repository permission",
        "APPROVED review whose commit_id equals the exact final head",
        "all review conversations resolved",
        "no push after approval",
    ]), "C26_CLOSURE_EVIDENCE")


def validate_c31(r3_dir: Path, r4_dir: Path, parsed: dict,
                 bundle: dict) -> None:
    value = parsed["C31_LEDGER_PIN_AND_DERIVATION_V2.json"]
    require(value["object_id"] == "ZCE-C31-CRITICAL-DEBT-DERIVATION-R4" and
            value["mission_contract_sha256"] == MISSION_SHA and
            value["supersedes"]["object_id"] ==
            "ZCE-C31-CRITICAL-DEBT-DERIVATION-R3" and
            value["supersedes"]["path"] ==
            "../r3/C31_CRITICAL_DEBT_DERIVATION_V1.json" and
            value["supersedes"]["content_sha256"] ==
            sha256_file(r3_dir / "C31_CRITICAL_DEBT_DERIVATION_V1.json"),
            "C31_SUPERSESSION_RELATION")
    source = value["source_bundle"]
    require(source["path"] == "source/ZCE_R2_GIT_EVIDENCE_9808ae1.bundle" and
            source["sha256"] == R2_BUNDLE_SHA and source["size_bytes"] == 56734 and
            source["reference"] == "refs/heads/main" and
            source["commit"] == R2_COMMIT and source["tree"] == R2_TREE and
            source["history"] == "COMPLETE_BUNDLE" and
            source["ledger_repository_path"] == R2_LEDGER_REPO_PATH and
            source["audit_repository_path"] == R2_AUDIT_REPO_PATH and
            source["pre_receipt_repository_path"] == R2_PRE_REPO_PATH and
            source["post_receipt_repository_path"] == R2_POST_REPO_PATH and
            source["terminal_receipt_repository_path"] ==
            R2_TERMINAL_RECEIPT_PATH and
            source["terminal_report_repository_path"] == R2_TERMINAL_REPORT_PATH,
            "C31_SOURCE_BUNDLE")
    ledger = value["ledger"]
    entries = bundle["ledger"]["entries"]
    expected_debts = [{"sequence": index + 1,
                       "scope": entry["event"]["scope"],
                       "debt_key": entry["event"]["debt_key"],
                       "event_hash": entry["event_hash"]}
                      for index, entry in enumerate(entries)]
    require(ledger["path"] == "source/R2_DETTE_COH_9808AE1.jsonl" and
            ledger["sha256"] == R2_LEDGER_SHA and ledger["size_bytes"] == 5436 and
            ledger["event_count"] == ledger["open_count"] == 9 and
            ledger["event_hash_algorithm"] ==
            "SHA256_UTF8_CANONICAL_JSON_RECORD_WITHOUT_EVENT_HASH" and
            ledger["chain_head"] == R2_LEDGER_HEAD and
            ledger["chain_integrity"] == "PASS" and
            ledger["rewrite_resistance"] == "TAMPER_EVIDENT_LOCAL_ONLY" and
            ledger["open_debts"] == expected_debts, "C31_LEDGER_RECEIPT")
    k3 = value["k3_audit"]
    require(k3["path"] == "source/R2_K3_AUDIT_9808AE1.jsonl" and
            k3["sha256"] == R2_AUDIT_SHA and k3["size_bytes"] == 36512 and
            k3["event_count"] == 2 and k3["chain_head"] == R2_AUDIT_HEAD and
            k3["chain_integrity"] == "PASS" and
            k3["pre_receipt_sha256"] == sha256_bytes(bundle["files"][R2_PRE_REPO_PATH]) and
            k3["post_receipt_sha256"] == sha256_bytes(bundle["files"][R2_POST_REPO_PATH]) and
            k3["terminal_receipt_sha256"] ==
            sha256_bytes(bundle["files"][R2_TERMINAL_RECEIPT_PATH]) and
            k3["terminal_report_sha256"] ==
            sha256_bytes(bundle["files"][R2_TERMINAL_REPORT_PATH]),
            "C31_K3_RECEIPT")
    policy = value["criticality_policy"]
    require(policy["path"] == "C31_FAIL_CLOSED_CRITICALITY_POLICY_V1.json",
            "C31_CRITICALITY_POLICY_PATH")
    policy_path = confined_file(r4_dir, policy["path"],
                                "C31_CRITICALITY_POLICY_PATH")
    expected_policy = {
        "schema": "zoran.zce.c31-fail-closed-criticality-policy.v1",
        "object_id": "ZCE-C31-FAIL-CLOSED-CRITICALITY-POLICY-R4",
        "mission_contract_sha256": MISSION_SHA,
        "scope": "LOCAL_R4_AUDIT_ONLY_NON_CANONICAL",
        "rules": [
            {
                "id": "NO_INVENTED_CRITICALITY",
                "condition": "A debt record has no signed or pinned criticality field or weighting policy.",
                "result": "Its criticality is NON_MESURÉ; it is neither upgraded to CRITICAL nor downgraded to NON_CRITICAL.",
            },
            {
                "id": "ZERO_NOT_PROVEN_FROM_UNKNOWN",
                "condition": "One or more debts have NON_MESURÉ criticality.",
                "result": "The exact open critical debt count is NON_MESURÉ and zero critical debt is not proven.",
            },
            {
                "id": "C31_FAIL_CLOSED",
                "condition": "Zero open critical debt is not proven or an explicit promotion blocker remains open.",
                "result": "C31 verdict is FAIL.",
            },
        ],
        "prohibited_inferences": [
            "OPEN implies CRITICAL",
            "UNWEIGHTED_COUNT implies severity",
            "NON_MESURÉ implies safe",
            "a PACK_REQUEST automatically adds a second debt",
        ],
        "promotion_effect": "NONE",
        "global_zoran": "NON_MESURÉ",
    }
    require(policy["content_sha256"] == sha256_file(policy_path) and
            policy["effect"] ==
            "Unknown criticality is preserved as NON_MESURÉ and cannot prove zero." and
            parsed[policy_path.name] == expected_policy,
            "C31_CRITICALITY_POLICY")
    blockers = value["external_promotion_blockers"]
    require(len(blockers) == 1 and blockers[0]["id"] ==
            "C26_REMOTE_PROMOTION_GOVERNANCE" and
            blockers[0]["status"] == "OPEN_BLOCKING_EXTERNAL_AUTHORITY" and
            blockers[0]["disjoint_from_ledger"] == "NON_MESURÉ" and
            blockers[0]["evidence_object_id"] ==
            parsed["C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json"]["object_id"] ==
            "C26_PROTECTED_PROMOTION_AUTHORITY_V1" and
            blockers[0]["evidence_path"] ==
            "C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json" and
            blockers[0]["evidence_sha256"] ==
            sha256_file(confined_file(r4_dir, blockers[0]["evidence_path"],
                                      "C31_C26_EVIDENCE_PATH")),
            "C31_C26_BLOCKER_LINK")
    aliases = value["remediation_aliases"]
    require(len(aliases) == 1 and
            aliases[0]["id"] ==
            "PACK_REQUEST_K3_AMYGDALA_PRODUCTIVE_AUTHORITIES_V1" and
            aliases[0]["status"] == "OPEN_BLOCKING_LIVE_K3_RESULT" and
            aliases[0]["candidate_ledger_debt_key"] == EXPECTED_DEBT_KEYS[8] and
            aliases[0]["candidate_ledger_scope"] == EXPECTED_SCOPES[8] and
            aliases[0]["identity_equivalence"] == "NON_MESURÉ" and
            aliases[0]["additional_count_min"] == 0 and
            aliases[0]["additional_count_max"] == 1 and
            aliases[0]["additional_count_exact"] == "NON_MESURÉ" and
            aliases[0]["relation_path"] ==
            "C31_AUTHORITY_PACK_DEBT_RELATION_V1.json" and
            aliases[0]["relation_sha256"] ==
            sha256_file(confined_file(r4_dir, aliases[0]["relation_path"],
                                      "C31_ALIAS_RELATION_PATH")), "C31_ALIAS_LINK")
    derived = value["derivation"]
    require(derived["ledger_open_count"] == 9 and
            derived["external_open_promotion_blocker_count"] == 1 and
            derived["authority_pack_additional_count_min"] == 0 and
            derived["authority_pack_additional_count_max"] == 1 and
            derived["authority_pack_additional_count_exact"] == "NON_MESURÉ" and
            derived["c26_ledger_overlap"] == "NON_MESURÉ" and
            (derived["unique_unresolved_item_count_min"],
             derived["unique_unresolved_item_count_max"]) == (9, 11) and
            derived["unique_unresolved_item_count_exact"] == "NON_MESURÉ" and
            derived["open_critical_debt_count_exact"] == "NON_MESURÉ" and
            derived["formula"] ==
            "9 ledger debts UNION 1 C26 blocker UNION 1 authority PACK_REQUEST; C26 overlap and PACK_REQUEST identity with ledger debt 9 are both NON_MESURÉ, therefore |union| is in [9,11]." and
            derived["non_circular"] is True and
            derived["double_count_rejected"] ==
            "POTENTIAL_OVERLAPS_PRESERVED_AS_NON_MESURÉ" and
            value["derived_open_critical_debt"] == "NON_MESURÉ" and
            value["zero_open_critical_debt_proven"] is False and
            value["c31_verdict"] == "FAIL" and value["global_zoran"] == "NON_MESURÉ",
            "C31_FAIL_CLOSED_DERIVATION")
    require(value["closure_rule"] ==
            "C31 passes only with zero unique open critical debt and linked repayment evidence for every ledger key plus external blockers.",
            "C31_CLOSURE_RULE")


def validate_r2_supersession(r3_dir: Path, r4_dir: Path, parsed: dict,
                             bundle: dict) -> None:
    value = parsed["R2_EVIDENCE_SUPERSESSION_V2.json"]
    require(value["policy"] == "APPEND_ONLY_NO_REWRITE" and
            value["supersedes"]["object_id"] ==
            "ZCE-R2-EVIDENCE-SUPERSESSION-R3" and
            value["supersedes"]["path"] ==
            "../r3/R2_EVIDENCE_SUPERSESSION_V1.json" and
            value["supersedes"]["content_sha256"] ==
            sha256_file(r3_dir / "R2_EVIDENCE_SUPERSESSION_V1.json"),
            "R2_SUPERSESSION_V1_LINK")
    require(value["source_bundle"] == {
        "path": "source/ZCE_R2_GIT_EVIDENCE_9808ae1.bundle",
        "sha256": R2_BUNDLE_SHA, "commit": R2_COMMIT, "tree": R2_TREE},
        "R2_SUPERSESSION_BUNDLE_LINK")
    chain = value["chain"]
    require([(item["passed"], item["total"]) for item in chain] ==
            [(19, 32), (26, 32), (30, 32)], "R2_SUPERSESSION_STAGES")
    require(chain[0]["receipt_file_sha256"] ==
            sha256_bytes(bundle["files"][R2_TERMINAL_RECEIPT_PATH]) and
            chain[0]["report_file_sha256"] ==
            sha256_bytes(bundle["files"][R2_TERMINAL_REPORT_PATH]),
            "R2_SUPERSESSION_19_LINK")
    expected_paths = {
        "R2_TERMINAL_MAX_HARNESS": (
            "source/ZCE_R2_MAX_HARNESS_TERMINAL_SNAPSHOT.json",
            "source/ZCE_R2_MAX_HARNESS_TERMINAL_AUDIT.json"),
        "R2_GIT_EVIDENCE_MAX_HARNESS": (
            "source/ZCE_R2_MAX_HARNESS_GIT_EVIDENCE_SNAPSHOT.json",
            "source/ZCE_R2_MAX_HARNESS_GIT_EVIDENCE_AUDIT.json"),
    }
    expected_blocked = {
        "R2_TERMINAL_MAX_HARNESS":
            ["C02", "C03", "C21", "C22", "C26", "C31"],
        "R2_GIT_EVIDENCE_MAX_HARNESS": ["C26", "C31"],
    }
    expected_digests = {
        "R2_TERMINAL_MAX_HARNESS": {
            "snapshot_file_sha256":
                "ae3b084c42be562c6ff99d567534913c2a6e9a5251e31c28c67b99ad8d8a5dc1",
            "snapshot_canonical_sha256":
                "92ee4a751688a55548fdaffa05901fb5722485b561fda94909adad54c8254331",
            "audit_file_sha256":
                "9fc954d5583b6c94bc98e838d4e867541245094057a742b30325eac4bfe81194",
        },
        "R2_GIT_EVIDENCE_MAX_HARNESS": {
            "snapshot_file_sha256":
                "a1c4ef95b81c2c5f2e8e2e48ef18e1d52089abbcbb2573911a27d512c34f07f2",
            "snapshot_canonical_sha256":
                "c544f11012dff15a2c39e24e4402ce0482ae5bd3b7ce55b85d04f7ecec5c3c15",
            "audit_file_sha256":
                "c94cb1f8d03a3600b9dba48c0594ce1163d902c9571bee8f95b873e10853904b",
        },
    }
    control_ids = [f"C{number:02d}" for number in range(1, 33)]
    for item in chain[1:]:
        require((item["snapshot_path"], item["audit_path"]) ==
                expected_paths[item["stage"]],
                f"R2_SUPERSESSION_PATHS:{item['stage']}")
        require({key: item[key] for key in expected_digests[item["stage"]]} ==
                expected_digests[item["stage"]],
                f"R2_SUPERSESSION_PINNED_DIGESTS:{item['stage']}")
        snapshot = confined_file(r4_dir, item["snapshot_path"],
                                 f"R2_SNAPSHOT_PATH:{item['stage']}")
        audit = confined_file(r4_dir, item["audit_path"],
                              f"R2_AUDIT_PATH:{item['stage']}")
        require(item["snapshot_file_sha256"] == sha256_file(snapshot) and
                item["snapshot_canonical_sha256"] ==
                canonical_sha256(strict_json_file(snapshot)) and
                item["audit_file_sha256"] == sha256_file(audit),
                f"R2_SUPERSESSION_DIGESTS:{item['stage']}")
        audit_value = strict_json_file(audit)
        controls = audit_value["controls"]
        require(isinstance(controls, dict) and list(controls) == control_ids and
                all(type(controls[control]) is bool for control in control_ids),
                f"R2_SUPERSESSION_CONTROLS:{item['stage']}")
        passed = sum(controls.values())
        blocked = [control for control in control_ids if not controls[control]]
        require(audit_value["passed"] == item["passed"] and
                audit_value["total"] == item["total"] and
                audit_value["passed"] == passed and
                blocked == expected_blocked[item["stage"]] and
                audit_value["blocked_controls"] ==
                expected_blocked[item["stage"]] and
                audit_value["snapshot_sha256"] ==
                item["snapshot_canonical_sha256"] and
                audit_value["verdict"] == "FAIL",
                f"R2_SUPERSESSION_AUDIT:{item['stage']}")
    require(value["blocked_controls"] == ["C26", "C31"] and
            value["global_zoran"] == "NON_MESURÉ", "R2_SUPERSESSION_LIMIT")


def validate_remote_and_replay(r3_dir: Path, parsed: dict) -> None:
    remote = parsed["GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json"]
    legacy_remote = r3_dir / "GIT_REMOTE_PROMOTION_EVIDENCE_V1.json"
    require(remote["policy"] == "APPEND_ONLY_NO_REWRITE" and
            remote["supersedes"]["object_id"] ==
            "ZCE-GIT-REMOTE-PROMOTION-EVIDENCE-R3-PREPUBLICATION" and
            remote["supersedes"]["path"] ==
            "../r3/GIT_REMOTE_PROMOTION_EVIDENCE_V1.json" and
            remote["supersedes"]["content_sha256"] == sha256_file(legacy_remote) and
            remote["scope"] == "PRE_R4_CORRECTION_BASELINE" and
            remote["repository"] == REPOSITORY and
            remote["pull_request"] == PULL_REQUEST and
            remote["branch"] == BRANCH and remote["base_sha"] == BASE_SHA and
            remote["observed_head"] == BASELINE_HEAD and
            remote["observed_run"] == {
                "run_id": BASELINE_RUN_ID,
                "head_sha": BASELINE_HEAD,
                "conclusion": "SUCCESS",
                "checks": {"deterministic": "SUCCESS",
                           "r3-evidence": "SUCCESS"},
            } and
            remote["review_state"] == {
                "p1_exact_head_checkout": "RESOLVED",
                "p1_opg_replay": "RESOLVED",
                "p2_c31_public_ledger": "OPEN_AT_BASELINE",
                "independent_approved_review": "NON_MESURÉ",
            } and
            remote["r4_head_binding"] == {
                "strategy": "EXTERNAL_NON_RECURSIVE_CHECK_RUN_AND_REVIEW",
                "workflow_assertion":
                    "git rev-parse HEAD equals github.event.pull_request.head.sha",
                "required_checks": ["deterministic", "r3-evidence"],
                "post_condition":
                    "The terminal POST must quote the exact final head, successful run id, job conclusions and independent review commit_id.",
            } and
            remote["known_external_blockers"] == [
                "main branch protection absent",
                "no active ruleset",
                "no independent APPROVED review on the exact final head",
            ] and
            remote["c26_verdict"] == "FAIL" and
            remote["global_zoran"] == "NON_MESURÉ", "R4_REMOTE_SUPERSESSION")
    replay = parsed["R4_CONTRADICTION_REPLAY_PACK_V1.json"]
    c31 = replay["c31_acceptance"]
    expected_proof_index = {
        "closed_manifest": "evidence/r4/SHA256SUMS",
        "mission_contract": "evidence/r4/source/ZCE_R4_MISSION_CONTRACT.json",
        "c31_derivation": "evidence/r4/C31_LEDGER_PIN_AND_DERIVATION_V2.json",
        "c31_criticality_policy":
            "evidence/r4/C31_FAIL_CLOSED_CRITICALITY_POLICY_V1.json",
        "c31_authority_alias_relation":
            "evidence/r4/C31_AUTHORITY_PACK_DEBT_RELATION_V1.json",
        "c26_pack_request":
            "evidence/r4/C26_PROTECTED_PROMOTION_AUTHORITY_PACK_REQUEST_V1.json",
        "r2_supersession": "evidence/r4/R2_EVIDENCE_SUPERSESSION_V2.json",
        "remote_supersession":
            "evidence/r4/GIT_REMOTE_PROMOTION_EVIDENCE_SUPERSESSION_V2.json",
        "r2_bundle": "evidence/r4/source/ZCE_R2_GIT_EVIDENCE_9808ae1.bundle",
        "r2_ledger": "evidence/r4/source/R2_DETTE_COH_9808AE1.jsonl",
        "r2_k3_audit": "evidence/r4/source/R2_K3_AUDIT_9808AE1.jsonl",
        "opg_bundle": "evidence/r3/ZORAN_OPPOSED_PAIR_GATE_V1_1.zip",
    }
    expected_commands = [
        "test -n \"$ZCE_EXPECTED_HEAD\" && test \"${#ZCE_EXPECTED_HEAD}\" -eq 40 && export ZCE_EXPECTED_HEAD",
        "git fetch origin pull/10/head:refs/remotes/origin/pr-10-head",
        "git checkout --detach \"$ZCE_EXPECTED_HEAD\"",
        "test \"$(git rev-parse HEAD)\" = \"$ZCE_EXPECTED_HEAD\"",
        "(cd consolidation_engine && python -m unittest discover -s tests)",
        "export ZCE_OPG_WORKDIR=\"$(mktemp -d)/opg\"",
        "(cd consolidation_engine && python tools/verify_r3_evidence.py --evidence-dir evidence/r3 --r4-evidence-dir evidence/r4 --workdir \"$ZCE_OPG_WORKDIR\" --require-c31-v2)",
        "(cd \"$ZCE_OPG_WORKDIR/ZORAN_OPPOSED_PAIR_GATE_V1_1\" && PYTHONPATH=. python -m pytest -q opposed_pair_gate/tests/test_gate.py)",
        "(cd \"$ZCE_OPG_WORKDIR/ZORAN_OPPOSED_PAIR_GATE_V1_1\" && PYTHONPATH=. python opposed_pair_gate/tests/run_falsification_1m.py > \"$ZCE_OPG_WORKDIR/campaign_out.json\")",
        "jq -S 'del(.elapsed_seconds)' \"$ZCE_OPG_WORKDIR/campaign_out.json\" > \"$ZCE_OPG_WORKDIR/campaign_norm.json\"",
        "jq -S 'del(.elapsed_seconds)' \"$ZCE_OPG_WORKDIR/ZORAN_OPPOSED_PAIR_GATE_V1_1/opposed_pair_gate/results/FALSIFICATION_1M.json\" > \"$ZCE_OPG_WORKDIR/campaign_ref.json\"",
        "diff \"$ZCE_OPG_WORKDIR/campaign_norm.json\" \"$ZCE_OPG_WORKDIR/campaign_ref.json\"",
        "test \"$(jq -r .violations \"$ZCE_OPG_WORKDIR/campaign_out.json\")\" = \"0\" && test \"$(jq -r .status \"$ZCE_OPG_WORKDIR/campaign_out.json\")\" = \"PASS_1M_IMPLEMENTATION_GATE\"",
        "git bundle verify consolidation_engine/evidence/r4/source/ZCE_R2_GIT_EVIDENCE_9808ae1.bundle",
        "gh api repos/Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence/branches/main",
        "gh api repos/Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence/rulesets",
        "test \"$(gh api \"repos/Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence/commits/$ZCE_EXPECTED_HEAD/check-runs\" --jq '[.check_runs[] | select((.name==\"deterministic\" or .name==\"r3-evidence\") and .conclusion==\"success\" and .head_sha==env.ZCE_EXPECTED_HEAD)] | length')\" -eq 2",
        "test \"$(gh api repos/Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence/pulls/10/reviews --jq '[.[] | select(.commit_id == env.ZCE_EXPECTED_HEAD)] | length')\" -ge 1",
    ]
    expected_c31_acceptance = {
        "ledger_chain": "PASS",
        "open_ledger_debts": 9,
        "external_open_promotion_blockers": 1,
        "authority_pack_identity_equivalence": "NON_MESURÉ",
        "authority_pack_additional_count_range": [0, 1],
        "unique_unresolved_item_count_range": [9, 11],
        "exact_open_critical_debt": "NON_MESURÉ",
        "zero_open_critical_debt_proven": False,
        "verdict_until_zero": "FAIL",
    }
    expected_c26_acceptance = {
        "exact_head_ci": "PASS required",
        "independent_review": "PASS required on exact final head",
        "real_branch_protection_or_ruleset": "PASS required",
        "current_verdict": "FAIL",
    }
    expected_limits = [
        "global Zoran promotion",
        "causal external validation",
        "productive K3/Amygdala authorities",
        "product runtime integration",
        "supply-chain SBOM and signed attestation",
        "GitHub-hosted ubuntu-24.04 runner image immutability",
        "Xavier GitHub identity until explicitly resolved",
    ]
    require(replay["repository"] == REPOSITORY and
            replay["pull_request"] == PULL_REQUEST and replay["branch"] == BRANCH and
            replay["base_sha"] == BASE_SHA and
            replay["r4_parent_head"] == remote["observed_head"] == BASELINE_HEAD and
            replay["exact_r4_head_resolution"] ==
            "Capture pull_request.head.sha into ZCE_EXPECTED_HEAD BEFORE any fetch, then require the detached checkout, both workflow check-run head_sha values and the review commit_id to equal that immutable value. Never trust a synthetic merge SHA or a re-resolved mutable ref." and
            replay["proof_index"] == expected_proof_index and
            replay["replay_commands"] == expected_commands and
            c31 == expected_c31_acceptance and
            replay["c26_acceptance"] == expected_c26_acceptance and
            replay["non_measured_limits"] == expected_limits and
            replay["global_zoran"] == "NON_MESURÉ", "R4_REPLAY_PACK")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", required=True, type=Path,
                        help="répertoire evidence/r3")
    parser.add_argument("--r4-evidence-dir", required=True, type=Path,
                        help="répertoire evidence/r4")
    parser.add_argument("--workdir", required=True, type=Path)
    parser.add_argument("--require-c31-v2", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    reject_symlink_components(args.evidence_dir, "R3_ROOT_SYMLINK")
    reject_symlink_components(args.r4_evidence_dir, "R4_ROOT_SYMLINK")
    reject_symlink_components(args.workdir, "ROOT_WORKDIR_SYMLINK")
    r3_dir = args.evidence_dir.resolve()
    r4_dir = args.r4_evidence_dir.resolve()
    workdir = args.workdir.resolve()
    require(args.require_c31_v2, "C31_V2_MUST_BE_REQUIRED")
    require(not paths_overlap(workdir, r3_dir) and
            not paths_overlap(workdir, r4_dir),
            "ROOT_WORKDIR_EVIDENCE_OVERLAP")
    require(not workdir.exists() or not any(workdir.iterdir()), "ROOT_WORKDIR_NOT_EMPTY")
    workdir.mkdir(parents=True, exist_ok=True)
    require(sha256_file(r3_dir / "SHA256SUMS") == R3_SHA256SUMS_SHA256,
            "R3_MANIFEST_PIN")
    require(sha256_file(r4_dir / "SHA256SUMS") == R4_SHA256SUMS_SHA256,
            "R4_MANIFEST_PIN")
    r3_names = validate_closed_sums(r3_dir)
    r4_names = validate_closed_sums(r4_dir)
    r3 = validate_contract_set(r3_dir, r3_names, R3_CONTRACTS)
    r4 = validate_contract_set(r4_dir, r4_names, R4_CONTRACTS)
    validate_mission_contract(r4_dir, r4)
    validate_r3_receipts(r3)
    opg_root = validate_and_extract_zip(r3_dir / BUNDLE, workdir)
    validate_opg_tree(r3_dir, opg_root)
    bundle = validate_r2_bundle(r4_dir, workdir)
    validate_authority_alias(r3_dir, r4_dir, r4, bundle)
    validate_c26(r4)
    validate_c31(r3_dir, r4_dir, r4, bundle)
    validate_r2_supersession(r3_dir, r4_dir, r4, bundle)
    validate_remote_and_replay(r3_dir, r4)
    validate_pinned_r4_receipts(r4_dir)
    require(sha256_file(r3_dir / "SHA256SUMS") == R3_SHA256SUMS_SHA256,
            "R3_MANIFEST_PIN_FINAL")
    require(sha256_file(r4_dir / "SHA256SUMS") == R4_SHA256SUMS_SHA256,
            "R4_MANIFEST_PIN_FINAL")
    require(validate_closed_sums(r3_dir) == r3_names and
            validate_closed_sums(r4_dir) == r4_names,
            "EVIDENCE_CHANGED_DURING_REPLAY")
    print("PASS_R4_EVIDENCE:closed manifests; strict contracts; safe OPG ZIP; "
          "R2 Git bundle; ledger/K3 chains; C31 fail-closed; C26 PACK_REQUEST; "
          "append-only supersessions; contradiction replay pack")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except VerificationError as exc:
        print(f"FAIL_CLOSED:{exc}", file=sys.stderr)
        sys.exit(1)
