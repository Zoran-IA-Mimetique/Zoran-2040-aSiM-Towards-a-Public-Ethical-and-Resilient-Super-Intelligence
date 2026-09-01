#!/usr/bin/env python3
"""Compute topological weights and structural rank for every law.

Per ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3 mission. Idempotent : peut
être relancé sans casser l'état.

Adds 5 fields per node :
  - hierarchical_depth
  - topological_weight
  - visual_weight
  - runtime_weight
  - structural_rank
  - _fy (forced Y position for the layout)
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
HEALTH = ROOT / "audit" / "HIERARCHY_AUDIT_REPORT.json"


def parents_of(graph, node_id):
    return [e["target"] for e in graph["edges"]
            if e["kind"] == "parent" and e["source"] == node_id]


def children_of(graph, node_id):
    return [e["source"] for e in graph["edges"]
            if e["kind"] == "parent" and e["target"] == node_id]


def hierarchical_depth_of(graph, node_id, memo):
    if node_id in memo:
        return memo[node_id]
    parents = parents_of(graph, node_id)
    if not parents:
        memo[node_id] = 0
    else:
        memo[node_id] = 1 + min(hierarchical_depth_of(graph, p, memo) for p in parents)
    return memo[node_id]


def compositions_count_of(graph, node_id):
    composes = set()
    parents = parents_of(graph, node_id)
    composes.update(parents)
    for p in parents:
        composes.update(parents_of(graph, p))
        for sib in children_of(graph, p):
            if sib != node_id: composes.add(sib)
    composes.update(children_of(graph, node_id))
    for e in graph["edges"]:
        if e["kind"] in ("iso","contradicts","related","absorbed_into","depends"):
            if e["source"] == node_id: composes.add(e["target"])
            if e["target"] == node_id: composes.add(e["source"])
    for c in graph.get("compositions", []):
        if node_id in c.get("pair", []):
            for p in c["pair"]:
                if p != node_id: composes.add(p)
    composes.discard(node_id)
    return len(composes)


def fractal_families_set(graph):
    return {f["id"] for f in graph["families"] if f.get("fractality_demonstrated")}


def topological_weight_of(node, comps, n_children, fractal_fams):
    tier_factor = (1.0 if node.get("attractor_tier") in ("μ0","μ1")
                   else 0.5 if node.get("canonical") else 0.2)
    fractal_factor = 1.0 if node["family"] in fractal_fams else 0.5
    w = (
        0.30 * min(1.0, comps / 10)
        + 0.25 * tier_factor
        + 0.20 * min(1.0, n_children / 5)
        + 0.15 * (node.get("weight") or 0)
        + 0.10 * fractal_factor
    )
    return max(0.0, min(1.0, w))


def visual_weight_of(top_w):
    return max(0.12, min(0.82, 0.7 * top_w + 0.12))


def runtime_weight_of(node, top_w):
    tier_runtime = 1.0 if node.get("attractor_tier") in ("μ0","μ1") else 0.4
    rt_admiss = 1.0 if node.get("runtime_admissible", True) else 0.0
    w = 0.5 * rt_admiss + 0.3 * top_w + 0.2 * tier_runtime
    return max(0.0, min(1.0, w))


def structural_rank_of(node, comps, depth, fractal_fams):
    rank = 0
    tier = node.get("attractor_tier")
    if tier == "μ0":  rank += 100
    elif tier == "μ1": rank += 60

    if node.get("canonical"):
        rank += 40 if depth == 0 else 20

    if comps >= 7:   rank += 10
    elif comps >= 5: rank += 5
    elif comps >= 3: rank += 2

    if node["family"] in fractal_fams and depth <= 1:
        rank += 10

    stab = node.get("stability")
    if stab == "instable": rank -= 10
    elif stab == "absorbée": rank -= 20

    rank -= 5 * depth
    rank += 5 * (node.get("weight") or 0)
    return rank


def y_target_from_rank(rank, node_id):
    base = -200 + rank * 2.5
    jitter = (hash(node_id) % 30) - 15
    y = base + jitter
    return max(-280, min(280, y))


def main() -> int:
    graph = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = graph["nodes"]
    fractal_fams = fractal_families_set(graph)
    depth_memo = {}

    for n in nodes:
        d = hierarchical_depth_of(graph, n["id"], depth_memo)
        comps = compositions_count_of(graph, n["id"])
        n_kids = len(children_of(graph, n["id"]))
        top_w = topological_weight_of(n, comps, n_kids, fractal_fams)
        vis_w = visual_weight_of(top_w)
        rt_w = runtime_weight_of(n, top_w)
        rank = structural_rank_of(n, comps, d, fractal_fams)
        fy = y_target_from_rank(rank, n["id"])

        n["hierarchical_depth"] = d
        n["topological_weight"] = round(top_w, 3)
        n["visual_weight"] = round(vis_w, 3)
        n["runtime_weight"] = round(rt_w, 3)
        n["structural_rank"] = round(rank, 1)
        n["_fy"] = round(fy, 1)
        n["_compositions_count"] = comps

    DATA.write_text(json.dumps(graph, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Health audit
    Y_max = max(n["_fy"] for n in nodes)
    Y_min = min(n["_fy"] for n in nodes)
    amplitude = Y_max - Y_min
    mu0_ys = [n["_fy"] for n in nodes if n.get("attractor_tier") == "μ0"]
    mu1_ys = [n["_fy"] for n in nodes if n.get("attractor_tier") == "μ1"]
    leaf_ys = [n["_fy"] for n in nodes if n.get("hierarchical_depth", 0) >= 2]
    mu0_avg = sum(mu0_ys)/max(1,len(mu0_ys))
    mu1_avg = sum(mu1_ys)/max(1,len(mu1_ys))
    leaf_avg = sum(leaf_ys)/max(1,len(leaf_ys))
    vert_coef = (mu0_avg - leaf_avg) / max(1, amplitude) if amplitude > 0 else 0

    rank_dist = defaultdict(int)
    for n in nodes:
        rank_dist[int(n["structural_rank"]) // 20 * 20] += 1

    family_in_canopy = defaultdict(int)
    for n in nodes:
        if n["_fy"] >= 100:
            family_in_canopy[n["family"]] += 1

    canopy_count = sum(family_in_canopy.values())
    dominant_family = None
    if canopy_count > 0:
        max_fam = max(family_in_canopy.items(), key=lambda x: x[1])
        if max_fam[1] / canopy_count > 0.40:
            dominant_family = max_fam[0]

    false_centrality = sum(1 for n in nodes
                            if n["_fy"] > 150
                            and n.get("attractor_tier") not in ("μ0","μ1"))
    inflation = sum(1 for n in nodes
                     if n["topological_weight"] > 0.85
                     and not n.get("canonical"))

    verdict = "green"
    if vert_coef < 0.60: verdict = "red"
    elif false_centrality > 0 or inflation > 0 or dominant_family: verdict = "yellow"

    health = {
        "mission_id": "ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515",
        "timestamp": "2026-05-15T20:39:00+02:00",
        "nodes_count": len(nodes),
        "Y_max": Y_max, "Y_min": Y_min, "amplitude": amplitude,
        "mu0_avg_Y": round(mu0_avg, 1),
        "mu1_avg_Y": round(mu1_avg, 1),
        "leaf_avg_Y": round(leaf_avg, 1),
        "verticality_coefficient": round(vert_coef, 3),
        "rank_distribution": dict(sorted(rank_dist.items())),
        "canopy_count": canopy_count,
        "family_in_canopy": dict(family_in_canopy),
        "dominant_family_in_canopy": dominant_family,
        "false_centrality_count": false_centrality,
        "inflation_count": inflation,
        "verdict": verdict,
        "fractal_families": list(fractal_fams)
    }
    HEALTH.parent.mkdir(parents=True, exist_ok=True)
    HEALTH.write_text(json.dumps(health, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Computed topology weights for {len(nodes)} nodes.")
    print(f"  Y_amplitude        : {amplitude:.0f}")
    print(f"  Y_max (mu0 avg)    : {mu0_avg:.0f}")
    print(f"  Y_min (leaf avg)   : {leaf_avg:.0f}")
    print(f"  verticality coef   : {vert_coef:.3f} (cible ≥ 0.60)")
    print(f"  fractal families   : {len(fractal_fams)}")
    print(f"  false centrality   : {false_centrality}")
    print(f"  inflation count    : {inflation}")
    print(f"  dominant in canopy : {dominant_family}")
    print(f"  VERDICT            : {verdict}")
    print(f"  audit report       : {HEALTH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
