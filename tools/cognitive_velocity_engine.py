#!/usr/bin/env python3
"""ZORAN — COGNITIVE_VELOCITY_ENGINE.

Mission : ZORAN_DYNAMIC_VELOCITY_HIERARCHY_GRAPH_20260516.

PRINCIPE : la verticalité du graphe ne reflète plus le prestige
structurel, mais la VÉLOCITÉ COGNITIVE SOUTENABLE.

8 nouveaux scores par loi :
  velocity_score        : vitesse cognitive nette
  frugality_score       : déjà calculé (re-utilisé)
  runtime_efficiency    : impact / coût agrégé
  propagation_weight    : poids inverse propagation
  temporal_survival     : déjà calculé
  implicit_cost         : coût implicite normalisé
  runtime_value         : valeur runtime nette
  dynamic_rank          : rang émergent par velocity_score

Réécrit aussi `_fy` pour que l'axe Y reflète velocity_score.
Réécrit aussi `topological_weight` pour que la taille reflète runtime_value.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "COGNITIVE_VELOCITY_REPORT.json"


def runtime_efficiency(node):
    """impact / coût agrégé."""
    impact = node.get("runtime_impact_score", 0) or 0
    cost = max(0.05, (node.get("propagation_cost", 0.5) or 0.5))
    raw = impact / cost
    return max(0.0, min(1.0, raw / 8))


def propagation_weight(node):
    """Poids inverse de propagation (haut = léger, bas = lourd)."""
    pc = node.get("propagation_cost", 0.5) or 0.5
    return max(0.0, min(1.0, 1.0 - pc))


def implicit_cost(node):
    """Coût implicite normalisé sur 20 contraintes max."""
    ic = node.get("implicit_constraint_count", 0) or 0
    return max(0.0, min(1.0, ic / 20))


def temporal_survival(node):
    """Re-utilise temporal_resilience_score si présent, sinon proxy."""
    return node.get("temporal_resilience_score") or node.get("survival_score") or 0.5


def runtime_value(scores, node):
    """Valeur runtime nette : utilité brute - coût."""
    val = (
        0.40 * scores["runtime_efficiency"]
        + 0.30 * (node.get("llm_relevance_score", 0.5) or 0.5)
        + 0.30 * scores["temporal_survival"]
        - 0.20 * scores["implicit_cost"]
    )
    return max(0.0, min(1.0, val + 0.20))  # léger offset pour distribution


def velocity_score(scores):
    """Vélocité cognitive nette : frugalité × runtime × survie - coûts."""
    return max(0.0, min(1.0,
        0.30 * scores["runtime_efficiency"]
        + 0.25 * scores["frugality_score"]
        + 0.20 * scores["temporal_survival"]
        + 0.10 * scores["propagation_weight"]
        - 0.10 * scores["implicit_cost"]
        - 0.05 * (scores.get("collapse_probability") or 0)
    ) + 0.10)  # offset pour éviter scores trop bas


def velocity_to_Y(velocity):
    """Map velocity ∈ [0,1] vers Y ∈ [-200, +200]."""
    return round(-200 + velocity * 400, 1)


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))

    print(f"\nCOGNITIVE_VELOCITY_ENGINE — Mission ZORAN_DYNAMIC_VELOCITY_HIERARCHY_GRAPH_20260516")
    print(f"  Lois à classer : {len(g['nodes'])}")

    scored = []
    for n in g["nodes"]:
        fs = n.get("frugality_score") or 0.5  # déjà calculé par experimental engine
        ts = temporal_survival(n)
        re_score = runtime_efficiency(n)
        pw = propagation_weight(n)
        ic = implicit_cost(n)
        cp = n.get("collapse_probability") or 0

        scores = {
            "frugality_score": fs,
            "runtime_efficiency": round(re_score, 3),
            "propagation_weight": round(pw, 3),
            "temporal_survival": round(ts, 3),
            "implicit_cost": round(ic, 3),
            "collapse_probability": cp,
        }
        scores["runtime_value"] = round(runtime_value(scores, n), 3)
        scores["velocity_score"] = round(velocity_score(scores), 3)

        n["velocity_score"] = scores["velocity_score"]
        n["runtime_efficiency"] = scores["runtime_efficiency"]
        n["propagation_weight"] = scores["propagation_weight"]
        n["temporal_survival"] = scores["temporal_survival"]
        n["implicit_cost"] = scores["implicit_cost"]
        n["runtime_value"] = scores["runtime_value"]
        # Réécriture _fy : Y reflète maintenant la vélocité (au lieu du structural_rank)
        n["_fy_velocity"] = velocity_to_Y(scores["velocity_score"])
        # On garde _fy_structural pour réf
        n["_fy_structural"] = n.get("_fy", 0)
        n["_fy"] = n["_fy_velocity"]
        # Topological weight = runtime_value (taille = utilité runtime)
        n["topological_weight_velocity"] = scores["runtime_value"]
        # On laisse `topological_weight` inchangé pour compat, mais on ajoute le nouveau

        scored.append({"id": n["id"], "family": n["family"],
                       "attractor_tier": n.get("attractor_tier"),
                       "superior": n.get("superior_law_candidate", False),
                       **scores,
                       "_fy_old": n["_fy_structural"],
                       "_fy_new": n["_fy_velocity"]})

    # Compute dynamic_rank (1 = highest velocity)
    scored.sort(key=lambda x: -x["velocity_score"])
    for rank, s in enumerate(scored, start=1):
        s["dynamic_rank_velocity"] = rank
        node = next(n for n in g["nodes"] if n["id"] == s["id"])
        node["dynamic_rank_velocity"] = rank

    # Save
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_DYNAMIC_VELOCITY_HIERARCHY_GRAPH_20260516",
        "timestamp": "2026-05-16T00:41:00+02:00",
        "laws_classified": len(g["nodes"]),
        "top_velocity_score": scored[:20],
        "low_velocity_score": scored[-20:],
        "all_scored": scored
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  ✓ 8 scores vélocité injectés sur les {len(g['nodes'])} nœuds")
    print(f"  ✓ _fy réécrit selon velocity_score (Y axis = vélocité cognitive)")

    print(f"\n  TOP 5 velocity_score (lois au sommet du graphe) :")
    for s in scored[:5]:
        sup = '★' if s["superior"] else ' '
        tier = s["attractor_tier"] or '—'
        print(f"    {sup} #{s['dynamic_rank_velocity']:3d} {s['id']:18s}  "
              f"vel={s['velocity_score']:.3f}  rt_value={s['runtime_value']:.3f}  tier={tier}")

    print(f"\n  BOTTOM 5 velocity_score (lois en bas du graphe) :")
    for s in scored[-5:]:
        sup = '★' if s["superior"] else ' '
        tier = s["attractor_tier"] or '—'
        print(f"    {sup} #{s['dynamic_rank_velocity']:3d} {s['id']:18s}  "
              f"vel={s['velocity_score']:.3f}  tier={tier}")

    # Check exemple obligatoire mission
    print(f"\n  Exemples mission (comportement attendu visible runtime) :")
    for example in ["GHUC-001", "WP11-008", "WP12-009"]:
        s = next((x for x in scored if x["id"] == example), None)
        if s:
            print(f"    {example}  vel={s['velocity_score']:.3f}  rank #{s['dynamic_rank_velocity']}  "
                  f"_fy={s['_fy_new']:+.0f}  (was {s['_fy_old']:+.0f})")


if __name__ == "__main__":
    main()
