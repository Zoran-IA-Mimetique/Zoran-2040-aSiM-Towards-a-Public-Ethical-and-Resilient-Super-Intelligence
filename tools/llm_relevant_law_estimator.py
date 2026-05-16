#!/usr/bin/env python3
"""ZORAN — LLM_RELEVANT_LAW_ESTIMATOR.

Mission : ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516.

PRINCIPE :
  Le CanonicalGraph peut être large, mais Runtime doit être sélectif.
  Ce moteur estime, pour chaque loi, sa pertinence réelle pour
  améliorer les ZORANs.

8 nouveaux scores par loi :
  llm_relevance_score          # score global pertinence LLM [0,1]
  runtime_impact_score         # impact runtime estimé
  anti_hallucination_score     # contribution anti-hallu
  contextualization_gain       # gain pour CLE
  propagation_cost             # déjà calculé (re-utilisé)
  cross_domain_reuse           # réutilisabilité multi-domaines
  runtime_survival_score       # capacité à survivre en runtime
  canonical_priority           # priorité canonique
"""
from __future__ import annotations
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "LLM_RELEVANCE_REPORT.json"


# Lois critiques pour LLM (par mots-clés dans frames/description)
LLM_KEYWORDS_ANTI_HALLU = {"hallucin","grounding","citation","refus","admissib","trace"}
LLM_KEYWORDS_RUNTIME = {"runtime","cle","contextual","load","propag","focus","boundary"}
LLM_KEYWORDS_REUSE = {"compos","invariant","iso","cross","famille","abstract"}


def keyword_hits(node, keyword_set):
    """Hits compteur sur description + frames."""
    hits = 0
    text = (node.get("html_description","") + " " + " ".join(node.get("domains",[]))).lower()
    for kw in keyword_set:
        if kw in text: hits += 1
    return hits


def anti_hallucination_score(node):
    """Score anti-hallu basé sur famille + frames + keywords."""
    fam = node["family"]
    score = 0.0
    # WP-11 (cohérence), WP-12 (admissibilité), DVE (anti-fabrication) sont anti-hallu naturels
    if fam in ("WP11","WP12"): score += 0.4
    elif fam in ("DVE","UDE"): score += 0.2
    # Keywords
    hits = keyword_hits(node, LLM_KEYWORDS_ANTI_HALLU)
    score += min(0.5, hits * 0.15)
    # Bonus si frames.limits non vide (anti-hubris = anti-hallu)
    limits = node.get("frames",{}).get("limits",[])
    if limits and len(limits) >= 2: score += 0.10
    return max(0.0, min(1.0, score))


def runtime_impact_score(node):
    """Impact runtime estimé."""
    # Lois SDE (attention), UDE (retrieval/mémoire), WP11 (audit cohérence) — fort impact
    fam = node["family"]
    base = 0.3
    if fam in ("SDE","UDE"): base += 0.3
    elif fam in ("WP11","WP12"): base += 0.25
    elif fam == "GHUC": base += 0.20  # consolidation utile mais coûteuse
    # boundary_score haute = impact runtime
    bs = node.get("boundary_score", 0.5)
    base += 0.3 * bs
    # runtime_admissible bonus
    if node.get("runtime_admissible"): base += 0.1
    return max(0.0, min(1.0, base))


def contextualization_gain(node):
    """Gain pour CLE / contextual loading."""
    # information_gain déjà calculé par boundary engine
    ig = node.get("information_gain", 0.5)
    cd = node.get("contextual_density", 0.5)
    return max(0.0, min(1.0, 0.6 * ig + 0.4 * cd))


def cross_domain_reuse(node):
    """Réutilisabilité cross-domain."""
    # cross_domain_score existant + frames.intermediate levels
    cd = (node.get("cross_domain_score") or 0) / 10
    levels = len({e["level"] for e in node.get("frames",{}).get("intermediate",[])
                   if isinstance(e, dict) and "level" in e})
    return max(0.0, min(1.0, 0.5 * cd + 0.125 * levels))


