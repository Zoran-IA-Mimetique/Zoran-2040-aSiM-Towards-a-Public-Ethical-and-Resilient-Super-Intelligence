#!/usr/bin/env python3
"""ZORAN — LAW_RELEVANCE_INDEX_ENGINE.

Mission : ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516.

Calcule la pertinence réelle de chaque loi et détermine son destin :
  canonical / runtime_candidate / sandbox / archive / purge_candidate

8 nouveaux scores :
  law_relevance_index       : pertinence globale composite
  runtime_usefulness        : utilité runtime nette
  propagation_efficiency_v2 : gain / coût propagé (re-calculé)
  temporal_survival         : déjà calculé, normalisé
  cross_domain_relevance    : utilité cross-domaine
  anti_hallucination_value  : capacité à empêcher dérive LLM
  structural_uniqueness     : unicité structurelle (anti-redondance)
  keep_probability          : probabilité finale de conservation

Seuils LAW_RETENTION_THRESHOLDS :
  ≥ 0.80 : canonical
  0.60–0.80 : runtime_candidate
  0.40–0.60 : sandbox
  0.20–0.40 : archive
  < 0.20    : purge_candidate
"""
from __future__ import annotations
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "LAW_RELEVANCE_INDEX_REPORT.json"


def structural_uniqueness(node, all_nodes_map, edges):
    """Calcule l'unicité structurelle : combien de lois proches sémantiquement."""
    fam = node["id"].split("-")[0]
    same_fam = sum(1 for n in all_nodes_map.values() if n["id"].split("-")[0] == fam)
    # Plus la famille est grande, moins le nœud est unique structurellement
    return max(0.0, min(1.0, 1.0 - (same_fam - 1) / 50))


def cross_domain_relevance(node):
    """Pertinence cross-domaines : utile si > 1 domaine."""
    domains = node.get("domains") or []
    if len(domains) >= 3: return 0.85
    if len(domains) == 2: return 0.65
    if len(domains) == 1: return 0.45
    return 0.30


def anti_hallucination_value(node):
    """Capacité anti-hallucination LLM (boundary/contradicts)."""
    base = node.get("anti_hallucination_score") or 0.40
    if node.get("kind") in ("boundary", "contradicts"): base += 0.20
    return min(1.0, base)


def propagation_efficiency_v2(node):
    """V2 : gain / coût propagé."""
    impact = node.get("runtime_impact_score") or 0.5
    pc = max(0.05, node.get("propagation_cost") or 0.5)
    return max(0.0, min(1.0, (impact / pc) / 4 + 0.10))


def runtime_usefulness(node, scores):
    """Utilité runtime nette."""
    return min(1.0,
        0.35 * (node.get("velocity_score") or 0.4)
        + 0.25 * scores["propagation_efficiency_v2"]
        + 0.20 * scores["anti_hallucination_value"]
        + 0.20 * (node.get("frugality_score") or 0.5)
    )


def law_relevance_index(node, scores):
    """Index composite final."""
    return max(0.0, min(1.0,
        0.25 * scores["runtime_usefulness"]
        + 0.20 * scores["propagation_efficiency_v2"]
        + 0.15 * (node.get("temporal_survival") or 0.5)
        + 0.15 * scores["cross_domain_relevance"]
        + 0.10 * scores["anti_hallucination_value"]
        + 0.10 * scores["structural_uniqueness"]
        + 0.05 * (node.get("llm_relevance_score") or 0.5)
    ))


def keep_probability(node, lri):
    """Proba finale de conservation, avec bonus structurels."""
    p = lri
    if node.get("superior_law_candidate"): p += 0.10
    if node.get("attractor_tier") == "fondateur": p += 0.15
    if (node.get("experimental_classes") or []) == ["toxique_propagationnelle"]: p -= 0.20
    return max(0.0, min(1.0, p))


def retention_status(kp):
    """LAW_RETENTION_THRESHOLDS."""
    if kp >= 0.80: return "canonical"
    if kp >= 0.60: return "runtime_candidate"
    if kp >= 0.40: return "sandbox"
    if kp >= 0.20: return "archive"
    return "purge_candidate"


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = g["nodes"]
    edges = g.get("edges") or g.get("links") or []
    nodes_map = {n["id"]: n for n in nodes}

    print(f"\nLAW_RELEVANCE_INDEX_ENGINE — Mission ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516")
    print(f"  Lois à scorer : {len(nodes)}")

    retention_counts = Counter()
    all_scores = []
    for node in nodes:
        scores = {}
        scores["structural_uniqueness"] = round(structural_uniqueness(node, nodes_map, edges), 3)
        scores["cross_domain_relevance"] = round(cross_domain_relevance(node), 3)
        scores["anti_hallucination_value"] = round(anti_hallucination_value(node), 3)
        scores["propagation_efficiency_v2"] = round(propagation_efficiency_v2(node), 3)
        scores["runtime_usefulness"] = round(runtime_usefulness(node, scores), 3)
        scores["temporal_survival"] = node.get("temporal_survival") or 0.5
        scores["law_relevance_index"] = round(law_relevance_index(node, scores), 3)
        scores["keep_probability"] = round(keep_probability(node, scores["law_relevance_index"]), 3)
        scores["retention_status"] = retention_status(scores["keep_probability"])

        for k, v in scores.items():
            node[k] = v
        retention_counts[scores["retention_status"]] += 1
        all_scores.append({"id": node["id"], **scores})

    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    avg_lri = sum(s["law_relevance_index"] for s in all_scores) / len(all_scores)
    avg_kp = sum(s["keep_probability"] for s in all_scores) / len(all_scores)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516",
        "timestamp": "2026-05-16T02:04:00+02:00",
        "laws_scored": len(nodes),
        "retention_distribution": dict(retention_counts),
        "avg_law_relevance_index": round(avg_lri, 3),
        "avg_keep_probability": round(avg_kp, 3),
        "all_scores": all_scores,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  ✓ 8 scores relevance injectés sur {len(nodes)} lois")
    print(f"  Distribution retention :")
    for status in ["canonical", "runtime_candidate", "sandbox", "archive", "purge_candidate"]:
        c = retention_counts[status]
        pct = 100 * c / len(nodes)
        print(f"    {status:20s}: {c:3d} ({pct:5.1f}%)")
    print(f"  Avg law_relevance_index : {avg_lri:.3f}")
    print(f"  Avg keep_probability    : {avg_kp:.3f}")


if __name__ == "__main__":
    main()
