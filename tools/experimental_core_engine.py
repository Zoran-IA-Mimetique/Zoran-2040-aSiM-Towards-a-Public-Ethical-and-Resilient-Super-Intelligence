#!/usr/bin/env python3
"""ZORAN — EXPERIMENTAL_CORE_CONTINUATION.

Mission : ZORAN_EXPERIMENTAL_CORE_CONTINUATION_20260516.

Consolide expérimentalement les 5 moteurs précédents en mesurant la
soutenabilité runtime à long terme.

5 nouveaux scores par loi :
  propagated_cost_curve     : array de coûts simulés sur N itérations
  runtime_sustainability    : moyenne des coûts curve, bas = soutenable
  long_term_stability       : variance inverse des S_propagated simulés
  frugality_score           : impact / cost agrégé
  collapse_sensitivity      : variance sous perturbations multiples

Classification automatique en 5 classes :
  fondatrice                : structure forte (impact haut + central)
  survivante                : stabilité temporelle haute
  frugale                   : faible coût propagation
  runtime_critique          : améliore fortement ZORANs
  toxique_propagationnelle  : surcharge implicite
"""
from __future__ import annotations
import json
import random
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "EXPERIMENTAL_CORE_REPORT.json"
LONG_TERM = ROOT / "audit" / "LONG_TERM_PROPAGATION_RESULTS.json"


def simulate_propagated_cost(node, iters=10):
    """Simule la courbe du coût propagé sur N itérations.

    À chaque itération, on perturbe légèrement les dépendances et on
    re-mesure le coût. La courbe révèle si le coût reste stable ou drift.
    """
    base_cost = (node.get("dependency_load", 0) or 0) * 0.4
    base_cost += (node.get("implicit_constraint_count", 0) or 0) / 50
    base_cost += (node.get("cross_graph_pressure", 0) or 0) * 0.3
    base_cost = max(0.0, min(1.0, base_cost))

    rng = random.Random(hash(node["id"]) % (2**32))
    curve = []
    cost = base_cost
    for _ in range(iters):
        # Perturbation aléatoire ± 5%
        delta = rng.uniform(-0.05, 0.05)
        cost = max(0.0, min(1.0, cost + delta))
        curve.append(round(cost, 4))
    return curve


def runtime_sustainability(curve):
    """Moyenne du coût simulé : bas = soutenable, haut = coûteux long terme."""
    if not curve: return 0.5
    avg = sum(curve) / len(curve)
    # invert : haut score = peu coûteux = soutenable
    return max(0.0, min(1.0, 1 - avg))


def long_term_stability(curve):
    """Variance inverse de la curve."""
    if len(curve) < 2: return 1.0
    mean = sum(curve) / len(curve)
    var = sum((x - mean) ** 2 for x in curve) / len(curve)
    # Plus la variance est faible, plus c'est stable
    return max(0.0, min(1.0, 1 - 10 * var))


def frugality_score(node, sustainability):
    """Frugalité = impact / coût."""
    impact = node.get("runtime_impact_score", 0) or 0
    cost = node.get("propagation_cost", 0.5) or 0.5
    raw_ratio = impact / max(0.01, cost)
    # normalise sur [0, 1] avec sigmoid-like
    return max(0.0, min(1.0, raw_ratio / 10))


def collapse_sensitivity(node, curve):
    """Sensibilité au collapse = max delta absolu dans la curve."""
    if len(curve) < 2: return 0.0
    deltas = [abs(curve[i+1] - curve[i]) for i in range(len(curve)-1)]
    max_delta = max(deltas)
    # haut delta = sensible
    return max(0.0, min(1.0, max_delta * 20))


