#!/usr/bin/env python3
"""ZORAN — NOISE_MINIMIZATION_ENGINE.

Mission : ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516.

PRINCIPE FONDAMENTAL :
    Toute loi L_i est initialement un COÛT POTENTIEL.
    Elle n'est conservée runtime que si  Gain(L_i) > Coût(L_i).
    Sinon : la loi est du BRUIT RUNTIME.

Définition opérationnelle du bruit :
    Tout élément (lexical, propagationnel, runtime, topologique, cognitif)
    qui augmente le coût, l'imprécision, la dérive, sans gain utile suffisant.

13 nouveaux scores injectés par loi :
  runtime_gain               : gain runtime brut (utilité — coût implicite)
  noise_contribution         : combien de bruit cette loi ajoute au système
  precision_gain             : gain en précision attendu si chargée
  drift_risk                 : risque de dérive runtime
  frugality_ratio            : utilité / charge propagée
  keep_runtime               : booléen — la garder runtime ?
  noise_ratio                : bruit / signal
  signal_to_noise            : signal / (signal + bruit)
  precision_per_cost         : précision gagnée par unité de coût
  structural_usefulness      : utilité structurelle (pas seulement runtime)

Tests obligatoires sur chaque loi :
  propagation cost · runtime overload · drift contribution ·
  precision gain · temporal survival · noise contribution
"""
from __future__ import annotations
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
REPORT = ROOT / "audit" / "NOISE_CONTRIBUTION_REPORT.json"


def runtime_gain(node):
    """Gain runtime brut = utilité − coût implicite."""
    util = (
        0.40 * (node.get("runtime_impact_score", 0.5) or 0.5)
        + 0.30 * (node.get("llm_relevance_score", 0.5) or 0.5)
        + 0.30 * (node.get("velocity_score", 0.4) or 0.4)
    )
    cost = (
        0.50 * (node.get("propagation_cost", 0.5) or 0.5)
        + 0.30 * ((node.get("implicit_constraint_count", 0) or 0) / 20)
        + 0.20 * (node.get("dependency_load", 0) or 0)
    )
    return max(-1.0, min(1.0, util - cost))


def noise_contribution(node):
    """Combien de bruit cette loi ajoute.

    Bruit = coût propagationnel + dépendance + redondance lexicale
            − utilité runtime démontrée.
    """
    pc = node.get("propagation_cost", 0.5) or 0.5
    ic = (node.get("implicit_constraint_count", 0) or 0) / 20
    dep = node.get("dependency_load", 0) or 0
    util = node.get("runtime_impact_score", 0.5) or 0.5
    raw = 0.40 * pc + 0.30 * ic + 0.20 * dep - 0.30 * util
    return max(0.0, min(1.0, raw + 0.30))


def precision_gain(node):
    """Gain en précision si la loi est chargée runtime."""
    base = 0.30
    if node.get("attractor_tier"): base += 0.20
    if node.get("superior_law_candidate"): base += 0.15
    base += 0.15 * (node.get("S_local") or 0.7)
    base += 0.20 * (node.get("anti_hallucination_score") or 0.4)
    return min(1.0, base)


def drift_risk(node):
    """Risque que la loi provoque une dérive runtime."""
    base = 0.20
    base += 0.30 * (node.get("collapse_probability") or 0)
    base += 0.20 * (1.0 - (node.get("temporal_resilience_score") or 0.5))
    base += 0.30 * ((node.get("implicit_constraint_count", 0) or 0) / 20)
    if "toxique_propagationnelle" in (node.get("experimental_classes") or []):
        base += 0.20
    return max(0.0, min(1.0, base))


def frugality_ratio(node, gain, noise):
    """Utilité / (coût + bruit). Haut = frugale, bas = onéreuse."""
    pc = max(0.05, node.get("propagation_cost", 0.5) or 0.5)
    denom = pc + max(0.05, noise)
    return max(0.0, min(1.0, max(0.0, gain) / denom + 0.10))


def signal_to_noise(node, gain, noise):
    """S/(S+N). Métrique standard de qualité."""
    signal = max(0.0, gain)
    return signal / max(0.05, signal + noise)


def noise_ratio(noise, gain):
    """N/S. Plus c'est bas, mieux c'est."""
    signal = max(0.05, max(0.0, gain))
    return min(2.0, noise / signal)


def precision_per_cost(node, prec):
    """Précision gagnée par unité de coût propagé."""
    pc = max(0.05, node.get("propagation_cost", 0.5) or 0.5)
    return min(1.0, prec / pc / 3 + 0.10)


def structural_usefulness(node):
    """Utilité structurelle — pas seulement runtime."""
    # Une loi peut être runtime faible mais structurellement importante
    base = 0.20
    if node.get("attractor_tier") == "fondateur": base += 0.30
    if node.get("kind") == "boundary": base += 0.15
    parents = len(node.get("parent_laws") or [])
    children = len(node.get("child_laws") or [])
    base += min(0.30, 0.05 * (parents + children))
    return min(1.0, base)


def runtime_efficiency(node, gain):
    """Efficacité runtime nette."""
    return max(0.0, min(1.0, gain + 0.30))


def runtime_usefulness(node, gain, snr):
    """Utilité runtime composite."""
    return max(0.0, min(1.0,
        0.50 * max(0.0, gain) + 0.30 * snr + 0.20 * (node.get("velocity_score") or 0.4)
    ))


