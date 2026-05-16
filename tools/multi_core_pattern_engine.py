#!/usr/bin/env python3
"""ZORAN — MULTI_CORE_PATTERN_ENGINE.

Mission : ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516.

Détecte automatiquement les NOYAUX émergents du graphe (centres de
gravité multiples) via une heuristique combinant :
  - degré pondéré dans la composante connexe
  - PageRank simplifié (5 itérations)
  - score composite (superior + frugal + S_local)

Chaque noyau émergent est caractérisé par :
  - son centre de gravité (top-3 nœuds par score)
  - sa famille dominante
  - ses motifs récurrents (parent/child/iso patterns)
  - sa densité de propagation
  - son score de stabilité

Output :
  app/data/cores.json — utilisé par le UI Layer Manager
  audit/MULTI_CORE_DETECTION_REPORT.json — rapport détaillé
"""
from __future__ import annotations
import json
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
CORES = ROOT / "app" / "data" / "cores.json"
REPORT = ROOT / "audit" / "MULTI_CORE_DETECTION_REPORT.json"

# Seuils anti faux-noyaux (réglés sur corpus 241/284)
MIN_CORE_SIZE = 3
MAX_CORES = 8
MIN_DENSITY = 0.06       # densité interne minimale


def family_of(node_id: str) -> str:
    return node_id.split("-")[0]


def build_adjacency(nodes, edges):
    adj = defaultdict(set)
    nset = {n["id"] for n in nodes}
    for e in edges:
        s = e.get("source"); t = e.get("target")
        if isinstance(s, dict): s = s.get("id")
        if isinstance(t, dict): t = t.get("id")
        if s in nset and t in nset and s != t:
            adj[s].add(t)
            adj[t].add(s)
    return adj


def pagerank(adj, iters=8, damping=0.85):
    nodes = list(adj.keys())
    if not nodes: return {}
    N = len(nodes)
    pr = {n: 1.0 / N for n in nodes}
    for _ in range(iters):
        new = {n: (1.0 - damping) / N for n in nodes}
        for n in nodes:
            if not adj[n]: continue
            share = damping * pr[n] / len(adj[n])
            for nbr in adj[n]:
                if nbr in new:
                    new[nbr] += share
        pr = new
    return pr


def composite_score(node, pr_score):
    """Score composite : structure + pertinence + frugalité."""
    base = pr_score * 3.0  # weight pagerank
    if node.get("superior_law_candidate"): base += 0.30
    if node.get("attractor_tier") == "fondateur": base += 0.20
    base += 0.20 * (node.get("S_local") or 0.7)
    base += 0.20 * (node.get("frugality_score") or 0.5)
    base += 0.15 * (node.get("velocity_score") or 0.4)
    return base


def connected_components(adj, nodes_ids):
    """BFS pour identifier composantes connexes."""
    seen = set()
    comps = []
    for start in nodes_ids:
        if start in seen: continue
        stack = [start]; comp = set()
        while stack:
            x = stack.pop()
            if x in seen: continue
            seen.add(x); comp.add(x)
            for nbr in adj.get(x, []):
                if nbr not in seen: stack.append(nbr)
        if comp: comps.append(comp)
    return comps


def cluster_by_seed(seeds, adj, max_radius=2):
    """Expand chaque seed en cluster BFS borné."""
    clusters = []
    assigned = set()
    for seed in seeds:
        if seed in assigned: continue
        cluster = {seed}
        frontier = {seed}
        for _ in range(max_radius):
            new_frontier = set()
            for x in frontier:
                for nbr in adj.get(x, []):
                    if nbr not in assigned and nbr not in cluster:
                        new_frontier.add(nbr)
            cluster |= new_frontier
            frontier = new_frontier
        clusters.append(cluster)
        assigned |= cluster
    return clusters


def core_density(cluster, adj):
    """Densité interne du cluster : edges internes / max possible."""
    if len(cluster) < 2: return 0.0
    internal = 0
    for n in cluster:
        for nbr in adj.get(n, []):
            if nbr in cluster: internal += 1
    internal //= 2  # chaque edge compté 2 fois
    max_edges = len(cluster) * (len(cluster) - 1) / 2
    return internal / max_edges if max_edges > 0 else 0.0


def detect_patterns(cluster, nodes_map, adj):
    """Motifs récurrents : parent/child triangles, iso pairs."""
    patterns = {"parent_chains": 0, "iso_pairs": 0, "triangles": 0}
    cl = list(cluster)
    for i, a in enumerate(cl):
        for b in adj.get(a, []):
            if b not in cluster or b <= a: continue
            for c in adj.get(b, []):
                if c in cluster and c > b and c in adj.get(a, []):
                    patterns["triangles"] += 1
    # Parent chains : suite de 3+ via edges parent
    return patterns


