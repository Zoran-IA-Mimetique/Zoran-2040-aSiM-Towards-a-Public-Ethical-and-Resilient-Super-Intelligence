#!/usr/bin/env python3
"""Cross-validate every canonical law against the full demonstration pipeline.

Mission : ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515 (Stage B).

For each law in laws.json, run the 6-phase demonstration pipeline:
  1. Detection (id/family/parent valid)
  2. Frames (5 fields complete + level enforced)
  3. Demonstration (description ≥ 40 chars + grounding)
  4. Composition ≥ 3 distinct linked laws
  5. Fractal participation (informational)
  6. Runtime admissibility decision

Output : audit/DEMONSTRATION_REPORT.json with per-law verdict + summary.
"""
from __future__ import annotations

import json
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "DEMONSTRATION_REPORT.json"

CANONICAL_FAMILIES = {"ULG", "DVE", "UDE", "GHUC", "WP11", "WP12", "SDE", "PAL"}
INTERMEDIATE_LEVELS = {"micro", "meso", "macro", "systémique"}


def edges_of(graph, node_id):
    """Return all edges touching node_id."""
    out = []
    for e in graph["edges"]:
        if e["source"] == node_id or e["target"] == node_id:
            out.append(e)
    return out


def parents_of(graph, node_id):
    return [e["target"] for e in graph["edges"]
            if e["kind"] == "parent" and e["source"] == node_id]


def children_of(graph, node_id):
    return [e["source"] for e in graph["edges"]
            if e["kind"] == "parent" and e["target"] == node_id]


def compositions_for(graph, node_id):
    """Count distinct laws compositionally linked to node_id."""
    composes = set()
    parents = parents_of(graph, node_id)
    composes.update(parents)

    # grand-parents
    for p in parents:
        composes.update(parents_of(graph, p))

    # siblings
    for p in parents:
        composes.update(children_of(graph, p))

    # children
    composes.update(children_of(graph, node_id))

    # iso / contradicts / related / absorbed_into / depends
    for e in graph["edges"]:
        if e["kind"] in ("iso", "contradicts", "related", "absorbed_into", "depends"):
            if e["source"] == node_id: composes.add(e["target"])
            if e["target"] == node_id: composes.add(e["source"])

    # explicit compositions
    for c in graph.get("compositions", []):
        if node_id in c.get("pair", []):
            for p in c["pair"]:
                if p != node_id: composes.add(p)

    composes.discard(node_id)
    return composes


def fractal_families(graph):
    return [f["id"] for f in graph["families"] if f.get("fractality_demonstrated")]


def demonstrate_law(graph, node):
    """Run the 6-phase pipeline on `node` and return a verdict dict."""
    verdict = {
        "id": node["id"],
        "family": node["family"],
        "phases": {},
        "compositions_count": 0,
        "passes_all_phases": False,
        "runtime_admissible_should_be": False,
        "issues": []
    }

    # Phase 1 — Detection
    p1_pass = True
    if not node.get("id"):
        verdict["issues"].append("Phase 1 : id missing"); p1_pass = False
    if node.get("family") not in CANONICAL_FAMILIES:
        verdict["issues"].append(f"Phase 1 : family '{node.get('family')}' not canonical")
        p1_pass = False
    verdict["phases"]["1_detection"] = p1_pass

    # Phase 2 — Frames
    p2_pass = True
    f = node.get("frames", {})
    for k in ("local", "intermediate", "global", "proxies", "limits"):
        if k not in f:
            verdict["issues"].append(f"Phase 2 : frames.{k} missing"); p2_pass = False
    if isinstance(f.get("intermediate"), list):
        if len(f["intermediate"]) == 0:
            verdict["issues"].append("Phase 2 : frames.intermediate empty"); p2_pass = False
        for entry in f["intermediate"]:
            if not isinstance(entry, dict) or "level" not in entry:
                verdict["issues"].append("Phase 2 : intermediate entry malformed"); p2_pass = False
            elif entry["level"] not in INTERMEDIATE_LEVELS:
                verdict["issues"].append(f"Phase 2 : intermediate level '{entry['level']}' invalid"); p2_pass = False
    if isinstance(f.get("limits"), list) and len(f["limits"]) == 0:
        verdict["issues"].append("Phase 2 : frames.limits empty"); p2_pass = False
    verdict["phases"]["2_frames"] = p2_pass

    # Phase 3 — Demonstration
    p3_pass = True
    if len(node.get("html_description", "")) < 40:
        verdict["issues"].append("Phase 3 : html_description < 40 chars"); p3_pass = False
    if not (node.get("equations") or node.get("examples")):
        verdict["issues"].append("Phase 3 : no equation or example (no grounding)"); p3_pass = False
    verdict["phases"]["3_demonstration"] = p3_pass

    # Phase 4 — Composition ≥ 3
    comps = compositions_for(graph, node["id"])
    verdict["compositions_count"] = len(comps)
    p4_pass = len(comps) >= 3
    if not p4_pass:
        verdict["issues"].append(f"Phase 4 : compositions = {len(comps)} < 3")
        verdict["compositions_found"] = list(comps)
    verdict["phases"]["4_composition"] = p4_pass

    # Phase 5 — Fractal participation (informational)
    fractals = fractal_families(graph)
    verdict["phases"]["5_fractal_family"] = node["family"] in fractals

    # Phase 6 — Runtime admissibility
    all_required = p1_pass and p2_pass and p3_pass and p4_pass
    verdict["passes_all_phases"] = all_required
    verdict["runtime_admissible_should_be"] = all_required
    verdict["runtime_admissible_actual"] = node.get("runtime_admissible", False)
    if all_required and not node.get("runtime_admissible"):
        verdict["issues"].append(
            "Phase 6 : passes pipeline but runtime_admissible flag = False"
        )
    if not all_required and node.get("runtime_admissible"):
        verdict["issues"].append(
            "Phase 6 : fails pipeline but runtime_admissible flag = True (CRITICAL)"
        )

    return verdict


