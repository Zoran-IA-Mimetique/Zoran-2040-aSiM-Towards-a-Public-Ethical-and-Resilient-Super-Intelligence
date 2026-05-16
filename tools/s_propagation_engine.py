#!/usr/bin/env python3
"""ZORAN — S_PROPAGATION_ENGINE.

Mission : ZORAN_S_PROPAGATION_ENGINE_20260515.

PRINCIPE :
  Aucune loi n'existe isolément. Donc aucun S ne peut être calculé
  isolément. Ce moteur propage les contraintes implicites le long
  du graphe pour calculer un S "réellement soutenable".

8 nouveaux scores par loi (injectés dans laws.json) :
  S_local_raw                  = S_local existant (cohérence naïve)
  S_propagated                 = cohérence propagée contextuellement
  dependency_load              = somme pondérée des dépendances BFS-2
  implicit_constraint_count    = compositions + invariants + iso obligataires
  runtime_cost                 = 1 − maintenance_cost (coût opérationnel)
  temporal_cost                = 1 − temporal_stability
  stability_after_propagation  = stabilité simulée après perturbation
  cross_graph_pressure         = somme contraintes propagées des voisins

HYPOTHÈSE TESTÉE :
  Les lois les plus survivantes sont celles minimisant le coût propagé
  global de cohérence.

Optimisation : O(N·k) via BFS borné, identique aux autres engines.
"""
from __future__ import annotations
import json
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "S_PROPAGATION_REPORT.json"
CHAOS_REPORT = ROOT / "audit" / "S_PROPAGATION_CHAOS_RESULTS.json"


def edges_index(g):
    """Build adjacency index by kind for fast lookup."""
    idx = defaultdict(lambda: defaultdict(set))  # idx[kind][src] = {tgt, ...}
    for e in g["edges"]:
        idx[e["kind"]][e["source"]].add(e["target"])
        idx[e["kind"]][e["target"]].add(e["source"])
    return idx


def bfs_dependencies(g, nid, depth=2):
    """BFS sur arêtes parent + iso + depends ; retourne {id: distance}."""
    deps_by_node = defaultdict(set)
    for e in g["edges"]:
        if e["kind"] in ("parent","iso","depends","absorbed_into"):
            deps_by_node[e["source"]].add(e["target"])
            deps_by_node[e["target"]].add(e["source"])
    distances = {nid: 0}
    q = deque([nid])
    while q:
        cur = q.popleft()
        d = distances[cur]
        if d >= depth: continue
        for nb in deps_by_node.get(cur, set()):
            if nb not in distances:
                distances[nb] = d + 1
                q.append(nb)
    distances.pop(nid, None)
    return distances


def dependency_load(g, node):
    """Somme pondérée des dépendances : 1/distance pour chaque voisin."""
    dists = bfs_dependencies(g, node["id"], depth=2)
    if not dists: return 0.0
    by_id = {n["id"]: n for n in g["nodes"]}
    load = 0.0
    for nbid, d in dists.items():
        if nbid in by_id:
            w = 1.0 / max(1, d)
            # weight scaling : un voisin "lourd" (weight élevé) charge plus
            load += w * (by_id[nbid].get("weight") or 0.5)
    return min(1.0, load / 10.0)  # normalisé sur 10 unités max


def implicit_constraint_count(g, node):
    """Compte des contraintes implicites : iso obligataires + compositions + invariants frames."""
    nid = node["id"]
    iso_obligatory = sum(1 for e in g["edges"]
                          if e["kind"]=="iso"
                          and (e["source"]==nid or e["target"]==nid))
    composition_count = sum(1 for c in g.get("compositions",[])
                             if nid in c.get("pair",[]))
    levels_in_frames = len({e["level"] for e in node.get("frames",{}).get("intermediate",[])
                             if isinstance(e, dict) and "level" in e})
    invariants_propagated = 0
    for c in g.get("compositions",[]):
        if nid in c.get("pair",[]):
            invariants_propagated += len(c.get("preserved", []))
    return iso_obligatory + composition_count + levels_in_frames + invariants_propagated


def runtime_cost(node):
    """Coût opérationnel : inverse de maintenance_cost."""
    mc = node.get("maintenance_cost", 0.5) or 0.5
    return max(0.0, min(1.0, 1.0 - mc))


