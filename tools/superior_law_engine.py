#!/usr/bin/env python3
"""ZORAN Mission 5 — Superior Law Discovery Engine.

Analyse le CanonicalGraph pour identifier les LOIS SUPÉRIEURES.

Une loi supérieure n'est pas :
  - prestige lexical
  - taille (weight 1.0)
  - généralité vague

Une loi supérieure EST :
  - compose beaucoup
  - explique plusieurs branches
  - invariants multi-échelle
  - réduit complexité globale
  - stabilise plusieurs sous-graphes
  - cohérente dans plusieurs cadres

PIPELINE :
  Law → CompositionAnalysis → InvariantAnalysis → MultiScaleValidation
       → OracleValidation → SuperiorLawCandidate

OUTPUT :
  audit/SUPERIOR_LAW_CANDIDATES.json
  audit/FALSE_SUPERIOR_LAWS.json
"""
from __future__ import annotations
import json
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
CANDIDATES_OUT = ROOT / "audit" / "SUPERIOR_LAW_CANDIDATES.json"
FALSE_OUT = ROOT / "audit" / "FALSE_SUPERIOR_LAWS.json"


def parents_of(g, nid):
    return [e["target"] for e in g["edges"] if e["kind"] == "parent" and e["source"] == nid]


def children_of(g, nid):
    return [e["source"] for e in g["edges"] if e["kind"] == "parent" and e["target"] == nid]


def edges_touching(g, nid):
    return [e for e in g["edges"]
            if e["source"] == nid or e["target"] == nid]


def compositions_count(g, nid):
    composes = set()
    parents = parents_of(g, nid)
    composes.update(parents)
    for p in parents:
        composes.update(parents_of(g, p))
        for sib in children_of(g, p):
            if sib != nid: composes.add(sib)
    composes.update(children_of(g, nid))
    for e in g["edges"]:
        if e["kind"] in ("iso","contradicts","related","absorbed_into","depends"):
            if e["source"] == nid: composes.add(e["target"])
            if e["target"] == nid: composes.add(e["source"])
    for c in g.get("compositions", []):
        if nid in c.get("pair", []):
            for p in c["pair"]:
                if p != nid: composes.add(p)
    composes.discard(nid)
    return composes


def branches_explained(g, nid):
    """Nombre de branches (sous-arbres) dont nid est ancestor."""
    # BFS descending
    visited = {nid}
    queue = [nid]
    branches_touched = set()
    while queue:
        cur = queue.pop(0)
        for child in children_of(g, cur):
            if child not in visited:
                visited.add(child)
                queue.append(child)
                branches_touched.add(child)
    return len(branches_touched)


def cross_domain_score(g, nid):
    """Mesure : combien de domaines distincts cette loi traverse via ses liens."""
    node = next((n for n in g["nodes"] if n["id"] == nid), None)
    if not node: return 0
    domains = set(node.get("domains", []))
    # ajoute domaines des nœuds connectés
    for e in g["edges"]:
        if e["source"] == nid or e["target"] == nid:
            other_id = e["target"] if e["source"] == nid else e["source"]
            other = next((n for n in g["nodes"] if n["id"] == other_id), None)
            if other:
                domains.update(other.get("domains", []))
    return len(domains)


def runtime_stability(node):
    """Mesure stabilité runtime via S_local et S_global."""
    sl = node.get("S_local", 0) or 0
    sg = node.get("S_global", 0) or 0
    gap = abs(sl - sg)
    # Stable si gap faible ET S_global élevé
    return max(0.0, sg - gap)


def multi_scale_score(g, nid):
    """Mesure : invariants à plusieurs paliers."""
    node = next((n for n in g["nodes"] if n["id"] == nid), None)
    if not node: return 0
    intermediate = node.get("frames", {}).get("intermediate", [])
    levels = set(e["level"] for e in intermediate if isinstance(e, dict) and "level" in e)
    return len(levels)


def contradictions_count(g, nid):
    return sum(1 for e in g["edges"]
                if e["kind"] == "contradicts"
                and (e["source"] == nid or e["target"] == nid))


def topological_weight_of(node):
    return node.get("topological_weight", 0) or 0


def reusability_score(g, nid):
    """Mesure : combien d'autres lois citent cette loi dans iso/contradicts/related."""
    count = 0
    for e in g["edges"]:
        if e["kind"] in ("iso","related","contradicts","absorbed_into","depends"):
            if e["source"] == nid or e["target"] == nid:
                count += 1
    return count


def superior_law_probability(g, nid):
    """Compose tous les scores en une probabilité [0, 1]."""
    node = next((n for n in g["nodes"] if n["id"] == nid), None)
    if not node: return 0

    comps = len(compositions_count(g, nid))
    branches = branches_explained(g, nid)
    invariant = multi_scale_score(g, nid)
    runtime_stab = runtime_stability(node)
    cross_domain = cross_domain_score(g, nid)
    contradictions = contradictions_count(g, nid)
    reusability = reusability_score(g, nid)
    topo_w = topological_weight_of(node)

    # Bornes raisonnables : 25 max comp, 50 max branches, 4 max niveaux, 20 max cross, 10 reuse
    score = (
        0.20 * min(1.0, comps / 15)
        + 0.20 * min(1.0, branches / 20)
        + 0.15 * (invariant / 4)
        + 0.15 * runtime_stab
        + 0.10 * min(1.0, cross_domain / 15)
        + 0.10 * min(1.0, reusability / 8)
        + 0.10 * topo_w
        - 0.05 * min(1.0, contradictions / 5)  # pénalité contradictions excessives
    )
    return max(0.0, min(1.0, score))


