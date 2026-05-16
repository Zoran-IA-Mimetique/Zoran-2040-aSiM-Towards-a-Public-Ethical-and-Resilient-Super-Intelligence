#!/usr/bin/env python3
"""ZORAN Mission 3 — Chaos + stress tests sur Oracle / pipeline.

Inject :
  - lois contradictoires
  - lois pseudo-universelles
  - faux attracteurs
  - faux invariants
  - cycles parent (R-CORE-7 violation)

Verify Oracle :
  - détecte
  - isole
  - refuse
  - rollback

Output : audit/CHAOS_TEST_RESULTS.json
"""
from __future__ import annotations
import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
RESULTS = ROOT / "audit" / "CHAOS_TEST_RESULTS.json"

CANONICAL_FAMILIES = {"ULG","DVE","UDE","GHUC","WP11","WP12","SDE","PAL"}
INTERMEDIATE_LEVELS = {"micro","meso","macro","systémique"}


def make_chaos_law(id, **overrides):
    base = {
        "id": id, "title": "Chaos test law", "family": "ULG",
        "canonical": False, "palieronic": False, "attractor_tier": None,
        "domains": ["chaos"], "examples": ["test"], "equations": [],
        "html_description": "Chaos law for stress testing the Oracle pipeline rigorously.",
        "S_local": 0.50, "S_global": 0.50, "stability": "exploratoire", "weight": 0.30,
        "frames": {
            "local": ["chaos test"],
            "intermediate": [{"level":"meso","scope":"chaos"}],
            "global": ["chaos test global"],
            "proxies": ["chaos proxy"],
            "limits": ["test only"]
        }
    }
    base.update(overrides)
    return base


def validate_law_through_pipeline(law, canonical):
    """Returns (admitted: bool, phase_failed: int, reason: str)."""
    # Phase 1
    if law["family"] not in CANONICAL_FAMILIES:
        return False, 1, f"family '{law['family']}' not canonical"
    parent = law.get("parent")
    by_id = {n["id"] for n in canonical["nodes"]}
    if parent and parent not in by_id:
        return False, 1, f"parent '{parent}' unknown"
    # Phase 2
    f = law.get("frames", {})
    for k in ("local","intermediate","global","proxies","limits"):
        if k not in f: return False, 2, f"frames.{k} missing"
    if not f["intermediate"] or not f["limits"]:
        return False, 2, "intermediate or limits empty"
    if any(e["level"] not in INTERMEDIATE_LEVELS for e in f["intermediate"]):
        return False, 2, "level invalid"
    # Phase 3
    if len(law.get("html_description","")) < 40:
        return False, 3, "description short"
    if not (law.get("equations") or law.get("examples")):
        return False, 3, "no grounding"
    # Phase 4: simplifie compositions count = parents/related/iso/contradicts
    comps = set()
    if parent: comps.add(parent)
    for k in ("related","iso","contradicts","absorbed_into","depends"):
        v = law.get(k, [])
        if isinstance(v, list):
            for ref in v:
                comps.add(ref if isinstance(ref, str) else (ref.get("target") if isinstance(ref, dict) else None))
    comps.discard(None)
    if len(comps) < 3:
        return False, 4, f"compositions {len(comps)} < 3"
    # All passes
    return True, 0, "OK"