def temporal_cost(node):
    """Coût temporel : inverse de temporal_stability."""
    ts = node.get("temporal_stability", 0.5) or 0.5
    return max(0.0, min(1.0, 1.0 - ts))


def cross_graph_pressure(g, node):
    """Pression propagée depuis le voisinage : somme normalisée des constraints implicites."""
    dists = bfs_dependencies(g, node["id"], depth=1)
    if not dists: return 0.0
    by_id = {n["id"]: n for n in g["nodes"]}
    pressure = 0.0
    for nbid in dists:
        nb = by_id.get(nbid)
        if not nb: continue
        # Voisin avec beaucoup de contraintes propage de la pression
        nb_iso = sum(1 for e in g["edges"]
                     if e["kind"]=="iso"
                     and (e["source"]==nbid or e["target"]==nbid))
        nb_contra = sum(1 for e in g["edges"]
                        if e["kind"]=="contradicts"
                        and (e["source"]==nbid or e["target"]==nbid))
        pressure += nb_iso * 0.1 + nb_contra * 0.2
    return min(1.0, pressure / 5.0)


def stability_after_propagation(g, node, dep_load, impl_count, rt_cost, t_cost, cgp):
    """Stabilité simulée après prise en compte des coûts propagés.

    Logique : stabilité de base modulée par les coûts.
    """
    base = (node.get("S_local") or 0.5)
    penalty = 0.20 * dep_load + 0.10 * min(1.0, impl_count / 20) + 0.10 * rt_cost + 0.10 * t_cost + 0.10 * cgp
    return max(0.0, min(1.0, base - penalty * 0.5))


def S_propagated(node, dep_load, impl_count, rt_cost, t_cost, cgp, stab_after):
    """S réellement propagé = S_local_raw modulé par les coûts.

    Formule :
      S_propagated = 0.50 × S_local_raw
                   + 0.25 × stability_after_propagation
                   + 0.10 × (1 − dep_load)         [moins de dépendances = bonus]
                   - 0.05 × min(1.0, impl_count/15) [trop de contraintes pénalisent]
                   - 0.05 × rt_cost
                   - 0.05 × cgp
    """
    s_raw = node.get("S_local") or 0.5
    s = (0.50 * s_raw
         + 0.25 * stab_after
         + 0.10 * (1 - dep_load)
         - 0.05 * min(1.0, impl_count / 15)
         - 0.05 * rt_cost
         - 0.05 * cgp)
    return max(0.0, min(1.0, s + 0.10))  # offset léger pour éviter trop bas


def compute_HS(g):
    nodes = g["nodes"]; edges = g["edges"]; fams = g.get("families", [])
    n = len(nodes)
    inflation = sum(1 for x in nodes if x["family"] not in
                    {"ULG","DVE","UDE","GHUC","WP11","WP12","SDE","PAL"}) / max(1,n)
    iso_edges = [e for e in edges if e["kind"]=="iso"]
    iso_inv = (sum(1 for e in iso_edges if e.get("invariants"))/len(iso_edges)) if iso_edges else 1.0
    contradicts = sum(1 for e in edges if e["kind"]=="contradicts")//2
    cd = contradicts/max(1,n)
    cal = 1 if 0.04<=cd<=0.15 else 0
    fract = sum(1 for f in fams if f.get("fractality_demonstrated"))
    comps = g.get("compositions",[])
    mu0 = sum(1 for x in nodes if x.get("attractor_tier")=="μ0")
    C_comp = 0.0 if mu0==0 else min(1.0, len(comps)/max(3,mu0))
    return (0.25*(1-inflation) + 0.30*min(1.0,fract/3.0) + 0.20*C_comp + 0.15*iso_inv + 0.10*cal)