def detect_false_superior(g, nid):
    """Détecte les fausses 'superior law' candidates (R-CORE-12, pseudo-attractor, etc.)."""
    flags = []
    node = next((n for n in g["nodes"] if n["id"] == nid), None)
    if not node: return flags

    # Pseudo-universalité dans description
    desc = node.get("html_description", "").lower()
    if any(w in desc for w in ["universel", "absolu", "omniprésent", "tout cadre"]):
        flags.append("pseudo-universal language in description")

    # Pseudo-universalité dans frames.global
    for inv in node.get("frames", {}).get("global", []):
        if any(w in inv.lower() for w in ["universel", "absolu", "tout"]):
            flags.append(f"pseudo-universal global frame: '{inv[:60]}'")

    # Limits vague ou vide
    limits = node.get("frames", {}).get("limits", [])
    if not limits or all(len(l) < 20 for l in limits):
        flags.append("limits absent or too vague")

    # Tier déclaré mais compositions insuffisantes
    tier = node.get("attractor_tier")
    comps = len(compositions_count(g, nid))
    if tier == "μ0" and comps < 7:
        flags.append(f"μ0 tier without sufficient compositions ({comps})")
    elif tier == "μ1" and comps < 5:
        flags.append(f"μ1 tier without sufficient compositions ({comps})")

    # Weight élevé mais peu d'enfants
    weight = node.get("weight", 0) or 0
    n_children = len(children_of(g, nid))
    if weight >= 0.95 and n_children < 2:
        flags.append(f"high weight ({weight}) but only {n_children} children")

    return flags


def run():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = g["nodes"]

    # Compute scores for all nodes
    scored = []
    false_candidates = []

    for n in nodes:
        nid = n["id"]
        p = superior_law_probability(g, nid)
        false_flags = detect_false_superior(g, nid)
        score_detail = {
            "id": nid,
            "family": n.get("family"),
            "canonical": n.get("canonical"),
            "attractor_tier": n.get("attractor_tier"),
            "superior_law_probability": round(p, 3),
            "composition_score": min(1.0, len(compositions_count(g, nid)) / 15),
            "invariant_score": multi_scale_score(g, nid) / 4,
            "multi_scale_score": multi_scale_score(g, nid),
            "runtime_stability": round(runtime_stability(n), 3),
            "cross_domain_score": cross_domain_score(g, nid),
            "branches_explained": branches_explained(g, nid),
            "reusability_score": reusability_score(g, nid),
            "topological_weight": round(topological_weight_of(n), 3),
            "contradictions_count": contradictions_count(g, nid),
            "hierarchical_rank": n.get("structural_rank", 0),
            "false_superior_flags": false_flags
        }
        scored.append(score_detail)
        if p >= 0.50 and false_flags:
            false_candidates.append(score_detail)

    # Sort by probability
    scored.sort(key=lambda x: x["superior_law_probability"], reverse=True)

    # Superior candidates : prob ≥ 0.50 AND no false flags
    superior_candidates = [
        s for s in scored
        if s["superior_law_probability"] >= 0.50
        and not s["false_superior_flags"]
    ]

    # Output
    CANDIDATES_OUT.parent.mkdir(parents=True, exist_ok=True)
    CANDIDATES_OUT.write_text(json.dumps({
        "mission_id": "ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515",
        "timestamp": "2026-05-15T21:10:00+02:00",
        "total_laws_analyzed": len(nodes),
        "candidates_count": len(superior_candidates),
        "false_candidates_count": len(false_candidates),
        "top_superior_candidates": superior_candidates[:20],
        "all_scored_top_30": scored[:30]
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    FALSE_OUT.write_text(json.dumps({
        "mission_id": "ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515",
        "timestamp": "2026-05-15T21:10:00+02:00",
        "false_superior_count": len(false_candidates),
        "false_superior_details": false_candidates
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\nSUPERIOR LAW ENGINE — Mission 5")
    print(f"  Lois analysées        : {len(nodes)}")
    print(f"  Candidates supérieurs : {len(superior_candidates)} (probability ≥ 0.50)")
    print(f"  Faux candidates       : {len(false_candidates)} (flags détectés)")
    print(f"\n  TOP 10 superior candidates :")
    for s in superior_candidates[:10]:
        print(f"    {s['id']:18s}  p={s['superior_law_probability']:.3f}  "
              f"comp={s['composition_score']:.2f} multi-scale={s['multi_scale_score']} "
              f"branches={s['branches_explained']} tier={s['attractor_tier'] or '—'}")
    if false_candidates:
        print(f"\n  Faux superior detected :")
        for f in false_candidates[:5]:
            print(f"    {f['id']:18s}  flags: {f['false_superior_flags']}")


if __name__ == "__main__":
    run()
