"""Cohérence numérique multicadre (plan §9 et §15.2).

Formule active : S = (β × ΔΦ_coh) / (1 + T + σ), S ∈ [0,100].
Jauge canonique v1.0.1 : β, ΔΦ_coh, T et σ sont chacun bornés à [0,10] ;
β = 10 et ΔΦ_coh = 10 × (mission_aligned/mission_applicable) ×
(relations_coherent/relations_applicable) ∈ [0,10].

Ce module reproduit exactement les comptages gelés de l'étalon
ZORAN-SKILL-MAX-HARNESS-CONTRACT:v2 tels qu'utilisés dans
ZORAN_LEGACY_CODE_RECOVERY_MEASURE_V1.json (ex. 8/12 × 8/12 → 44,44).

Règles dures :
 - donnée manquante OU dénominateur de comptage nul OU T/σ hors [0,10]
   → veto conservateur S=0, intervalle [0,100], classe
   BOUNDED_CONSERVATIVE, cause nommée — jamais S=100 par défaut ;
 - agrégation = minimum des six cadres, aucune moyenne ;
 - cinématique ΔS = S_après − S_avant.
"""

FRAMES = ["local", "lower", "peer", "upper", "temporal", "global"]

CLASS_OBSERVED = "DETERMINISTIC_OBSERVED"
CLASS_PROJECTED = "PROJECTED_DRY_RUN"
CLASS_CONSERVATIVE = "BOUNDED_CONSERVATIVE"

BETA = 10.0
PARAM_MIN, PARAM_MAX = 0.0, 10.0


def delta_phi_coh(mission_aligned, mission_applicable, relations_coherent,
                  relations_applicable):
    """ΔΦ_coh ∈ [0,10]. Dénominateur nul → 0,0 (veto), jamais 10,0."""
    if not mission_applicable or not relations_applicable:
        return 0.0
    ratio = (mission_aligned / mission_applicable) * \
            (relations_coherent / relations_applicable)
    return max(0.0, min(PARAM_MAX, PARAM_MAX * ratio))


def s_score(mission_aligned, mission_applicable, relations_coherent,
            relations_applicable, t=0.0, sigma=0.0):
    """Score ponctuel S = (β × ΔΦ_coh) / (1 + T + σ).
    Un dénominateur de comptage nul produit S=0 (veto), jamais S=100."""
    phi = delta_phi_coh(mission_aligned, mission_applicable,
                        relations_coherent, relations_applicable)
    return (BETA * phi) / (1.0 + t + sigma)


def frame_cell(frame, counts, calibration_class, cause, t=0.0, sigma=0.0):
    """Cellule de mesure d'un cadre. `counts` doit porter les quatre proxys ;
    donnée absente, dénominateur nul ou T/σ hors [0,10] → veto conservateur."""
    required = ["mission_aligned", "mission_applicable",
                "relations_coherent", "relations_applicable"]
    missing = sorted(k for k in required if counts.get(k) is None)
    if missing:
        return conservative_cell(frame, "donnée absente: %s" % ", ".join(missing))
    zero_denoms = sorted(k for k in ("mission_applicable", "relations_applicable")
                         if counts[k] == 0)
    if zero_denoms:
        return conservative_cell(
            frame, "dénominateur de comptage nul: %s" % ", ".join(zero_denoms))
    bad_params = sorted(name for name, value in (("T", t), ("sigma", sigma))
                        if not (PARAM_MIN <= value <= PARAM_MAX))
    if bad_params:
        return conservative_cell(
            frame, "paramètre hors [0,10]: %s" % ", ".join(bad_params))
    phi = delta_phi_coh(counts["mission_aligned"], counts["mission_applicable"],
                        counts["relations_coherent"], counts["relations_applicable"])
    s = max(0.0, min(100.0, (BETA * phi) / (1.0 + t + sigma)))
    if calibration_class == CLASS_OBSERVED:
        interval = [s, s]
        evidence_quality = 1.0
    else:
        # Projection dry-run : borne basse conservatrice à 0, preuve partielle.
        interval = [0.0, s]
        evidence_quality = 0.5
    return {
        "frame": frame,
        "status": "PASS" if s >= 100.0 else "FAIL",
        "counts": counts,
        "delta_phi_coh": phi,
        "s": s,
        "interval": interval,
        "calibration_class": calibration_class,
        "evidence_quality": evidence_quality,
        "t": t,
        "sigma": sigma,
        "cause": cause,
    }


def conservative_cell(frame, missing_datum):
    """Veto numérique conservateur : jamais NON_MESURÉ à la place d'un calcul."""
    return {
        "frame": frame,
        "status": "FAIL",
        "counts": None,
        "s": 0.0,
        "interval": [0.0, 100.0],
        "calibration_class": CLASS_CONSERVATIVE,
        "evidence_quality": 0.0,
        "t": 0.0,
        "sigma": 0.0,
        "cause": "veto conservateur — %s" % missing_datum,
    }


def aggregate(cells):
    """Agrégation VETO_MIN_NO_AVERAGE_COMPENSATION sur les six cadres."""
    missing = sorted(set(FRAMES) - set(c["frame"] for c in cells))
    if missing:
        cells = list(cells) + [conservative_cell(f, "cadre non calculé") for f in missing]
    by_frame = {c["frame"]: c for c in cells}
    ordered = [by_frame[f] for f in FRAMES]
    point = min(c["s"] for c in ordered)
    lower = min(c["interval"][0] for c in ordered)
    return {
        "aggregation": "VETO_MIN_NO_AVERAGE_COMPENSATION",
        "computed_cells": len(ordered),
        "expected_cells": len(FRAMES),
        "overall_point": point,
        "overall_lower_bound": lower,
        "frames": {c["frame"]: c for c in ordered},
    }


def measure(before_cells, after_cells):
    """Mesure complète avant/après + cinématique ΔS par cadre et globale."""
    before = aggregate(before_cells)
    after = aggregate(after_cells)
    delta_frames = {
        f: after["frames"][f]["s"] - before["frames"][f]["s"] for f in FRAMES
    }
    return {
        "formula": "S=(beta*delta_phi_coh)/(1+T+sigma)",
        "kinematic_formula": "delta_S=S_after-S_before",
        "beta": BETA,
        "parameter_range": [PARAM_MIN, PARAM_MAX],
        "before": before,
        "after": after,
        "delta_s_frames": delta_frames,
        "overall_delta_s": after["overall_point"] - before["overall_point"],
        "runtime_promotion": False,
        "promotion_scope": "DRY_RUN_ONLY",
    }


def verdict(measure_result):
    """Verdict K3 réel du run, dérivé — jamais codé en dur.

    Base : l'agrégat OBSERVÉ (« avant ») ; la projection ne peut jamais
    accorder un PASS. Un cadre FAIL ou une borne basse à 0 interdit PASS.
    Retourne (k3_verdict, basis) où k3_verdict ∈ {PASS, FAIL}.
    """
    before = measure_result["before"]
    frames = before["frames"]
    min_frame = min(FRAMES, key=lambda f: frames[f]["s"])
    failing = sorted(f for f in FRAMES if frames[f]["status"] != "PASS")
    lower_bound = before["overall_lower_bound"]
    k3 = "PASS" if not failing and lower_bound > 0.0 else "FAIL"
    basis = {
        "basis": "OBSERVED_BEFORE_AGGREGATE",
        "min_frame": min_frame,
        "min_frame_s": frames[min_frame]["s"],
        "overall_lower_bound": lower_bound,
        "failing_frames": failing,
        "cause": frames[min_frame]["cause"],
    }
    return k3, basis