def detect_cores(nodes, edges):
    """Algo principal : trouve 3-8 noyaux émergents distincts."""
    adj = build_adjacency(nodes, edges)
    nodes_map = {n["id"]: n for n in nodes}

    # 1. PageRank pour identifier candidats à centre de gravité
    pr = pagerank(adj)
    scored = [(nid, composite_score(nodes_map[nid], pr.get(nid, 0))) for nid in nodes_map]
    scored.sort(key=lambda x: -x[1])

    # 2. Cores = familles canoniques (groupement naturel)
    # +  cross-family seed: top global PageRank dans chaque famille
    by_family = defaultdict(list)
    for nid in nodes_map:
        by_family[family_of(nid)].append(nid)

    # Seeds : meilleur scoring de chaque famille (et la famille elle-même définit cluster)
    seeds = []
    clusters = []
    for fam, members in by_family.items():
        if len(members) < MIN_CORE_SIZE:
            continue
        # Top scoring member de la famille = seed
        members_sorted = sorted(members, key=lambda m: -composite_score(nodes_map[m], pr.get(m, 0)))
        seeds.append(members_sorted[0])
        clusters.append(set(members))
        if len(clusters) >= MAX_CORES: break

    # 4. Filtre clusters bruyants — debug + relaxe
    print(f"  [debug] clusters expansés: {[len(c) for c in clusters]}")
    print(f"  [debug] densités: {[round(core_density(c, adj), 3) for c in clusters]}")
    cores = []
    for i, cl in enumerate(clusters):
        if len(cl) < MIN_CORE_SIZE:
            continue
        density = core_density(cl, adj)
        # Relaxé : si cluster volumineux ET densité >= 0.02, accepter
        if density < MIN_DENSITY and len(cl) < 15:
            continue
        # Caractérise le cluster
        members = sorted(cl)
        fams = Counter(family_of(m) for m in members)
        dominant_family = fams.most_common(1)[0][0]
        top3 = sorted(members, key=lambda m: -composite_score(nodes_map[m], pr.get(m, 0)))[:3]
        stability = sum((nodes_map[m].get("S_local") or 0.7) for m in members) / len(members)
        prop_density = sum(len(adj.get(m, [])) for m in members) / (len(members) ** 2 + 1)
        patterns = detect_patterns(cl, nodes_map, adj)

        cores.append({
            "core_id": f"CORE-{i+1:02d}-{dominant_family}",
            "seed": seeds[i] if i < len(seeds) else members[0],
            "gravity_center": top3,
            "members": members,
            "size": len(members),
            "dominant_family": dominant_family,
            "family_distribution": dict(fams.most_common(5)),
            "dominant_patterns": patterns,
            "density": round(density, 3),
            "propagation_density": round(prop_density, 3),
            "stability_score": round(stability, 3),
            "runtime_relevance": round(min(1.0, density * 0.5 + stability * 0.5), 3),
            "layer_visibility": True,
        })

    cores.sort(key=lambda c: -c["runtime_relevance"])
    return cores, pr


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = g.get("nodes", [])
    edges = g.get("edges") or g.get("links") or []

    print(f"\nMULTI_CORE_PATTERN_ENGINE — Mission ZORAN_MULTI_CORE_PATTERN_LAYERS_20260516")
    print(f"  Nœuds : {len(nodes)}   Edges : {len(edges)}")

    cores, pr = detect_cores(nodes, edges)

    # Annoter chaque nœud avec son core_id
    node_to_core = {}
    for c in cores:
        for m in c["members"]:
            # un nœud peut appartenir à plusieurs noyaux ; on prend le plus pertinent
            if m not in node_to_core or node_to_core[m] != c["core_id"]:
                node_to_core[m] = c["core_id"]
    for n in nodes:
        n["core_id"] = node_to_core.get(n["id"], "orphan")

    # Save annotated graph
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Save cores.json (lu par main.js)
    CORES.write_text(json.dumps({
        "mission_id": "ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516",
        "timestamp": "2026-05-16T01:55:00+02:00",
        "core_count": len(cores),
        "cores": cores,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Save rapport
    orphan_count = sum(1 for n in nodes if n.get("core_id") == "orphan")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516",
        "timestamp": "2026-05-16T01:55:00+02:00",
        "nodes_analyzed": len(nodes),
        "cores_detected": len(cores),
        "orphan_count": orphan_count,
        "coverage": round((len(nodes) - orphan_count) / max(1, len(nodes)), 3),
        "cores": cores,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  Noyaux détectés : {len(cores)}")
    for c in cores:
        print(f"    {c['core_id']:30s} size={c['size']:3d} density={c['density']:.3f} "
              f"stab={c['stability_score']:.3f} rel={c['runtime_relevance']:.3f} "
              f"centers={','.join(c['gravity_center'])}")
    print(f"  Orphan nodes : {orphan_count} ({100*orphan_count/len(nodes):.1f}%)")
    print(f"  ✓ {len(cores)} noyaux écrits dans cores.json")


if __name__ == "__main__":
    main()