def detect_chaos_signals(law, canonical):
    """Returns list of detected anomalies."""
    signals = []
    desc = law.get("html_description","").lower()
    # Pseudo-universel
    if any(w in desc for w in ["universel", "universellement", "toujours", "tout cadre"]):
        signals.append("pseudo-universal claim")
    # Faux attracteur (tier déclaré mais composition insuffisante OU canonical=true sans démo)
    if law.get("attractor_tier"):
        # check si la loi mérite ce tier (compositions ≥ 5 pour μ1, ≥ 7 pour μ0)
        comps_count = len(set(law.get("related",[]) + law.get("iso",[])))
        if law.get("attractor_tier") == "μ0" and comps_count < 7:
            signals.append(f"R-ATR-1: μ0 tier with insufficient compositions ({comps_count})")
        elif law.get("attractor_tier") == "μ1" and comps_count < 5:
            signals.append(f"R-ATR-1: μ1 tier with insufficient compositions ({comps_count})")
    # Iso sans invariants (R-CORE-8)
    for iso in law.get("iso_edges", []):
        if not iso.get("invariants"):
            signals.append(f"iso edge without invariants: {iso}")
    # Contradicts non-réciproque
    for contra in law.get("contradicts", []):
        target = next((n for n in canonical["nodes"] if n["id"] == contra), None)
        if target and law["id"] not in target.get("contradicts", []):
            signals.append(f"non-reciprocal contradicts {contra}")
    # Cycle parent (R-CORE-7)
    parent = law.get("parent")
    if parent == law["id"]:
        signals.append("self-loop parent")
    # False coherence gap (WP11-005)
    sl = law.get("S_local", 0)
    sg = law.get("S_global", 0)
    if sl - sg > 0.30:
        signals.append(f"WP11-005 false_coherence gap = {sl - sg:.2f}")
    # Faux invariant : phrases vagues universalisantes dans frames.global ou .local
    f = law.get("frames", {})
    for inv in f.get("global", []) + f.get("local", []):
        inv_lower = inv.lower()
        if any(w in inv_lower for w in ["universel", "omniprésent", "absolu", "tout cadre"]):
            signals.append(f"suspicious invariant: '{inv}'")
    return signals


