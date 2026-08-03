"""Essai TAU-004 — `τ_*` dépend-il du taux du système ?

Protocole figé dans `PRE-ENREGISTREMENT-TAU-004.md`.

    python -m experiments.run_tau_004
"""

from __future__ import annotations

import json
import math
import statistics
import sys
from pathlib import Path

from ztemps import Scale, Transformation, Weights, tau_z
from ztemps.proxy import OverlapRatioProxy
from ztemps.systems import dephasing_family

# --- Constantes pré-enregistrées (§2, §3) ---------------------------------
DT = 0.25
N_STEPS = 24
SEED = 20400
GAMMAS = (0.05, 0.1, 0.2, 0.35, 0.8, 1.6)
GAMMA_REFERENCE = 0.35
GAMMA_TRANSFER_TARGET = 1.6
SMALL_REGIME = (0.05, 0.1, 0.2)
DISSOLVING_SCALES = frozenset({Scale.OBJET})
UNIFORM_WEIGHT = 0.25
H1_MAX_RELATIVE_GAP = 1e-9
H2_MIN_ERROR = 0.15
H3_MAX_SPREAD = 0.10


def cumulative_sums(gamma: float) -> tuple[list[float], list[float]]:
    """S(N) sans τ_*, et les temps de référence associés."""
    run = dephasing_family(gamma=gamma, dt=DT, n_steps=N_STEPS, seed=SEED)
    proxy = OverlapRatioProxy(spec=run.spec)
    events = [
        Transformation(
            sample_id=f"gamma{gamma}-{index}",
            profile=proxy(run.states[index - 1], run.states[index]),
            object_id=f"décohérence-γ{gamma}",
            proxy_id="OverlapRatioProxy (D1)",
        )
        for index in range(1, len(run.states))
    ]
    weights = Weights(
        {s: UNIFORM_WEIGHT for s in Scale},
        calibration_sample_ids={e.sample_id for e in events},
    )
    sums = [
        tau_z(
            events[:i], weights, tau_star=1.0, dissolving_scales=DISSOLVING_SCALES
        ).value
        for i in range(1, len(events) + 1)
    ]
    return sums, list(run.reference_times[1:])


def fit_tau_star(sums: list[float], reference: list[float]) -> float:
    return sum(s * t for s, t in zip(sums, reference)) / sum(s * s for s in sums)


def median_relative_error(
    sums: list[float], reference: list[float], tau_star: float
) -> float:
    return statistics.median(
        abs(tau_star * s - t) / t for s, t in zip(sums, reference) if t != 0.0
    )


def analytic_tau_star(gamma: float) -> float:
    """Prédiction de l'essai 003 : τ_* = Δt / (1 - e^(-γΔt))."""
    return DT / (1.0 - math.exp(-gamma * DT))


def main() -> int:
    fitted, errors_from_reference = {}, {}
    for gamma in GAMMAS:
        sums, reference = cumulative_sums(gamma)
        fitted[gamma] = fit_tau_star(sums, reference)

    tau_reference = fitted[GAMMA_REFERENCE]
    for gamma in GAMMAS:
        sums, reference = cumulative_sums(gamma)
        errors_from_reference[gamma] = median_relative_error(
            sums, reference, tau_reference
        )

    # H1 — le τ_* ajusté égale-t-il la prédiction analytique ?
    h1_gaps = {
        gamma: abs(fitted[gamma] - analytic_tau_star(gamma)) / analytic_tau_star(gamma)
        for gamma in GAMMAS
    }
    # H2 — τ_* transfère-t-il d'un taux à un autre ?
    h2_error = errors_from_reference[GAMMA_TRANSFER_TARGET]
    # H3 — la dépendance est-elle en 1/γ dans le régime γΔt << 1 ?
    products = [gamma * fitted[gamma] for gamma in SMALL_REGIME]
    h3_spread = (max(products) - min(products)) / statistics.mean(products)

    results = {
        "essai": "TAU-004",
        "tau_star_ajuste": {str(g): fitted[g] for g in GAMMAS},
        "tau_star_analytique": {str(g): analytic_tau_star(g) for g in GAMMAS},
        "erreur_avec_tau_de_gamma_reference": {
            str(g): errors_from_reference[g] for g in GAMMAS
        },
        "tests": {
            "H1_prediction_analytique": {
                "ecart_relatif_max": max(h1_gaps.values()),
                "seuil": H1_MAX_RELATIVE_GAP,
                "passe": max(h1_gaps.values()) <= H1_MAX_RELATIVE_GAP,
            },
            "H2_non_transferabilite": {
                "e_rel": h2_error,
                "seuil_minimal": H2_MIN_ERROR,
                "passe": h2_error > H2_MIN_ERROR,
                "note": "un succès ici est une mauvaise nouvelle pour la loi",
            },
            "H3_dependance_en_1_sur_gamma": {
                "produits_gamma_tau": {
                    str(g): g * fitted[g] for g in SMALL_REGIME
                },
                "dispersion_relative": h3_spread,
                "seuil": H3_MAX_SPREAD,
                "passe": h3_spread <= H3_MAX_SPREAD,
            },
        },
    }
    results["verdict"] = (
        "PREDICTION_CONFIRMEE"
        if all(t["passe"] for t in results["tests"].values())
        else "PREDICTION_REFUTEE"
    )

    out = Path(__file__).with_name("resultats_004.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
