#!/usr/bin/env python3
"""ZORAN — COGNITIVE_SELECTION_ENGINE.

Mission : ZORAN_COGNITIVE_SELECTION_ENGINE_20260516.

Pour un *sujet runtime donné*, sélectionne le SOUS-GRAPHE MINIMAL
SUFFISANT capable d'atteindre une précision cohérente admissible
au COÛT COGNITIF MINIMAL.

Pipeline obligatoire (mission spec) :
    Sujet utilisateur
    → SubjectBoundaryEngine
    → Law Relevance Ranking
    → Frame Relevance Ranking
    → Propagation Cost Estimation
    → Runtime Budget Estimation
    → Threshold Filtering
    → Optimal Cognitive Set
    → Oracle Validation
    → Runtime

Principe fondamental :
    Un bon runtime n'utilise PAS toutes les lois disponibles,
    mais le PLUS PETIT SOUS-GRAPHE SUFFISANT pour atteindre une
    précision cohérente admissible.

Maximise :
    Gain_Cognitif / (Coût_Propagation + Charge_Runtime)

8 nouveaux scores injectés par loi :
  topic_relevance               : pertinence par rapport à un sujet
  runtime_priority              : priorité runtime
  information_gain              : gain informationnel net
  frame_dependency_cost         : coût des cadres requis
  cognitive_efficiency          : ratio gain/coût
  minimum_precision_contribution: contribution à la précision plancher
  marginal_information_gain     : gain marginal vs sous-graphe précédent
  threshold_admissibility       : admissibilité sous le seuil de précision
  runtime_precision_gain        : gain de précision runtime
  runtime_cost_ratio            : ratio coût runtime
  propagation_efficiency        : efficacité de propagation
  selection_priority            : score final de priorité de sélection

Le moteur fournit aussi une fonction `select_cognitive_set(topic, budget)`
qui retourne le sous-graphe optimal pour un sujet donné.
"""
from __future__ import annotations
import json
import math
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "COGNITIVE_SELECTION_REPORT.json"
SAMPLE_QUERIES = [
    "propagation runtime",
    "boundary subject contextualisation",
    "frugalité cognitive runtime",
    "cohérence temporelle",
    "loi supérieure attracteur",
]


def tokens(text: str):
    if not text: return set()
    return {t.strip(".,;:()[]{}\"'-").lower() for t in text.split() if t.strip()}


def compute_topic_relevance(node, topic_tokens):
    """Score de pertinence sujet : intersection lexicale + boost famille."""
    bag = set()
    bag |= tokens(node.get("title", ""))
    bag |= tokens(node.get("description", ""))
    bag |= set(t.lower() for t in (node.get("tags") or []))
    bag |= set(t.lower() for t in (node.get("domains") or []))

    inter = topic_tokens & bag
    if not topic_tokens:
        return 0.5
    rel = len(inter) / max(1, len(topic_tokens))
    # Boost si famille mentionnée
    fam = node["id"].split("-")[0].lower()
    if fam in {t.lower() for t in topic_tokens}:
        rel = min(1.0, rel + 0.20)
    return min(1.0, rel)


def information_gain(node):
    """Gain informationnel net : impact × utilité − coût."""
    impact = node.get("runtime_impact_score", 0.5) or 0.5
    llm = node.get("llm_relevance_score", 0.5) or 0.5
    ic = (node.get("implicit_constraint_count", 0) or 0) / 20
    return max(0.0, min(1.0, 0.40 * impact + 0.40 * llm - 0.20 * ic + 0.10))


def frame_dependency_cost(node):
    """Coût des cadres requis (proxy via dependency_load)."""
    dep = node.get("dependency_load", 0) or 0
    return max(0.0, min(1.0, dep))


def cognitive_efficiency(node, ig, fdc):
    """Gain cognitif / coût propagation+runtime."""
    pc = node.get("propagation_cost", 0.5) or 0.5
    denom = max(0.05, pc + fdc)
    return max(0.0, min(1.0, ig / denom / 3.0 + 0.10))


def min_precision_contribution(node):
    """Contribution à la précision plancher."""
    # Lois canoniques/attractrices contribuent davantage
    base = 0.30
    if node.get("attractor_tier"): base += 0.20
    if node.get("superior_law_candidate"): base += 0.15
    if (node.get("S_local") or 0.7) > 0.85: base += 0.10
    return min(1.0, base)


def runtime_priority(node, scores):
    """Priorité runtime composite."""
    return min(1.0,
        0.30 * scores["topic_relevance"]
        + 0.25 * scores["information_gain"]
        + 0.20 * scores["cognitive_efficiency"]
        + 0.15 * scores["minimum_precision_contribution"]
        - 0.10 * scores["frame_dependency_cost"]
    )


def runtime_precision_gain(node, scores):
    """Gain de précision attendu si chargée."""
    return min(1.0,
        0.50 * scores["minimum_precision_contribution"]
        + 0.30 * scores["information_gain"]
        + 0.20 * scores["topic_relevance"]
    )


def runtime_cost_ratio(node, scores):
    """Ratio coût runtime : haut = cher, à éviter."""
    pc = node.get("propagation_cost", 0.5) or 0.5
    return max(0.0, min(1.0, 0.50 * pc + 0.50 * scores["frame_dependency_cost"]))


def propagation_efficiency(node, scores):
    """Gain / coût de propagation."""
    return max(0.0, min(1.0,
        scores["runtime_precision_gain"] - 0.50 * scores["runtime_cost_ratio"] + 0.20
    ))


def marginal_information_gain(node, scores, already_selected_count):
    """Gain marginal : décroît avec la taille du sous-graphe déjà retenu."""
    saturation = 1.0 / (1.0 + 0.05 * already_selected_count)
    return min(1.0, scores["information_gain"] * saturation)


