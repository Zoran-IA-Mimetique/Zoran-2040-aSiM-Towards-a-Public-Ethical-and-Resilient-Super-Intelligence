"""Essai FORME-006 — la pente de `τ_Z` suit-elle l'exposant d'étirement ?

Protocole figé dans `PRE-ENREGISTREMENT-FORME-006.md`.

    python -m experiments.run_shape_006                  # validation synthétique
    python -m experiments.run_shape_006 mesures.csv      # sur données réelles

Format du CSV réel : deux colonnes, `t` et amplitude normalisée dans ]0, 1[,
une ligne d'en-tête. Une seule courbe de décroissance par fichier.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from ztemps import Scale, Transformation, Weights, tau_z
from ztemps.proxy import ObjectSpec, OverlapRatioProxy
from ztemps.shape import shape_agreement, stretching_exponent, tau_z_exponent

# --- Constantes pré-enregistrées (§4) -------------------------------------
T_SCALE = 3.0
N_STEPS = 200
DT = 0.02
TAIL = 0.5
BETAS = (0.5, 1.0, 1.5, 2.0)
SHAPE_TOLERANCE = 0.05
FREE_PARAMETER_TOLERANCE = 1e-9
DISSOLVING_SCALES = frozenset({Scale.OBJET})
N_CONSTITUENTS = 4

SPEC = ObjectSpec(
    constituents=frozenset(range(N_CONSTITUENTS)),
    adjacency=frozenset((i, i + 1) for i in range(N_CONSTITUENTS - 1)),
)
PAIRS = [
    (i, j) for i in range(N_CONSTITUENTS) for j in range(N_CONSTITUENTS) if i < j
]


def envelope_states(amplitudes: list[float]) -> list[dict[tuple[int, int], float]]:
    """Toutes les relations suivent la même enveloppe : le cas le plus simple."""
    return [{p: a for p in PAIRS} for a in amplitudes]


def cumulative_tau_z(
    states: list[dict[tuple[int, int], float]],
    *,
    tau_star: float = 1.0,
    weight: dict[Scale, float] | None = None,
) -> list[float]:
    proxy = OverlapRatioProxy(spec=SPEC)
    events = [
        Transformation(
            sample_id=f"pas-{k}",
            profile=proxy(states[k - 1], states[k]),
            object_id="enveloppe",
            proxy_id="OverlapRatioProxy",
        )
        for k in range(1, len(states))
    ]
    weights = Weights(
        weight or {s: 0.25 for s in Scale}, calibration_sample_ids={"forme-006"}
    )
    return [
        tau_z(
            events[:k],
            weights,
            tau_star=tau_star,
            dissolving_scales=DISSOLVING_SCALES,
        ).value
        for k in range(1, len(events) + 1)
    ]


def synthetic(beta: float) -> tuple[list[float], list[float]]:
    times = [k * DT for k in range(N_STEPS + 1)]
    amplitudes = [math.exp(-((t / T_SCALE) ** beta)) for t in times]
    return times, amplitudes


def run_synthetic() -> dict[str, object]:
    results: dict[str, object] = {"essai": "FORME-006", "tests": {}, "par_beta": {}}

    worst_shape, worst_envelope = 0.0, 0.0
    for beta in BETAS:
        times, amplitudes = synthetic(beta)
        cumulative = cumulative_tau_z(envelope_states(amplitudes))
        slope = tau_z_exponent(times[1:], cumulative, tail=TAIL)
        beta_hat = stretching_exponent(times, amplitudes)
        worst_shape = max(worst_shape, abs(slope.exponent - beta))
        worst_envelope = max(worst_envelope, abs(beta_hat.exponent - beta))
        results["par_beta"][str(beta)] = {
            "pente_tau_z": slope.exponent,
            "pente_r2": slope.r_squared,
            "beta_ajuste_sur_enveloppe": beta_hat.exponent,
            "ecart_a_beta": abs(slope.exponent - beta),
        }

    results["tests"]["F1_F2_F3_forme"] = {
        "ecart_max": worst_shape,
        "seuil": SHAPE_TOLERANCE,
        "passe": worst_shape <= SHAPE_TOLERANCE,
    }
    results["tests"]["F6_enveloppe"] = {
        "ecart_max": worst_envelope,
        "seuil": SHAPE_TOLERANCE,
        "passe": worst_envelope <= SHAPE_TOLERANCE,
    }

    # F4 — la pente ne doit pas dépendre de τ_*.
    times, amplitudes = synthetic(2.0)
    states = envelope_states(amplitudes)
    reference = tau_z_exponent(
        times[1:], cumulative_tau_z(states, tau_star=1.0), tail=TAIL
    ).exponent
    scaled = tau_z_exponent(
        times[1:], cumulative_tau_z(states, tau_star=1000.0), tail=TAIL
    ).exponent
    results["tests"]["F4_independance_tau_star"] = {
        "ecart": abs(scaled - reference),
        "seuil": FREE_PARAMETER_TOLERANCE,
        "passe": abs(scaled - reference) <= FREE_PARAMETER_TOLERANCE,
    }

    # F5 — ni des poids, tant qu'ils sont positifs.
    weight_sets = [
        {s: 0.25 for s in Scale},
        {Scale.LOCAL: 0.7, Scale.OBJET: 0.1, Scale.CADRE: 0.1, Scale.GLOBAL: 0.1},
        {Scale.LOCAL: 0.05, Scale.OBJET: 0.05, Scale.CADRE: 0.4, Scale.GLOBAL: 0.5},
    ]
    slopes = [
        tau_z_exponent(times[1:], cumulative_tau_z(states, weight=w), tail=TAIL).exponent
        for w in weight_sets
    ]
    spread = max(slopes) - min(slopes)
    results["tests"]["F5_independance_poids"] = {
        "pentes": slopes,
        "dispersion": spread,
        "seuil": FREE_PARAMETER_TOLERANCE,
        "passe": spread <= FREE_PARAMETER_TOLERANCE,
    }

    results["verdict"] = (
        "INSTRUMENT_VALIDE"
        if all(t["passe"] for t in results["tests"].values())
        else "SANS_VALEUR_DE_TEST"
    )
    return results


def run_measured(path: Path) -> dict[str, object]:
    """Applique le test à une courbe de décroissance réelle."""
    times, amplitudes = [], []
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines()):
        if not line.strip() or index == 0:
            continue
        raw_t, raw_a = line.replace(";", ",").split(",")[:2]
        times.append(float(raw_t))
        amplitudes.append(float(raw_a))
    if len(times) < 10:
        raise ValueError("au moins dix points sont nécessaires")

    cumulative = cumulative_tau_z(envelope_states(amplitudes))
    verdict = shape_agreement(
        times, amplitudes, [0.0] + cumulative, tolerance=SHAPE_TOLERANCE, tail=TAIL
    )
    return {
        "essai": "FORME-006 — données mesurées",
        "fichier": str(path),
        "n_points": len(times),
        "resultat": verdict,
        "verdict": "ACCORD" if verdict["accord"] else "DESACCORD_LOI_REFUTEE",
    }


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        results = run_measured(Path(argv[1]))
        out = Path(__file__).with_name("resultats_006_mesure.json")
    else:
        results = run_synthetic()
        out = Path(__file__).with_name("resultats_006.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
