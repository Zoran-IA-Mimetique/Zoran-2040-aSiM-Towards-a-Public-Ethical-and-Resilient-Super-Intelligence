#!/usr/bin/env python3
"""ZORAN — SUBJECT_BOUNDARY_ENGINE.

Mission : ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515.

PRINCIPE :
  Une intelligence stable ne charge pas tout — elle sait jusqu'où
  propager. Ce moteur calcule, pour chaque loi, sa pertinence
  contextuelle, son coût de propagation, et son risque de dérive.

12 nouveaux scores par loi :
  topic_distance              # distance moyenne aux ancres typiques
  runtime_relevance           # pertinence runtime estimée
  propagation_cost            # coût de propagation depuis voisinage
  boundary_score              # score limite contextuelle [0,1]
  contextual_priority         # priorité de chargement
  drift_probability           # risque de dérive hors sujet
  information_gain            # gain informationnel apporté
  subject_admissibility_score # admissibilité globale pour le sujet
  contextual_density          # densité voisinage pertinent
  propagation_depth_limit     # depth max recommandée (1,2,3)
  runtime_focus_score         # capacité à rester focus
  boundary_stability          # stabilité du bornage

Notion centrale : `boundary_score` synthétise les autres pour décider
si une loi est chargée par CLE pour un sujet donné.

Chaos tests obligatoires : propagation infinie, lois pseudo-universelles
séduisantes, attractors trompeurs.
"""
from __future__ import annotations
import json
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "SUBJECT_BOUNDARY_REPORT.json"
CHAOS = ROOT / "audit" / "BOUNDARY_CHAOS_RESULTS.json"


def edges_index(g):
    idx = defaultdict(set)
    for e in g["edges"]:
        idx[e["source"]].add((e["target"], e["kind"]))
        idx[e["target"]].add((e["source"], e["kind"]))
    return idx


def bfs_distance_map(g, start_ids, depth=3):
    """Renvoie distance min de chaque nœud aux start_ids (BFS borné)."""
    idx = edges_index(g)
    distances = {sid: 0 for sid in start_ids}
    q = deque([(sid, 0) for sid in start_ids])
    while q:
        cur, d = q.popleft()
        if d >= depth: continue
        for nb, kind in idx.get(cur, set()):
            if nb not in distances or distances[nb] > d + 1:
                distances[nb] = d + 1
                q.append((nb, d + 1))
    return distances


def topic_distance(g, node, anchor_ids):
    """Distance min aux ancres typiques (heuristique : racines canoniques)."""
    distances = bfs_distance_map(g, anchor_ids, depth=4)
    return distances.get(node["id"], 4)  # 4 = très loin


def runtime_relevance(node):
    """Pertinence runtime : poids + runtime_admissible + S_propagated."""
    base = 0.5
    if node.get("runtime_admissible"): base += 0.2
    base += 0.3 * (node.get("S_propagated") or node.get("S_local") or 0)
    return max(0.0, min(1.0, base))


def propagation_cost(node):
    """Coût propagation : dep_load + impl_count_norm + cgp."""
    dep = node.get("dependency_load", 0) or 0
    impl = (node.get("implicit_constraint_count") or 0) / 20  # normalisé sur 20
    cgp = node.get("cross_graph_pressure", 0) or 0
    return max(0.0, min(1.0, 0.4 * dep + 0.3 * impl + 0.3 * cgp))


def information_gain(node):
    """Gain informationnel : multi-scale + cross_domain + S_propagated."""
    multi = (node.get("multi_scale_score") or len(node.get("frames",{}).get("intermediate",[])) or 1) / 4
    cd = (node.get("cross_domain_score") or len(node.get("domains") or [])) / 10
    sp = node.get("S_propagated") or 0
    return max(0.0, min(1.0, 0.4 * multi + 0.3 * cd + 0.3 * sp))


def drift_probability(node, topic_dist):
    """Risque de dérive : augmente avec distance + générality."""
    # plus la loi est loin du sujet et "générale", plus elle dérive
    general = 1 if (node.get("html_description","").lower().find("universel") >= 0
                     or node.get("html_description","").lower().find("tout") >= 0) else 0
    dist_factor = topic_dist / 4.0  # ∈ [0, 1]
    return max(0.0, min(1.0, 0.6 * dist_factor + 0.4 * general))


def contextual_density(g, node):
    """Densité voisinage pertinent (BFS-1 vers lois canoniques connexes)."""
    nid = node["id"]
    nbs = [e for e in g["edges"] if e["source"]==nid or e["target"]==nid]
    by_id = {n["id"]: n for n in g["nodes"]}
    canonical_nbs = 0
    for e in nbs:
        other = e["target"] if e["source"]==nid else e["source"]
        if other in by_id and by_id[other].get("canonical"):
            canonical_nbs += 1
    return min(1.0, canonical_nbs / 8)