def runtime_survival_score(node):
    """Capacité à survivre en runtime sous stress."""
    # Combinaison structural_survival + temporal_resilience + boundary
    ss = node.get("structural_survival_score", 0.5)
    tr = node.get("temporal_resilience_score", 0.5)
    bs = node.get("boundary_score", 0.5)
    return max(0.0, min(1.0, 0.35 * ss + 0.35 * tr + 0.30 * bs))


def llm_relevance_score(scores):
    """Score global LLM-pertinence (recalibré pour distribution honnête)."""
    return max(0.0, min(1.0,
        0.30 * scores["runtime_impact_score"]
        + 0.25 * scores["anti_hallucination_score"]
        + 0.15 * scores["contextualization_gain"]
        + 0.15 * scores["cross_domain_reuse"]
        + 0.15 * scores["runtime_survival_score"]
        - 0.05 * scores["propagation_cost"]
    ))


def canonical_priority(scores, node):
    """Priorité canonique = llm_relevance × runtime_admissible."""
    rt_admit = 1.0 if node.get("runtime_admissible") else 0.0
    return max(0.0, min(1.0, 0.7 * scores["llm_relevance_score"] + 0.3 * rt_admit))


def chaos_tests(g):
    """Tests chaos LLM-pertinence."""
    results = []

    # Test 1 : pseudo-universal laws → llm_relevance faible
    t1 = {"name": "pseudo_universal_low_relevance"}
    suspects = [n for n in g["nodes"]
                if any(w in n.get("html_description","").lower()
                       for w in ("universel","absolu","tout cadre"))]
    if suspects:
        avg = sum(n.get("llm_relevance_score",0) for n in suspects) / len(suspects)
        t1["count"] = len(suspects)
        t1["avg_relevance"] = round(avg, 3)
        t1["hypothesis_supported"] = avg < 0.70  # universals pas top
    else:
        t1["hypothesis_supported"] = True
    results.append(t1)

    # Test 2 : familles anti-hallu (WP11/WP12) dominent anti_hallucination_score
    t2 = {"name": "anti_hallu_families_dominate"}
    by_fam = defaultdict(list)
    for n in g["nodes"]:
        by_fam[n["family"]].append(n.get("anti_hallucination_score", 0))
    fam_avg = {f: sum(s)/len(s) for f, s in by_fam.items() if s}
    top_fam = max(fam_avg.items(), key=lambda x: x[1])
    t2["top_family"] = top_fam[0]
    t2["top_score"] = round(top_fam[1], 3)
    t2["hypothesis_supported"] = top_fam[0] in ("WP11","WP12","DVE")
    results.append(t2)

    # Test 3 : runtime_survival corrélé avec llm_relevance
    t3 = {"name": "runtime_survival_correlates_relevance"}
    pairs = [(n.get("runtime_survival_score",0), n.get("llm_relevance_score",0))
             for n in g["nodes"]]
    if pairs:
        mean_x = sum(p[0] for p in pairs) / len(pairs)
        mean_y = sum(p[1] for p in pairs) / len(pairs)
        cov = sum((p[0]-mean_x)*(p[1]-mean_y) for p in pairs) / len(pairs)
        var_x = sum((p[0]-mean_x)**2 for p in pairs) / len(pairs)
        var_y = sum((p[1]-mean_y)**2 for p in pairs) / len(pairs)
        denom = (var_x * var_y) ** 0.5
        corr = (cov / denom) if denom > 0 else 0
        t3["correlation"] = round(corr, 3)
        t3["hypothesis_supported"] = corr > 0.40
    results.append(t3)

    # Test 4 : inflation épistémique check
    t4 = {"name": "no_epistemic_inflation"}
    high_relevance = sum(1 for n in g["nodes"]
                          if n.get("llm_relevance_score",0) >= 0.80)
    t4["high_relevance_count"] = high_relevance
    t4["ratio"] = round(high_relevance / len(g["nodes"]), 3)
    t4["hypothesis_supported"] = (high_relevance / len(g["nodes"])) < 0.30
    results.append(t4)

    return results


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))

    print(f"\nLLM_RELEVANT_LAW_ESTIMATOR — Mission ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516")
    print(f"  Lois à analyser : {len(g['nodes'])}")

    scored = []
    for n in g["nodes"]:
        ah = anti_hallucination_score(n)
        ri = runtime_impact_score(n)
        cg = contextualization_gain(n)
        cdr = cross_domain_reuse(n)
        rss = runtime_survival_score(n)
        scores = {
            "runtime_impact_score":       round(ri, 3),
            "anti_hallucination_score":   round(ah, 3),
            "contextualization_gain":     round(cg, 3),
            "cross_domain_reuse":         round(cdr, 3),
            "runtime_survival_score":     round(rss, 3),
            "propagation_cost":           round(n.get("propagation_cost") or
                                                ((n.get("dependency_load",0) or 0)*0.4 +
                                                 (n.get("implicit_constraint_count",0) or 0)/50 +
                                                 (n.get("cross_graph_pressure",0) or 0)*0.3), 3),
        }
        scores["llm_relevance_score"] = round(llm_relevance_score(scores), 3)
        scores["canonical_priority"]  = round(canonical_priority(scores, n), 3)
        n.update(scores)
        scored.append({"id": n["id"], "family": n["family"],
                       "attractor_tier": n.get("attractor_tier"),
                       "superior": n.get("superior_law_candidate", False),
                       **scores})

    # Estimation statistique (mission)
    by_relevance = {
        "fondamentales (≥0.65)": sum(1 for s in scored if s["llm_relevance_score"] >= 0.65),
        "majeures (0.55-0.65)": sum(1 for s in scored if 0.55 <= s["llm_relevance_score"] < 0.65),
        "utiles (0.45-0.55)": sum(1 for s in scored if 0.45 <= s["llm_relevance_score"] < 0.55),
        "marginales (0.30-0.45)": sum(1 for s in scored if 0.30 <= s["llm_relevance_score"] < 0.45),
        "non pertinentes (<0.30)": sum(1 for s in scored if s["llm_relevance_score"] < 0.30),
    }

    # Save
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Chaos
    chaos = chaos_tests(g)
    pass_count = sum(1 for c in chaos if c.get("hypothesis_supported") is True)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516",
        "timestamp": "2026-05-16T00:05:00+02:00",
        "laws_tested": len(g["nodes"]),
        "scores_per_law": 8,
        "distribution_by_relevance": by_relevance,
        "top_llm_relevance": sorted(scored, key=lambda x: -x["llm_relevance_score"])[:20],
        "top_canonical_priority": sorted(scored, key=lambda x: -x["canonical_priority"])[:20],
        "low_relevance_candidates_demotion": sorted(scored, key=lambda x: x["llm_relevance_score"])[:10],
        "chaos_tests_passed": pass_count,
        "chaos_total": len(chaos),
        "chaos_details": chaos,
        "all_scored": scored
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  ✓ 8 scores injectés sur les {len(g['nodes'])} nœuds")
    print(f"\n  Distribution par pertinence LLM :")
    for k, v in by_relevance.items():
        pct = round(100 * v / len(scored), 1)
        print(f"    {k:30s} {v:4d} ({pct:.1f}%)")

    print(f"\n  TOP 5 llm_relevance_score :")
    for s in sorted(scored, key=lambda x: -x["llm_relevance_score"])[:5]:
        sup = '★' if s["superior"] else ' '
        print(f"    {sup} {s['id']:18s}  llm={s['llm_relevance_score']:.3f}  "
              f"impact={s['runtime_impact_score']:.3f}  "
              f"anti_hallu={s['anti_hallucination_score']:.3f}")

    print(f"\n  Chaos tests : {pass_count}/{len(chaos)}")
    for c in chaos:
        h = c.get("hypothesis_supported")
        symbol = "✓" if h is True else "?" if h is None else "✗"
        print(f"    {symbol} {c['name']}")


if __name__ == "__main__":
    main()
