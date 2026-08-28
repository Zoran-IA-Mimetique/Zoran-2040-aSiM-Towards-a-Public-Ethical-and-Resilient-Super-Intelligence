"""Cohérence numérique multicadre (plan §9 et §15.2).

Formule active : S = (β × ΔΦ_coh) / (1 + T + σ), S ∈ [0,100], β = 100,
ΔΦ_coh = (mission_aligned/mission_applicable) × (relations_coherent/relations_applicable).

Ce module reproduit exactement les comptages gelés de l'étalon
ZORAN-SKILL-MAX-HARNESS-CONTRACT:v2 tels qu'utilisés dans
ZORAN_LEGACY_CODE_RECOVERY_MEASURE_V1.json (ex. 8/12 × 8/12 → 44,44).

Règles dures :
 - donnée manquante → veto conservateur S=0, intervalle [0,100],
   classe BOUNDED_CONSERVATIVE, donnée absente nommée ;
 - agrégation = minimum des six cadres, aucune moyenne ;
 - cinématique ΔS = S_après − S_avant.
"""

FRAMES = ["local", "lower", "peer", "upper", "temporal", "global"]

CLASS_OBSERVED = "DETERMINISTIC_OBSERVED"
CLASS_PROJECTED = "PROJECTED_DRY_RUN"
CLASS_CONSERVATIVE = "BOUNDED_CONSERVATIVE"

BETA = 100.0


def s_score(mission_aligned, mission_applicable, relations_coherent,
            relations_applicable, t=0.0, sigma=0.0):
    """Score ponctuel S. Un dénominateur nul (0 applicable) vaut ratio 1,0 :
    cas 'rapport vide' du plan §12, la mesure reste possible."""
    m_ratio = (mission_aligned / mission_applicable) if mission_applicable else 1.0
    r_ratio = (relations_coherent / relations_applicable) if relations_applicable else 1.0
    return (BETA * m_ratio * r_ratio) / (1.0 + t + sigma)


def frame_cell(frame, counts, calibration_class, cause, t=0.0, sigma=0.0):
    """Cellule de mesure d'un cadre. `counts` doit porter les quatre proxys ;
    toute clé absente ou None déclenche le veto conservateur nommé."""
    required = ["mission_aligned", "mission_applicable",
                "relations_coherent", "relations_applicable"]
    missing = sorted(k for k in required if counts.get(k) is None)
    if missing:
        return conservative_cell(frame, "donnée absente: %s" % ", ".join(missing))
    s = s_score(counts["mission_aligned"], counts["mission_applicable"],
                counts["relations_coherent"], counts["relations_applicable"],
                t=t, sigma=sigma)
    s = max(0.0, min(100.0, s))
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
        "before": before,
        "after": after,
        "delta_s_frames": delta_frames,
        "overall_delta_s": after["overall_point"] - before["overall_point"],
        "runtime_promotion": False,
        "promotion_scope": "DRY_RUN_ONLY",
    }