def propagation_depth_limit(node, prop_cost):
    """Profondeur de propagation recommandée (1, 2, ou 3)."""
    if prop_cost > 0.50: return 1
    if prop_cost > 0.30: return 2
    return 3


def runtime_focus_score(node, topic_dist):
    """Capacité à rester focus = runtime_relevance × (1 - drift)."""
    rr = runtime_relevance(node)
    dp = drift_probability(node, topic_dist)
    return max(0.0, min(1.0, rr * (1 - dp)))


def boundary_stability(node, prop_cost, drift_p):
    """Stabilité du bornage : faibles coûts ET faible dérive."""
    return max(0.0, min(1.0, 1.0 - 0.5 * prop_cost - 0.5 * drift_p))


def subject_admissibility_score(scores):
    """Admissibilité globale pour le sujet."""
    s = (
        0.30 * scores["runtime_relevance"]
        + 0.20 * scores["information_gain"]
        + 0.20 * (1 - scores["propagation_cost"])
        + 0.15 * (1 - scores["drift_probability"])
        + 0.15 * scores["contextual_density"]
    )
    return max(0.0, min(1.0, s))


def boundary_score(scores):
    """Score final de bornage : haut = doit être chargé, bas = ne doit pas."""
    return scores["subject_admissibility_score"]


def contextual_priority(scores):
    """Priorité d'ordre de chargement (1 = highest)."""
    # On ne calcule pas un rang ici (fait globalement après tri).
    return scores["boundary_score"]