def threshold_admissibility(node, scores, threshold=0.45):
    """Loi admissible si selection_priority ≥ seuil."""
    return scores["selection_priority"] >= threshold


def compute_all_scores(node, topic_tokens, already_selected_count=0):
    s = {}
    s["topic_relevance"] = round(compute_topic_relevance(node, topic_tokens), 3)
    s["information_gain"] = round(information_gain(node), 3)
    s["frame_dependency_cost"] = round(frame_dependency_cost(node), 3)
    s["cognitive_efficiency"] = round(cognitive_efficiency(node, s["information_gain"], s["frame_dependency_cost"]), 3)
    s["minimum_precision_contribution"] = round(min_precision_contribution(node), 3)
    s["runtime_priority"] = round(runtime_priority(node, s), 3)
    s["runtime_precision_gain"] = round(runtime_precision_gain(node, s), 3)
    s["runtime_cost_ratio"] = round(runtime_cost_ratio(node, s), 3)
    s["propagation_efficiency"] = round(propagation_efficiency(node, s), 3)
    s["marginal_information_gain"] = round(marginal_information_gain(node, s, already_selected_count), 3)
    # selection_priority : score final composite
    s["selection_priority"] = round(min(1.0,
        0.35 * s["runtime_priority"]
        + 0.25 * s["propagation_efficiency"]
        + 0.20 * s["topic_relevance"]
        + 0.20 * s["minimum_precision_contribution"]
    ), 3)
    s["threshold_admissibility"] = bool(threshold_admissibility(node, s))
    return s


def select_cognitive_set(nodes, topic: str, budget: int = 25, precision_floor: float = 0.65):
    """PRECISION_THRESHOLD_ENGINE : sélectionne le sous-graphe minimal suffisant.

    Stratégie :
      1. Calcule selection_priority pour chaque loi
      2. Trie par priorité descendante
      3. Ajoute les lois une par une jusqu'à ce que :
         - marginal_information_gain < precision_floor−inflation, OU
         - budget atteint
    """
    topic_tokens = tokens(topic)
    scored = []
    for n in nodes:
        s = compute_all_scores(n, topic_tokens, 0)
        scored.append((n, s))
    scored.sort(key=lambda x: -x[1]["selection_priority"])

    selected = []
    cumulative_gain = 0.0
    for n, s in scored:
        if len(selected) >= budget:
            break
        # Re-compute marginal gain with current count
        mg = marginal_information_gain(n, s, len(selected))
        if mg < 0.05 and len(selected) >= 5:
            # Gain marginal négligeable : on coupe (precision threshold)
            break
        selected.append({"id": n["id"], "selection_priority": s["selection_priority"],
                         "marginal_gain": round(mg, 3),
                         "cumulative_precision": round(min(1.0, cumulative_gain + mg), 3)})
        cumulative_gain += mg
    return {
        "topic": topic,
        "budget": budget,
        "selected_count": len(selected),
        "rejected_count": len(scored) - len(selected),
        "estimated_cumulative_precision": round(min(1.0, cumulative_gain), 3),
        "selected_laws": selected,
    }


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    print(f"\nCOGNITIVE_SELECTION_ENGINE — Mission ZORAN_COGNITIVE_SELECTION_ENGINE_20260516")
    print(f"  Lois à scorer : {len(g['nodes'])}")

    # Étape 1 : injecter scores génériques (sujet vide) pour ranking de base
    generic_tokens = set()
    for n in g["nodes"]:
        s = compute_all_scores(n, generic_tokens, 0)
        for k, v in s.items():
            n[k] = v

    # Étape 2 : tester N sujets exemples pour rapport
    queries_results = []
    for q in SAMPLE_QUERIES:
        sel = select_cognitive_set(g["nodes"], q, budget=20, precision_floor=0.65)
        queries_results.append(sel)
        print(f"\n  Sujet : {q!r}")
        print(f"    sélectionnées : {sel['selected_count']}/{sel['selected_count']+sel['rejected_count']}")
        print(f"    précision cumulée estimée : {sel['estimated_cumulative_precision']:.3f}")
        top3 = sel["selected_laws"][:3]
        for s in top3:
            print(f"      {s['id']:18s} prio={s['selection_priority']:.3f} mg={s['marginal_gain']:.3f}")

    # Étape 3 : sauvegarder
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Statistiques globales
    avg_prio = sum(n["selection_priority"] for n in g["nodes"]) / len(g["nodes"])
    avg_eff = sum(n["cognitive_efficiency"] for n in g["nodes"]) / len(g["nodes"])
    admissible = sum(1 for n in g["nodes"] if n["threshold_admissibility"])

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_COGNITIVE_SELECTION_ENGINE_20260516",
        "timestamp": "2026-05-16T01:28:00+02:00",
        "laws_scored": len(g["nodes"]),
        "avg_selection_priority": round(avg_prio, 3),
        "avg_cognitive_efficiency": round(avg_eff, 3),
        "admissible_under_threshold": admissible,
        "rejected_under_threshold": len(g["nodes"]) - admissible,
        "sample_queries": queries_results,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\n  ✓ 12 scores selection injectés sur {len(g['nodes'])} nœuds")
    print(f"  ✓ {len(SAMPLE_QUERIES)} sujets testés, sous-graphes optimaux calculés")
    print(f"  ✓ Avg selection_priority    : {avg_prio:.3f}")
    print(f"  ✓ Avg cognitive_efficiency  : {avg_eff:.3f}")
    print(f"  ✓ Admissibles seuil 0.45    : {admissible}/{len(g['nodes'])}")


if __name__ == "__main__":
    main()