def main() -> int:
    graph = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = graph["nodes"]

    verdicts = [demonstrate_law(graph, n) for n in nodes]

    # Aggregations
    pass_count = sum(1 for v in verdicts if v["passes_all_phases"])
    fail_count = len(verdicts) - pass_count
    by_phase_pass = {phase: 0 for phase in ("1_detection","2_frames","3_demonstration","4_composition","5_fractal_family")}
    for v in verdicts:
        for phase, ok in v["phases"].items():
            if ok: by_phase_pass[phase] += 1

    by_family = defaultdict(lambda: {"total": 0, "passing": 0, "failing": []})
    for v in verdicts:
        by_family[v["family"]]["total"] += 1
        if v["passes_all_phases"]:
            by_family[v["family"]]["passing"] += 1
        else:
            by_family[v["family"]]["failing"].append(v["id"])

    composition_distribution = Counter(v["compositions_count"] for v in verdicts)
    composition_min = min(v["compositions_count"] for v in verdicts)
    composition_max = max(v["compositions_count"] for v in verdicts)
    composition_avg = sum(v["compositions_count"] for v in verdicts) / max(1, len(verdicts))

    failing_laws = [v for v in verdicts if not v["passes_all_phases"]]

    report = {
        "mission_id": "ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515",
        "phase": "B_cross_demonstration",
        "timestamp": "2026-05-15T20:30:00+02:00",
        "total_laws": len(nodes),
        "passing_all_phases": pass_count,
        "failing": fail_count,
        "pass_rate": round(pass_count / max(1, len(nodes)), 4),
        "by_phase_pass": by_phase_pass,
        "by_family": {k: dict(v) for k, v in by_family.items()},
        "composition_stats": {
            "min": composition_min,
            "max": composition_max,
            "avg": round(composition_avg, 2),
            "distribution": {str(k): v for k, v in sorted(composition_distribution.items())}
        },
        "failing_laws_detail": failing_laws[:50],  # cap for file size
        "all_verdicts": verdicts,
    }

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\n══════ DEMONSTRATION CROSS-VALIDATION ══════")
    print(f"Total laws        : {len(nodes)}")
    print(f"Passing all phases: {pass_count}  ({100*pass_count/len(nodes):.1f}%)")
    print(f"Failing           : {fail_count}")
    print(f"\nBy phase :")
    for ph, ok in by_phase_pass.items():
        print(f"  {ph:25s} {ok:3d}/{len(nodes)}")
    print(f"\nBy family :")
    for fam, stats in sorted(by_family.items()):
        print(f"  {fam:6s} {stats['passing']:3d}/{stats['total']:3d}"
              + (f"  failing: {stats['failing']}" if stats["failing"] else ""))
    print(f"\nComposition counts : min={composition_min} max={composition_max} avg={composition_avg:.2f}")
    print(f"Distribution       : {dict(sorted(composition_distribution.items()))}")
    print(f"\nReport             : {REPORT}")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