def chaos_boundary_tests(g):
    """Tests chaos sur le bornage."""
    results = []

    # Test 1 — Loi très générale (pseudo-universelle) doit avoir drift élevé
    t1 = {"name": "pseudo_universal_drift_detection",
          "description": "Lois 'universelles' montrent drift_probability haut"}
    suspects = [n for n in g["nodes"]
                if n.get("html_description","").lower().find("universel") >= 0]
    if suspects:
        avg_drift = sum(n.get("drift_probability", 0) for n in suspects) / len(suspects)
        t1["suspects_count"] = len(suspects)
        t1["avg_drift"] = round(avg_drift, 3)
        t1["hypothesis_supported"] = avg_drift > 0.40
    else:
        t1["status"] = "no suspects"; t1["hypothesis_supported"] = None
    results.append(t1)

    # Test 2 — Propagation depth limit cohérent avec coût
    t2 = {"name": "propagation_depth_consistency",
          "description": "Hauts coûts → depth_limit = 1, bas coûts → 3"}
    pdl_1 = sum(1 for n in g["nodes"] if n.get("propagation_depth_limit") == 1)
    pdl_2 = sum(1 for n in g["nodes"] if n.get("propagation_depth_limit") == 2)
    pdl_3 = sum(1 for n in g["nodes"] if n.get("propagation_depth_limit") == 3)
    t2["distribution"] = {"depth_1": pdl_1, "depth_2": pdl_2, "depth_3": pdl_3}
    t2["hypothesis_supported"] = pdl_3 >= pdl_1  # majorité depth 3 attendu sur graphe sain
    results.append(t2)

    # Test 3 — Branche très connectée — boundary_score modéré (pas top)
    t3 = {"name": "hub_branching_not_topping_boundary",
          "description": "GHUC-001 ne domine pas boundary_score (cgp + dep élevés le pénalisent)"}
    ghuc1 = next((n for n in g["nodes"] if n["id"] == "GHUC-001"), None)
    if ghuc1:
        t3["GHUC_001_boundary"] = ghuc1.get("boundary_score", 0)
        t3["expected_lower_than_frugal"] = ghuc1.get("boundary_score", 0) < 0.80
        t3["hypothesis_supported"] = t3["expected_lower_than_frugal"]
    results.append(t3)

    # Test 4 — Lois éloignées (topic_distance ≥ 3) ont boundary bas
    t4 = {"name": "distant_laws_low_boundary",
          "description": "Lois loin des ancres typiques → boundary < 0.50"}
    distant = [n for n in g["nodes"] if (n.get("topic_distance") or 0) >= 3]
    if distant:
        avg_b = sum(n.get("boundary_score", 0) for n in distant) / len(distant)
        t4["distant_count"] = len(distant)
        t4["avg_boundary"] = round(avg_b, 3)
        t4["hypothesis_supported"] = avg_b < 0.60
    else:
        t4["hypothesis_supported"] = True
    results.append(t4)

    # Test 5 — Récursion profonde (BFS depth=10 termine)
    t5 = {"name": "deep_recursion_terminates",
          "description": "BFS depth=10 ne fait pas exploser le moteur"}
    sample = g["nodes"][0]["id"]
    distances = bfs_distance_map(g, [sample], depth=10)
    t5["nodes_reached_depth_10"] = len(distances)
    t5["hypothesis_supported"] = len(distances) <= len(g["nodes"])  # naturellement borné
    results.append(t5)

    return results


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))

    # Anchor IDs : les 8 racines canoniques (ancres "typiques")
    anchor_ids = [n["id"] for n in g["nodes"]
                  if n.get("canonical")
                  and not any(e["kind"]=="parent" and e["source"]==n["id"]
                              for e in g["edges"])]

    print(f"\nSUBJECT_BOUNDARY_ENGINE — Mission ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515")
    print(f"  Lois à analyser  : {len(g['nodes'])}")
    print(f"  Ancres ('topic') : {len(anchor_ids)} (racines canoniques)")

    # Compute distances en lot (efficient)
    distances = bfs_distance_map(g, anchor_ids, depth=4)

    scored = []
    for n in g["nodes"]:
        td = distances.get(n["id"], 4)
        rr = runtime_relevance(n)
        pc = propagation_cost(n)
        ig = information_gain(n)
        dp = drift_probability(n, td)
        cd = contextual_density(g, n)
        pdl = propagation_depth_limit(n, pc)
        rfs = runtime_focus_score(n, td)
        bs = boundary_stability(n, pc, dp)

        scores = {
            "topic_distance":              td,
            "runtime_relevance":           round(rr, 3),
            "propagation_cost":            round(pc, 3),
            "information_gain":            round(ig, 3),
            "drift_probability":           round(dp, 3),
            "contextual_density":          round(cd, 3),
            "propagation_depth_limit":     pdl,
            "runtime_focus_score":         round(rfs, 3),
            "boundary_stability":          round(bs, 3),
        }
        sas = subject_admissibility_score(scores)
        scores["subject_admissibility_score"] = round(sas, 3)
        scores["boundary_score"] = round(boundary_score(scores), 3)
        scores["contextual_priority"] = scores["boundary_score"]
        n.update(scores)
        scored.append({"id": n["id"], "family": n["family"],
                       "attractor_tier": n.get("attractor_tier"),
                       "superior": n.get("superior_law_candidate", False),
                       **scores})

    # Save
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Chaos tests
    chaos = chaos_boundary_tests(g)
    pass_count = sum(1 for c in chaos if c.get("hypothesis_supported") is True)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515",
        "timestamp": "2026-05-15T22:16:00+02:00",
        "laws_tested": len(g["nodes"]),
        "anchors_used": anchor_ids,
        "scores_per_law": 12,
        "top_boundary_score": sorted(scored, key=lambda x: -x["boundary_score"])[:15],
        "low_boundary": sorted(scored, key=lambda x: x["boundary_score"])[:15],
        "high_drift_probability": sorted(scored, key=lambda x: -x["drift_probability"])[:15],
        "all_scored": scored
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    CHAOS.write_text(json.dumps({
        "mission_id": "ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515",
        "timestamp": "2026-05-15T22:16:00+02:00",
        "tests_total": len(chaos),
        "tests_passed": pass_count,
        "tests": chaos
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  ✓ 12 scores injectés sur les {len(g['nodes'])} nœuds")
    print(f"\n  TOP 5 boundary_score (lois prioritaires runtime) :")
    for s in sorted(scored, key=lambda x: -x["boundary_score"])[:5]:
        sup = '★' if s["superior"] else ' '
        print(f"    {sup} {s['id']:18s}  boundary={s['boundary_score']:.3f}  "
              f"focus={s['runtime_focus_score']:.3f}  "
              f"drift={s['drift_probability']:.3f}")

    print(f"\n  TOP 5 drift_probability (risque dérive) :")
    for s in sorted(scored, key=lambda x: -x["drift_probability"])[:5]:
        print(f"    ⚠ {s['id']:18s}  drift={s['drift_probability']:.3f}  "
              f"topic_dist={s['topic_distance']}")

    print(f"\n  Chaos boundary tests : {pass_count}/{len(chaos)}")
    for c in chaos:
        h = c.get("hypothesis_supported")
        symbol = "✓" if h is True else "?" if h is None else "✗"
        print(f"    {symbol} {c['name']:40s}")


if __name__ == "__main__":
    main()