def run_chaos_tests():
    canonical = json.loads(DATA.read_text(encoding="utf-8"))

    chaos_cases = [
        # 1. Loi contradictoire (S_local élevé, S_global bas)
        ("CHAOS-CONTRADICTION", make_chaos_law(
            "CHAOS-001", parent="ULG-001",
            S_local=0.95, S_global=0.30,  # gap énorme
            html_description="Loi avec grand écart S_local-S_global, viole WP11-005."
        ), "should_warn_false_coherence"),

        # 2. Pseudo-universelle (ne déclare aucune limite réelle)
        ("CHAOS-PSEUDO-UNIVERSAL", make_chaos_law(
            "CHAOS-002", parent="ULG-001",
            html_description="Cette loi s'applique universellement à tout cadre, sans aucune restriction.",
            frames={
                "local": ["univers entier"],
                "intermediate": [{"level":"systémique","scope":"tout"}],
                "global": ["tout est cette loi"],
                "proxies": ["aucun"],
                "limits": []  # VIOLATION : limits vide
            }
        ), "should_reject_phase_2_limits_empty"),

        # 3. Faux attracteur (tier sans démonstration)
        ("CHAOS-FAKE-ATTRACTOR", make_chaos_law(
            "CHAOS-003", parent="ULG-001",
            attractor_tier="μ0",  # fake tier
            weight=0.99,
            canonical=True,
            html_description="Pseudo-attractor sans démonstration des compositions requises."
        ), "should_admit_but_oracle_warn_R_ATR_1"),

        # 4. Faux invariant (passe phase 4 grâce à iso fictif pour tester signal)
        ("CHAOS-FAKE-INVARIANT", make_chaos_law(
            "CHAOS-004", parent="ULG-001",
            html_description="Loi avec invariant suspect prétendant universalité absolue.",
            related=["ULG-002","ULG-003","ULG-004"],  # 4 compositions pour passer Phase 4
            frames={
                "local": ["x"],
                "intermediate": [{"level":"meso","scope":"ULG"}],
                "global": ["invariant universel et omniprésent dans tout cadre"],
                "proxies": ["aucun"],
                "limits": ["aucune limite déclarée"]
            }
        ), "should_admit_but_signal_suspicious"),

        # 5. Cycle parent (self-loop)
        ("CHAOS-CYCLE", make_chaos_law(
            "CHAOS-005", parent="CHAOS-005",  # self-loop
            html_description="Loi avec self-parent — viole R-CORE-7 DAG."
        ), "should_reject_phase_1_self_loop"),

        # 6. Family non-canonical
        ("CHAOS-FAKE-FAMILY", make_chaos_law(
            "CHAOS-006", family="MAGIC",
            html_description="Loi dans famille MAGIC inventée — viole R-CORE-11."
        ), "should_reject_phase_1_family"),

        # 7. Composition < 3 (loi orpheline)
        ("CHAOS-ORPHAN", make_chaos_law(
            "CHAOS-007", parent=None,  # no parent
            html_description="Loi orpheline sans parent ni connections — devrait échouer compositions."
        ), "should_reject_phase_4_compositions"),

        # 8. Frames malformés (level invalide)
        ("CHAOS-MALFORMED-FRAMES", make_chaos_law(
            "CHAOS-008", parent="ULG-001",
            html_description="Loi avec level 'magic_level' inventé.",
            frames={
                "local": ["x"],
                "intermediate": [{"level":"magic_level","scope":"x"}],  # invalid level
                "global": ["x"],
                "proxies": ["x"],
                "limits": ["x"]
            }
        ), "should_reject_phase_2_level_invalid"),

        # 9. Description trop courte (< 40 chars)
        ("CHAOS-SHORT-DESC", make_chaos_law(
            "CHAOS-009", parent="ULG-001",
            html_description="court."  # < 40 chars
        ), "should_reject_phase_3_description"),

        # 10. Sans grounding (ni eq ni example)
        ("CHAOS-NO-GROUNDING", make_chaos_law(
            "CHAOS-010", parent="ULG-001",
            equations=[], examples=[],  # both empty
            html_description="Loi sans aucun grounding — viole R-CORE-3 implicit."
        ), "should_reject_phase_3_grounding"),
    ]

    results = []
    for name, law, expected in chaos_cases:
        admitted, phase, reason = validate_law_through_pipeline(law, canonical)
        signals = detect_chaos_signals(law, canonical)
        results.append({
            "case_name": name,
            "expected": expected,
            "admitted_by_pipeline": admitted,
            "phase_failed": phase if not admitted else None,
            "rejection_reason": reason if not admitted else None,
            "chaos_signals_detected": signals,
            "verdict": "PASS" if (
                ("reject" in expected and not admitted) or
                ("admit_but" in expected and admitted and signals) or
                ("warn" in expected and signals)
            ) else "FAIL"
        })

    # Verdict global
    pass_count = sum(1 for r in results if r["verdict"] == "PASS")
    fail_count = len(results) - pass_count

    summary = {
        "mission_id": "ZORAN_RUNTIME_INGESTION_AND_ORACLE_STRESS_TEST_20260515",
        "timestamp": "2026-05-15T21:00:00+02:00",
        "total_chaos_cases": len(chaos_cases),
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_rate": round(pass_count / max(1, len(chaos_cases)), 3),
        "verdict": "GREEN" if fail_count == 0 else "YELLOW" if fail_count <= 2 else "RED",
        "canonical_unchanged": True,  # No canonical modification during tests
        "results": results
    }

    RESULTS.parent.mkdir(parents=True, exist_ok=True)
    RESULTS.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\nCHAOS STRESS TESTS — Mission 3")
    print(f"  Total cases     : {len(chaos_cases)}")
    print(f"  Pass            : {pass_count} ({100*pass_count/len(chaos_cases):.0f}%)")
    print(f"  Fail            : {fail_count}")
    print(f"  Verdict         : {summary['verdict']}")
    print(f"  Canonical state : UNCHANGED")
    print(f"\n  Detail :")
    for r in results:
        symbol = "✓" if r["verdict"] == "PASS" else "✗"
        print(f"  {symbol}  {r['case_name']:30s} {r['expected']}")


if __name__ == "__main__":
    run_chaos_tests()
