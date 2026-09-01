#!/usr/bin/env python3
"""ZORAN — RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.

Mission : ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516.

Pour une question Q, le moteur génère ≥ 3 routes cognitives concurrentes,
chacune sélectionnant un sous-ensemble de lois selon une STRATÉGIE
DIFFÉRENTE :

  1. frugale            — coût minimal (top frugality_score)
  2. anti_hallucination — sécurité max (top anti_hallucination_score)
  3. propagation_forte  — profondeur (top dependency_load + propag_cost)
  4. temporal_survival  — stabilité (top temporal_resilience)
  5. structurelle       — composition max (top connectivity)
  6. runtime_rapide     — coût total minimal

Chaque route produit une "réponse" = ensemble de lois activées + scores
agrégés. Les routes sont ensuite comparées et éliminées selon critères
Oracle.

Pipeline (mission) :
  Question → SubjectBoundary → multi-routes → propagation runtime →
  réponses concurrentes → Oracle → scoring → élimination → promotion
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
ROUTES = ROOT / "app" / "data" / "routes.json"
REPORT = ROOT / "audit" / "PATH_COMPETITION_REPORT.json"

K_LAWS_PER_ROUTE = 10  # nombre de lois par route


def tokens(text):
    if not text: return set()
    return {t.strip(".,;:()[]{}\"'-").lower() for t in text.split() if t.strip()}


def topic_score(node, q_tokens):
    """Réutilise topic_relevance déjà calculé par cognitive_selection_engine."""
    bag = set()
    for k in ("title", "description"):
        bag |= tokens(node.get(k, ""))
    bag |= set(t.lower() for t in (node.get("tags") or []))
    if not q_tokens: return 0.5
    return len(q_tokens & bag) / max(1, len(q_tokens))


def route_frugale(nodes, q_tokens):
    """Coût minimal — privilégie frugality_score haut + propag_cost bas."""
    ranked = sorted(nodes, key=lambda n: -((n.get("frugality_score") or 0.5)
                                            - 0.5 * (n.get("propagation_cost") or 0.5)
                                            + 0.30 * topic_score(n, q_tokens)))
    return ranked[:K_LAWS_PER_ROUTE]


def route_anti_hallucination(nodes, q_tokens):
    ranked = sorted(nodes, key=lambda n: -((n.get("anti_hallucination_score") or 0.4)
                                            + 0.30 * topic_score(n, q_tokens)
                                            - 0.20 * (n.get("drift_risk") or 0.3)))
    return ranked[:K_LAWS_PER_ROUTE]


def route_propagation_forte(nodes, q_tokens):
    ranked = sorted(nodes, key=lambda n: -((n.get("dependency_load") or 0.3)
                                            + 0.30 * (n.get("propagation_cost") or 0.5)
                                            + 0.30 * topic_score(n, q_tokens)))
    return ranked[:K_LAWS_PER_ROUTE]


def route_temporal_survival(nodes, q_tokens):
    ranked = sorted(nodes, key=lambda n: -((n.get("temporal_resilience_score") or 0.5)
                                            + 0.30 * topic_score(n, q_tokens)
                                            - 0.20 * (n.get("collapse_probability") or 0)))
    return ranked[:K_LAWS_PER_ROUTE]


def route_structurelle(nodes, q_tokens):
    """Lois les plus connectées (haut child_laws + parent_laws + composition)."""
    def conn(n):
        return len(n.get("child_laws") or []) + len(n.get("parent_laws") or [])
    ranked = sorted(nodes, key=lambda n: -(conn(n) + 0.50 * topic_score(n, q_tokens)
                                            + 0.30 * (n.get("S_local") or 0.7)))
    return ranked[:K_LAWS_PER_ROUTE]


def route_runtime_rapide(nodes, q_tokens):
    ranked = sorted(nodes, key=lambda n: -((n.get("velocity_score") or 0.4)
                                            + 0.30 * topic_score(n, q_tokens)
                                            - 0.30 * (n.get("propagation_cost") or 0.5)))
    return ranked[:K_LAWS_PER_ROUTE]


ROUTE_STRATEGIES = {
    "frugale":            (route_frugale, "Coût minimal — privilégie frugality"),
    "anti_hallucination": (route_anti_hallucination, "Sécurité maximale — réduit dérive"),
    "propagation_forte":  (route_propagation_forte, "Profondeur — explore loin"),
    "temporal_survival":  (route_temporal_survival, "Stabilité long terme"),
    "structurelle":       (route_structurelle, "Composition max — utilise réseau"),
    "runtime_rapide":     (route_runtime_rapide, "Latence minimale — runtime"),
}


def score_route(laws):
    """Calcule les 6 nouvelles métriques mission pour une route."""
    if not laws:
        return {k: 0.0 for k in [
            "runtime_cost", "precision_score", "hallucination_risk",
            "propagation_weight", "temporal_stability", "noise_generated",
            "runtime_path_efficiency", "hallucination_resistance",
            "noise_efficiency", "cognitive_cost_ratio",
            "real_world_alignment", "path_survival_score",
            "selection_score", "survival_probability",
        ]}
    n = len(laws)
    rt_cost  = sum((l.get("propagation_cost") or 0.5) for l in laws) / n
    prec     = sum((l.get("S_local") or 0.7) for l in laws) / n
    hallu    = sum((l.get("drift_risk") or 0.3) for l in laws) / n
    propag_w = sum((l.get("propagation_weight") or 0.5) for l in laws) / n
    temp_st  = sum((l.get("temporal_resilience_score") or 0.5) for l in laws) / n
    noise    = sum((l.get("noise_contribution") or 0.3) for l in laws) / n

    # Mission nouveaux scores
    rt_eff   = max(0.0, min(1.0, prec - rt_cost + 0.30))
    hallu_r  = 1.0 - hallu
    noise_eff = 1.0 - noise
    cc_ratio = max(0.0, min(1.0, prec / max(0.05, rt_cost) / 2.0))
    # Real-world alignment : approx par anti_hallu × stability × frugality
    frug_avg = sum((l.get("frugality_score") or 0.5) for l in laws) / n
    rwa      = round((hallu_r * 0.40 + temp_st * 0.30 + frug_avg * 0.30), 3)
    survival = round(min(1.0, 0.40 * rt_eff + 0.30 * hallu_r + 0.30 * temp_st), 3)
    selection = round(min(1.0,
        0.25 * rt_eff + 0.20 * hallu_r + 0.20 * noise_eff
        + 0.15 * cc_ratio + 0.10 * temp_st + 0.10 * rwa
    ), 3)

    return {
        "runtime_cost":            round(rt_cost, 3),
        "precision_score":         round(prec, 3),
        "hallucination_risk":      round(hallu, 3),
        "propagation_weight":      round(propag_w, 3),
        "temporal_stability":      round(temp_st, 3),
        "noise_generated":         round(noise, 3),
        "runtime_path_efficiency": round(rt_eff, 3),
        "hallucination_resistance": round(hallu_r, 3),
        "noise_efficiency":        round(noise_eff, 3),
        "cognitive_cost_ratio":    round(cc_ratio, 3),
        "real_world_alignment":    rwa,
        "path_survival_score":     survival,
        "selection_score":         selection,
        "survival_probability":    survival,
    }


# Critères d'élimination Oracle
def oracle_eliminate(route_scores):
    """Élimine route si dérive/coût trop hauts ou gain trop faible."""
    failures = []
    if route_scores["hallucination_risk"] > 0.55:
        failures.append("hallucination_excessive")
    if route_scores["noise_generated"] > 0.55:
        failures.append("bruit_excessif")
    if route_scores["runtime_cost"] > 0.80:
        failures.append("coût_runtime_excessif")
    if route_scores["runtime_path_efficiency"] < 0.20:
        failures.append("gain_runtime_insuffisant")
    if route_scores["temporal_stability"] < 0.40:
        failures.append("instabilité_temporelle")
    return failures


def baseline_naive(nodes, q_tokens):
    """Baseline : top selection_priority (déjà calculé)."""
    ranked = sorted(nodes, key=lambda n: -((n.get("selection_priority") or 0)
                                            + 0.30 * topic_score(n, q_tokens)))
    return ranked[:K_LAWS_PER_ROUTE]


def baseline_random(nodes, q_tokens, seed=42):
    """Baseline : pick 10 random."""
    import random
    rng = random.Random(seed)
    return rng.sample(nodes, min(K_LAWS_PER_ROUTE, len(nodes)))


def compete(question, nodes):
    q_tokens = tokens(question)
    routes = []
    for strat_name, (strat_fn, description) in ROUTE_STRATEGIES.items():
        laws = strat_fn(nodes, q_tokens)
        scores = score_route(laws)
        failures = oracle_eliminate(scores)
        routes.append({
            "route_id": f"ROUTE-{strat_name}",
            "strategy": strat_name,
            "description": description,
            "laws_used": [l["id"] for l in laws],
            "frames_used": list({
                (f.get("label") if isinstance(f, dict) else str(f))
                for l in laws
                for f in (l.get("frames", {}).get("local", []) or [])
            })[:5],
            **scores,
            "eliminated": len(failures) > 0,
            "elimination_reasons": failures,
        })
    # Baselines
    baselines = []
    bl_n = baseline_naive(nodes, q_tokens)
    bl_r = baseline_random(nodes, q_tokens)
    baselines.append({
        "baseline_id": "BASELINE-naive_selection_priority",
        "laws_used": [l["id"] for l in bl_n],
        **score_route(bl_n),
    })
    baselines.append({
        "baseline_id": "BASELINE-random",
        "laws_used": [l["id"] for l in bl_r],
        **score_route(bl_r),
    })
    survivors = [r for r in routes if not r["eliminated"]]
    survivors.sort(key=lambda r: -r["selection_score"])
    winner = survivors[0] if survivors else None
    return {
        "question": question,
        "routes": routes,
        "baselines": baselines,
        "survivors_count": len(survivors),
        "winner": winner["route_id"] if winner else None,
    }


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = g["nodes"]

    print(f"\nRUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE — Mission ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516")
    print(f"  Lois disponibles : {len(nodes)}")
    print(f"  Stratégies routes : {len(ROUTE_STRATEGIES)}")

    # Demo questions (mission test sample)
    DEMOS = [
        "comment réduire la propagation runtime ?",
        "loi supérieure qui réduit l'hallucination ?",
        "frugalité cognitive et bornage temporel",
        "comment gérer la cohérence multi-cadres ?",
        "détecter une dérive en runtime",
    ]
    all_results = []
    for q in DEMOS:
        result = compete(q, nodes)
        all_results.append(result)
        print(f"\n  Q: {q!r}")
        for r in result["routes"]:
            mark = '✗' if r["eliminated"] else '✓'
            print(f"    {mark} {r['strategy']:20s} sel={r['selection_score']:.3f} "
                  f"prec={r['precision_score']:.2f} hallu={r['hallucination_risk']:.2f} "
                  f"noise={r['noise_generated']:.2f} {('' if not r['eliminated'] else r['elimination_reasons'])}")
        for b in result["baselines"]:
            print(f"    ◇ {b['baseline_id']:38s} sel={b['selection_score']:.3f} prec={b['precision_score']:.2f}")
        print(f"    → winner: {result['winner']}")

    # Save runtime routes data for UI
    ROUTES.write_text(json.dumps({
        "mission_id": "ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516",
        "timestamp": "2026-05-16T04:36:00+02:00",
        "k_laws_per_route": K_LAWS_PER_ROUTE,
        "strategies": list(ROUTE_STRATEGIES.keys()),
        "demo_queries": all_results,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516",
        "timestamp": "2026-05-16T04:36:00+02:00",
        "demo_queries": all_results,
        "total_routes_generated": sum(len(r["routes"]) for r in all_results),
        "total_eliminated": sum(sum(1 for x in r["routes"] if x["eliminated"]) for r in all_results),
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    total_routes = sum(len(r["routes"]) for r in all_results)
    total_elim = sum(sum(1 for x in r["routes"] if x["eliminated"]) for r in all_results)
    print(f"\n  Routes générées : {total_routes}")
    print(f"  Routes éliminées Oracle : {total_elim} ({100*total_elim/total_routes:.0f}%)")
    print(f"  ✓ Routes exportées vers app/data/routes.json (UI)")


if __name__ == "__main__":
    main()