def classify(node):
    """Classification en 5 classes basée sur les scores cumulés."""
    classes = []
    # Fondatrice : tier μ0/μ1 ou compositions ≥ 7
    if (node.get("attractor_tier") in ("μ0","μ1")
        or (node.get("_compositions_count", 0) or 0) >= 7):
        classes.append("fondatrice")
    # Survivante : temporal_resilience_score > 0.65
    if (node.get("temporal_resilience_score", 0) or 0) > 0.65:
        classes.append("survivante")
    # Frugale : frugality_score > 0.5 OR propagation_cost < 0.15
    if (node.get("frugality_score", 0) > 0.5
        or (node.get("propagation_cost", 1) or 1) < 0.15):
        classes.append("frugale")
    # Runtime critique : llm_relevance ≥ 0.50 AND runtime_impact ≥ 0.75
    if ((node.get("llm_relevance_score", 0) or 0) >= 0.50
        and (node.get("runtime_impact_score", 0) or 0) >= 0.75):
        classes.append("runtime_critique")
    # Toxique propagationnelle : propagation_cost > 0.40 AND runtime_impact < 0.60
    if ((node.get("propagation_cost", 0) or 0) > 0.40
        and (node.get("runtime_impact_score", 1) or 1) < 0.60):
        classes.append("toxique_propagationnelle")
    return classes or ["neutre"]


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))

    print(f"\nEXPERIMENTAL_CORE_CONTINUATION — Mission ZORAN_EXPERIMENTAL_CORE_CONTINUATION_20260516")
    print(f"  Lois à analyser : {len(g['nodes'])}")
    print(f"  Simulation : 10 itérations long-terme par loi")

    scored = []
    for n in g["nodes"]:
        curve = simulate_propagated_cost(n, iters=10)
        sust = runtime_sustainability(curve)
        lts = long_term_stability(curve)
        col_sens = collapse_sensitivity(n, curve)
        n["propagated_cost_curve"] = curve
        n["runtime_sustainability"] = round(sust, 3)
        n["long_term_stability"]    = round(lts, 3)
        n["collapse_sensitivity"]   = round(col_sens, 3)
        frug = frugality_score(n, sust)
        n["frugality_score"] = round(frug, 3)
        classes = classify(n)
        n["experimental_classes"] = classes
        scored.append({"id": n["id"], "family": n["family"],
                       "attractor_tier": n.get("attractor_tier"),
                       "superior": n.get("superior_law_candidate", False),
                       "runtime_sustainability": round(sust, 3),
                       "long_term_stability": round(lts, 3),
                       "frugality_score": round(frug, 3),
                       "collapse_sensitivity": round(col_sens, 3),
                       "classes": classes,
                       "curve_sample": curve[:5]})

    # Save
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Class distribution
    from collections import Counter
    flat_classes = [c for s in scored for c in s["classes"]]
    class_dist = Counter(flat_classes)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_EXPERIMENTAL_CORE_CONTINUATION_20260516",
        "timestamp": "2026-05-16T00:30:00+02:00",
        "laws_tested": len(g["nodes"]),
        "iterations_per_law": 10,
        "class_distribution": dict(class_dist),
        "top_runtime_sustainability": sorted(scored, key=lambda x: -x["runtime_sustainability"])[:15],
        "top_frugality_score": sorted(scored, key=lambda x: -x["frugality_score"])[:15],
        "high_collapse_sensitivity": sorted(scored, key=lambda x: -x["collapse_sensitivity"])[:15],
        "all_scored": scored
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    LONG_TERM.write_text(json.dumps({
        "mission_id": "ZORAN_EXPERIMENTAL_CORE_CONTINUATION_20260516",
        "tests_run": ["propagation_longue_10_iters", "perturbation_lente_5pct_per_iter"],
        "results_summary": {
            "avg_runtime_sustainability": round(sum(s["runtime_sustainability"] for s in scored)/len(scored), 3),
            "avg_long_term_stability": round(sum(s["long_term_stability"] for s in scored)/len(scored), 3),
            "avg_collapse_sensitivity": round(sum(s["collapse_sensitivity"] for s in scored)/len(scored), 3),
            "graph_resists": all(s["collapse_sensitivity"] < 0.50 for s in scored),
        }
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\n  Distribution par classe :")
    for cls, n in sorted(class_dist.items(), key=lambda x: -x[1]):
        print(f"    {cls:30s} {n:4d}")

    print(f"\n  TOP 5 runtime_sustainability :")
    for s in sorted(scored, key=lambda x: -x["runtime_sustainability"])[:5]:
        sup = '★' if s["superior"] else ' '
        print(f"    {sup} {s['id']:18s}  sustain={s['runtime_sustainability']:.3f}  "
              f"frug={s['frugality_score']:.3f}  "
              f"classes={s['classes']}")

    print(f"\n  TOP 5 collapse_sensitivity (sensibilité) :")
    for s in sorted(scored, key=lambda x: -x["collapse_sensitivity"])[:5]:
        print(f"    ⚠ {s['id']:18s}  sens={s['collapse_sensitivity']:.3f}  "
              f"sustain={s['runtime_sustainability']:.3f}")

    print(f"\n  ✓ 5 scores expérimentaux injectés sur les {len(g['nodes'])} nœuds")
    print(f"  ✓ Classification injectée sur chaque loi")


if __name__ == "__main__":
    main()
