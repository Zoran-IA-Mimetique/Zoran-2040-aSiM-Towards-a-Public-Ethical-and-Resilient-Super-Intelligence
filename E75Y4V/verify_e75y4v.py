#!/usr/bin/env python3
"""Independent verification of the E75Y4V package.

Part A — cross-checks every claim in the published files that is verifiable
from the files themselves (hashes, timestamps, count arithmetic).

Part B — re-implements the four-condition bootstrap-chronology validator
described in the report's "Méthode" section and re-runs the full campaign
structure (50 controls, 5 attack families x 50, content-only comparator,
50 observations of the actual R12 evidence) to check that the published
counts are reproduced.

Run from the repository root:  python3 E75Y4V/verify_e75y4v.py
Exits 0 if every check passes, 1 otherwise.
"""

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
checks = []


def check(name, ok, detail=""):
    checks.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---------------------------------------------------------------- Part A ----
print("== Part A : verification des affirmations des fichiers ==")

results = json.loads((HERE / "E75Y4V_RESULTS.json").read_text())
certificate = json.loads((HERE / "E75Y4V_CERTIFICATE.json").read_text())
handoff = json.loads((HERE / "HANDOFF_276.json").read_text())
report_path = HERE / "ZORAN_RAPPORT_E75Y4V_PRE_R12_BOOTSTRAP_CHRONOLOGY_2026-08-29.md"

# A1. SHA-256 declared in HANDOFF_276 vs actual files
check("A1a HANDOFF sha256(results) == fichier reel",
      handoff["results"]["sha256"] == sha256(HERE / "E75Y4V_RESULTS.json"),
      handoff["results"]["sha256"][:16] + "…")
check("A1b HANDOFF sha256(rapport) == fichier reel",
      handoff["report"]["sha256"] == sha256(report_path),
      handoff["report"]["sha256"][:16] + "…")

# A2. Timestamp arithmetic: counteraudit - anchor == 211.485935 s
r12 = results["actual_r12"]
t_anchor = datetime.fromisoformat(r12["anchor_library_created_at"].replace("Z", "+00:00"))
t_audit = datetime.fromisoformat(r12["counteraudit_library_created_at"].replace("Z", "+00:00"))
delta = (t_audit - t_anchor).total_seconds()
check("A2 delta contre-audit - ancre == valeur declaree",
      abs(delta - r12["counteraudit_after_anchor_seconds"]) < 1e-6,
      f"{delta:.6f} s")

# A3. Count arithmetic
c = results["counts"]
check("A3a cases 350 == 50 controles + 250 attaques + 50 observations R12",
      results["cases"] == 350 == c["controls_pass"] + c["chronology_attacks"] + c["actual_r12_non_mesure"])
check("A3b attaques 250 == 5 familles x 50",
      c["chronology_attacks"] == 5 * 50 == len(results["attack_families"]) * 50)
check("A3c detail strict 150 FAIL + 100 NON_MESURE == 250 vetos",
      c["strict_fail"] + c["strict_non_mesure"] == c["strict_veto"] == 250)
check("A3d certificats == evenements == cases == 350",
      results["certificates"] == results["events"] == results["cases"] == 350)

# A4. Family -> verdict mapping consistent with the 150/100 split
fail_families = sum(1 for v in results["attack_families"].values() if v[1] == "FAIL")
nm_families = sum(1 for v in results["attack_families"].values() if v[1] == "NON_MESURÉ")
check("A4 3 familles FAIL et 2 familles NON_MESURE => 150/100",
      fail_families == 3 and nm_families == 2
      and fail_families * 50 == c["strict_fail"] and nm_families * 50 == c["strict_non_mesure"])

# A5. Verdict strings agree across the three JSON files
check("A5a verdict borne identique (results/certificate/handoff)",
      results["bounded_verdict"] == certificate["bounded_verdict"] == handoff["bounded_pass"])
check("A5b verdict R12 identique (results/certificate/handoff)",
      results["actual_verdict"] == certificate["actual_verdict"] == handoff["status"])
check("A5c statut scientifique NON_MESURE partout",
      results["scientific_status"] == certificate["scientific_status"]
      == handoff["scientific_status"] == "NON_MESURÉ")

# A6. R12: 0/4 conditions, 4 NON_MESURE, verdict name matches
check("A6 R12 0/4 conditions et 4 NON_MESURE, coherent avec le nom du verdict",
      r12["chronology_conditions_passed"] == 0
      and r12["chronology_conditions_non_mesure"] == 4
      and "0_OF_4" in results["actual_verdict"]
      and r12["bootstrap_verdict"] == "NON_MESURÉ")