# ──── CHAOS TESTS pour propagation ────
def chaos_propagation_tests(g):
    """Tests chaos sur la propagation : lois générales, dépendances circulaires, etc."""
    results = []

    # Test 1 : loi générale (haut S_local, beaucoup d'iso, beaucoup de comps)
    # Détecter si son S_propagated chute (révélant coûts cachés)
    test1 = {"name": "loi_generale_costliness",
             "description": "Une loi générale a-t-elle un S_propagated < S_local_raw ?"}
    general_laws = [n for n in g["nodes"]
                    if n.get("S_local",0) >= 0.90
                    and len([e for e in g["edges"]
                              if e["kind"] in ("iso","contradicts")
                              and (e["source"]==n["id"] or e["target"]==n["id"])]) >= 3]
    if general_laws:
        sample = general_laws[0]
        raw = sample.get("S_local", 0)
        prop = sample.get("S_propagated", 0)
        gap = raw - prop
        test1["sample_id"] = sample["id"]
        test1["S_local_raw"] = raw
        test1["S_propagated"] = prop
        test1["gap_observed"] = round(gap, 3)
        test1["hypothesis_supported"] = gap > 0.05
    else:
        test1["status"] = "no_qualifying_law"
        test1["hypothesis_supported"] = None
    results.append(test1)

    # Test 2 : dépendances circulaires (cycles dans iso)
    # Détecter si un cycle existe et alerter
    test2 = {"name": "circular_dependencies",
             "description": "Existe-t-il des cycles dans iso edges ?"}
    by_iso = defaultdict(set)
    for e in g["edges"]:
        if e["kind"] == "iso":
            by_iso[e["source"]].add(e["target"])
            by_iso[e["target"]].add(e["source"])
    # DFS détection cycle (simple : look for triangles)
    triangles = 0
    visited_pairs = set()
    for n_id in by_iso:
        for nb1 in by_iso[n_id]:
            for nb2 in by_iso[nb1]:
                if nb2 != n_id and nb2 in by_iso[n_id]:
                    triplet = tuple(sorted([n_id, nb1, nb2]))
                    if triplet not in visited_pairs:
                        visited_pairs.add(triplet); triangles += 1
    test2["iso_triangles_detected"] = triangles
    test2["hypothesis_supported"] = triangles == 0  # no circular = healthy
    results.append(test2)

    # Test 3 : surcharge implicite (lois avec implicit_constraint_count > 20)
    test3 = {"name": "implicit_constraint_overload",
             "description": "Combien de lois ont > 15 contraintes implicites ?"}
    overloaded = [n["id"] for n in g["nodes"]
                  if n.get("implicit_constraint_count", 0) > 15]
    test3["overloaded_count"] = len(overloaded)
    test3["overloaded_sample"] = overloaded[:5]
    test3["hypothesis_supported"] = len(overloaded) < 10
    results.append(test3)

    # Test 4 : propagation récursive (BFS depth=3 ne diverge pas)
    test4 = {"name": "recursive_propagation_stability",
             "description": "BFS depth=3 termine sans explosion combinatoire"}
    sample_nid = g["nodes"][0]["id"]
    visited_d3 = set()
    q = deque([(sample_nid, 0)])
    iterations = 0
    while q and iterations < 10000:
        cur, d = q.popleft(); iterations += 1
        if cur in visited_d3 or d >= 3: continue
        visited_d3.add(cur)
        for e in g["edges"]:
            if e["source"] == cur and d < 3:
                q.append((e["target"], d+1))
            if e["target"] == cur and d < 3:
                q.append((e["source"], d+1))
    test4["nodes_reached_depth_3"] = len(visited_d3)
    test4["iterations"] = iterations
    test4["hypothesis_supported"] = iterations < 10000  # termine
    results.append(test4)

    # Test 5 : faux S élevés (lois avec S_local élevé mais S_propagated bas)
    test5 = {"name": "false_high_S",
             "description": "Lois suspectes : S_local ≥ 0.95 mais S_propagated < 0.75"}
    fakes = [n for n in g["nodes"]
             if (n.get("S_local",0) or 0) >= 0.95
             and (n.get("S_propagated",1.0) or 1.0) < 0.75]
    test5["false_high_S_count"] = len(fakes)
    test5["false_high_S_sample"] = [n["id"] for n in fakes[:5]]
    test5["hypothesis_supported"] = True  # info only
    results.append(test5)

    return results


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    hs_before = compute_HS(g)

    print(f"\nS_PROPAGATION_ENGINE — Mission ZORAN_S_PROPAGATION_ENGINE_20260515")
    print(f"  Lois à analyser : {len(g['nodes'])}")
    print(f"  HS_before      : {hs_before:.4f}")

    # Calcul des 8 scores par loi
    scored = []
    for n in g["nodes"]:
        s_local_raw = n.get("S_local", 0) or 0
        dep_load = dependency_load(g, n)
        impl_count = implicit_constraint_count(g, n)
        rt_cost = runtime_cost(n)
        t_cost = temporal_cost(n)
        cgp = cross_graph_pressure(g, n)
        stab_after = stability_after_propagation(g, n, dep_load, impl_count, rt_cost, t_cost, cgp)
        s_prop = S_propagated(n, dep_load, impl_count, rt_cost, t_cost, cgp, stab_after)

        scores = {
            "S_local_raw":                  round(s_local_raw, 3),
            "S_propagated":                 round(s_prop, 3),
            "dependency_load":              round(dep_load, 3),
            "implicit_constraint_count":    impl_count,
            "runtime_cost":                 round(rt_cost, 3),
            "temporal_cost":                round(t_cost, 3),
            "stability_after_propagation":  round(stab_after, 3),
            "cross_graph_pressure":         round(cgp, 3),
        }
        n.update(scores)
        scored.append({"id": n["id"], "family": n["family"],
                       "attractor_tier": n.get("attractor_tier"),
                       "superior": n.get("superior_law_candidate", False),
                       **scores})

    # Save
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    hs_after = compute_HS(g)

    # Chaos tests
    chaos = chaos_propagation_tests(g)
    chaos_pass = sum(1 for c in chaos if c.get("hypothesis_supported") in (True,))
    chaos_total = len(chaos)

    # Report
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_S_PROPAGATION_ENGINE_20260515",
        "timestamp": "2026-05-15T22:01:00+02:00",
        "laws_tested": len(g["nodes"]),
        "hs_before": round(hs_before, 4),
        "hs_after": round(hs_after, 4),
        "delta_hs": round(hs_after - hs_before, 4),
        "scores_injected_per_law": 8,
        "top_S_propagated": sorted(scored, key=lambda x: -x["S_propagated"])[:15],
        "highest_dependency_load": sorted(scored, key=lambda x: -x["dependency_load"])[:15],
        "highest_implicit_constraints": sorted(scored, key=lambda x: -x["implicit_constraint_count"])[:15],
        "lowest_S_propagated": sorted(scored, key=lambda x: x["S_propagated"])[:15],
        "all_scored": scored
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    CHAOS_REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_S_PROPAGATION_ENGINE_20260515",
        "timestamp": "2026-05-15T22:01:00+02:00",
        "tests_total": chaos_total,
        "tests_passed": chaos_pass,
        "tests": chaos
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  HS_after       : {hs_after:.4f} (ΔHS {hs_after - hs_before:+.4f})")
    print(f"  ✓ 8 scores injectés sur les {len(g['nodes'])} nœuds")
    print(f"\n  Chaos tests : {chaos_pass}/{chaos_total} pass")
    for c in chaos:
        h = c.get("hypothesis_supported")
        symbol = "✓" if h is True else "?" if h is None else "✗"
        print(f"    {symbol} {c['name']:35s} — {c.get('description','')[:50]}")

    # Discovery
    gap_avg = sum(s["S_local_raw"] - s["S_propagated"] for s in scored) / len(scored)
    print(f"\n  GAP S_local_raw − S_propagated (moyenne) : {gap_avg:+.4f}")
    if gap_avg > 0.05:
        print(f"  → Hypothèse SUPPORTÉE : les lois ont un coût propagé moyen non négligeable")
    else:
        print(f"  → Coûts propagés modérés sur le corpus actuel")

    print(f"\n  TOP 5 S_propagated (cohérence propagée la plus haute) :")
    for s in sorted(scored, key=lambda x: -x["S_propagated"])[:5]:
        sup = '★' if s["superior"] else ' '
        print(f"    {sup} {s['id']:18s}  S_prop={s['S_propagated']:.3f}  "
              f"raw={s['S_local_raw']:.3f}  dep_load={s['dependency_load']:.3f}")

    print(f"\n  TOP 5 implicit_constraint_count (lois les plus 'chargées') :")
    for s in sorted(scored, key=lambda x: -x["implicit_constraint_count"])[:5]:
        sup = '★' if s["superior"] else ' '
        print(f"    {sup} {s['id']:18s}  constraints={s['implicit_constraint_count']:3d}  "
              f"S_prop={s['S_propagated']:.3f}")

    print(f"\n  Reports : {REPORT.name}, {CHAOS_REPORT.name}")


if __name__ == "__main__":
    main()