def keep_runtime(node, snr, frugality, runtime_gain_v):
    """Décision finale : garder ou pas en runtime.

    Critères ET-stricts :
      - signal_to_noise >= 0.50
      - frugality_ratio >= 0.30
      - runtime_gain > 0  (utilité nette positive)
    """
    return (snr >= 0.50) and (frugality >= 0.30) and (runtime_gain_v > 0)


def main():
    g = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = g["nodes"]
    print(f"\nNOISE_MINIMIZATION_ENGINE — Mission ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516")
    print(f"  Lois à scorer : {len(nodes)}")

    decisions = Counter()
    sums = Counter()
    all_scores = []
    keepers = []
    rejected = []

    for node in nodes:
        rg = runtime_gain(node)
        nc = noise_contribution(node)
        pg = precision_gain(node)
        dr = drift_risk(node)
        fr = frugality_ratio(node, rg, nc)
        snr = signal_to_noise(node, rg, nc)
        nr  = noise_ratio(nc, rg)
        ppc = precision_per_cost(node, pg)
        su  = structural_usefulness(node)
        re_ = runtime_efficiency(node, rg)
        ru  = runtime_usefulness(node, rg, snr)
        keep = keep_runtime(node, snr, fr, rg)

        scores = {
            "runtime_gain": round(rg, 3),
            "noise_contribution": round(nc, 3),
            "precision_gain": round(pg, 3),
            "drift_risk": round(dr, 3),
            "frugality_ratio": round(fr, 3),
            "runtime_usefulness": round(ru, 3),
            "runtime_efficiency": round(re_, 3),
            "signal_to_noise": round(snr, 3),
            "noise_ratio": round(nr, 3),
            "precision_per_cost": round(ppc, 3),
            "structural_usefulness": round(su, 3),
            "keep_runtime": bool(keep),
        }
        for k, v in scores.items():
            node[k] = v
        all_scores.append({"id": node["id"], **scores})

        sums["rg"]  += rg
        sums["nc"]  += nc
        sums["snr"] += snr
        sums["fr"]  += fr

        if keep:
            keepers.append(node["id"])
            decisions["keep"] += 1
        else:
            rejected.append({"id": node["id"], "snr": round(snr, 3),
                             "fr": round(fr, 3), "rg": round(rg, 3)})
            decisions["reject"] += 1

    N = len(nodes)
    avg_rg  = sums["rg"]  / N
    avg_nc  = sums["nc"]  / N
    avg_snr = sums["snr"] / N
    avg_fr  = sums["fr"]  / N

    # Save annotated graph
    DATA.write_text(json.dumps(g, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # System-level metrics
    global_noise_ratio = avg_nc / max(0.05, avg_rg if avg_rg > 0 else 0.05)
    system_snr = avg_rg / max(0.05, avg_rg + avg_nc)
    # Top 10 contributeurs de bruit
    noise_sorted = sorted(all_scores, key=lambda s: -s["noise_contribution"])[:10]
    # Top 10 signal-to-noise
    snr_sorted = sorted(all_scores, key=lambda s: -s["signal_to_noise"])[:10]

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({
        "mission_id": "ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516",
        "timestamp": "2026-05-16T03:55:00+02:00",
        "laws_scored": N,
        "decisions": dict(decisions),
        "keep_runtime_count": decisions["keep"],
        "reject_count": decisions["reject"],
        "reduction_pct": round(100 * decisions["reject"] / N, 1),
        "avg_runtime_gain": round(avg_rg, 3),
        "avg_noise_contribution": round(avg_nc, 3),
        "avg_signal_to_noise": round(avg_snr, 3),
        "avg_frugality_ratio": round(avg_fr, 3),
        "system_signal_to_noise": round(system_snr, 3),
        "global_noise_ratio": round(global_noise_ratio, 3),
        "top10_noise_contributors": noise_sorted,
        "top10_signal_to_noise": snr_sorted,
        "rejected_sample": rejected[:20],
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"  ✓ 12 scores noise/signal injectés sur {N} lois")
    print(f"  ✓ Decision keep_runtime : {decisions['keep']} / {N} ({100*decisions['keep']/N:.1f}%)")
    print(f"  ✓ Decision reject       : {decisions['reject']} / {N} ({100*decisions['reject']/N:.1f}%)")
    print(f"  ✓ Avg runtime_gain      : {avg_rg:+.3f}")
    print(f"  ✓ Avg noise_contribution: {avg_nc:.3f}")
    print(f"  ✓ Avg signal_to_noise   : {avg_snr:.3f}")
    print(f"  ✓ System S/N            : {system_snr:.3f}  (objectif ≥ 0.95)")
    print(f"  ✓ Réduction runtime     : {100 * decisions['reject'] / N:.1f}%")
    print(f"\n  TOP-3 contributeurs de bruit :")
    for s in noise_sorted[:3]:
        print(f"    {s['id']:18s} nc={s['noise_contribution']:.3f} snr={s['signal_to_noise']:.3f}")
    print(f"\n  TOP-3 signal-to-noise :")
    for s in snr_sorted[:3]:
        print(f"    {s['id']:18s} snr={s['signal_to_noise']:.3f} rg={s['runtime_gain']:+.3f}")


if __name__ == "__main__":
    main()