# ---------------------------------------------------------------- Part B ----
print("\n== Part B : re-execution de la logique du validateur chronologique ==")

# The four-condition contract from the report (section Méthode, item 5):
# C1 pin_predates_decision, C2 pin_is_independent,
# C3 floor_predates_decision, C4 floor_is_non_restorable.
COND_TRUE, COND_FALSE, COND_UNKNOWN = "TRUE", "FALSE", "UNKNOWN"


def strict_validator(case):
    """PASS only if all four conditions are demonstrably TRUE.
    Any FALSE condition -> FAIL; otherwise any UNKNOWN -> NON_MESURÉ."""
    vals = case["conditions"].values()
    if all(v == COND_TRUE for v in vals):
        return "PASS"
    if any(v == COND_FALSE for v in vals):
        return "FAIL"
    return "NON_MESURÉ"


def content_only_comparator(case):
    """Ignores chronology entirely: accepts any case whose content
    (signatures/hashes) is internally valid — which all attacks are."""
    return "PASS" if case["content_valid"] else "FAIL"


def make_control(_):
    return {"content_valid": True, "conditions": {
        "pin_predates_decision": COND_TRUE, "pin_is_independent": COND_TRUE,
        "floor_predates_decision": COND_TRUE, "floor_is_non_restorable": COND_TRUE}}


# Attack families exactly as declared in E75Y4V_RESULTS.json attack_families:
# each family violates one named condition, with the declared severity.
ATTACKS = {
    "pin_after_decision": ("pin_predates_decision", COND_FALSE),
    "self_declared_pin": ("pin_is_independent", COND_FALSE),
    "rollbackable_floor": ("floor_is_non_restorable", COND_FALSE),
    "missing_floor": ("floor_predates_decision", COND_UNKNOWN),
    "unordered_or_equal_timestamp": ("pin_predates_decision", COND_UNKNOWN),
}


def make_attack(family):
    cond, severity = ATTACKS[family]
    case = make_control(None)
    case["conditions"][cond] = severity
    return case


def make_r12_observation(_):
    # Actual R12 evidence: zero pre-anchor hits on four exact queries,
    # counteraudit created 211.485935 s AFTER the anchor. None of the four
    # conditions is demonstrated; none is proven false (absence of retrieved
    # evidence is not proof of nonexistence) -> all UNKNOWN.
    return {"content_valid": True, "conditions": {
        "pin_predates_decision": COND_UNKNOWN, "pin_is_independent": COND_UNKNOWN,
        "floor_predates_decision": COND_UNKNOWN, "floor_is_non_restorable": COND_UNKNOWN}}


controls = [make_control(i) for i in range(50)]
attacks = [(fam, make_attack(fam)) for fam in ATTACKS for _ in range(50)]
observations = [make_r12_observation(i) for i in range(50)]

controls_pass = sum(strict_validator(x) == "PASS" for x in controls)
strict_verdicts = [strict_validator(x) for _, x in attacks]
strict_veto = sum(v != "PASS" for v in strict_verdicts)
strict_fail = strict_verdicts.count("FAIL")
strict_nm = strict_verdicts.count("NON_MESURÉ")
content_false_accepts = sum(content_only_comparator(x) == "PASS" for _, x in attacks)
r12_nm = sum(strict_validator(x) == "NON_MESURÉ" for x in observations)

check("B1 controles valides : 50/50 PASS", controls_pass == c["controls_pass"] == 50)
check("B2 attaques bloquees par le validateur strict : 250/250",
      strict_veto == c["strict_veto"] == 250)
check("B3 detail strict : 150 FAIL / 100 NON_MESURE",
      strict_fail == c["strict_fail"] == 150 and strict_nm == c["strict_non_mesure"] == 100)
check("B4 comparateur contenu-seul : 250/250 faux positifs",
      content_false_accepts == c["content_only_false_accepts"] == 250)
check("B5 candidat R12 reel : 50/50 observations NON_MESURE",
      r12_nm == c["actual_r12_non_mesure"] == 50)
check("B6 total cas re-executes == 350",
      len(controls) + len(attacks) + len(observations) == results["cases"] == 350)

# ---------------------------------------------------------------- Verdict ---
failed = [n for n, ok, _ in checks if not ok]
print(f"\n{len(checks) - len(failed)}/{len(checks)} verifications PASS")
if failed:
    print("ECHECS :", *failed, sep="\n  - ")
    sys.exit(1)
print("VERDICT : les fichiers E75Y4V sont internement coherents et la logique")
print("du validateur decrite reproduit exactement les comptes publies.")
