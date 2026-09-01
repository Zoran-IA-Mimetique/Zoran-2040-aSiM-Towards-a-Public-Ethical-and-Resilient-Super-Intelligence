"""Essai GRANULARITE-002 — exécution du protocole pré-enregistré.

Protocole figé dans `PRE-ENREGISTREMENT-GRANULARITE-002.md`.

    python -m experiments.run_granularity_002
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

from ztemps.granularity import (
    STATIONARY_NOISE_EXPONENT,
    cumulative_variation,
    decompose,
    net_variation,
    scaling_exponent,
    variation_spectrum,
)

# --- Constantes pré-enregistrées (§4) -------------------------------------
LENGTH = 4096
BLOCKS = (1, 2, 4, 8, 16, 32)
SEED_NOISE = 30001
SEED_MIXTURE = 30002
G1_MAX = 0.15
G2_RANGE = (1.35, 1.65)
G3_MAX_GAP = 0.10

# Trois nombres rapportés par le pilote multi-domaine V1.5, oscillateur lévité.
PILOT_FINE = 28.717
PILOT_COARSE_16 = 0.695
PILOT_NET = 0.349
PILOT_BLOCK = 16


def smooth_ramp(length: int = LENGTH, amplitude: float = 1.0) -> list[float]:
    """Signal lisse et monotone : la transformation sans le bruit."""
    return [amplitude * i / (length - 1) for i in range(length)]


def stationary_noise(
    length: int = LENGTH, sigma: float = 1.0, seed: int = SEED_NOISE
) -> list[float]:
    """Bruit stationnaire additif : l'échantillonnage sans la transformation."""
    rng = random.Random(seed)
    return [rng.gauss(0.0, sigma) for _ in range(length)]


def mixture(
    length: int = LENGTH,
    amplitude: float = 1.0,
    sigma: float = 0.05,
    seed: int = SEED_MIXTURE,
) -> tuple[list[float], float]:
    """Signal + bruit, avec la fraction de bruit vraie mesurée séparément."""
    ramp = smooth_ramp(length, amplitude)
    noise = stationary_noise(length, sigma, seed)
    combined = [a + b for a, b in zip(ramp, noise)]
    true_noise_fraction = cumulative_variation(noise) / (
        cumulative_variation(noise) + cumulative_variation(ramp)
    )
    return combined, true_noise_fraction


def main() -> int:
    results: dict[str, object] = {"essai": "GRANULARITE-002", "tests": {}}

    # G1 — signal lisse : l'exposant doit être nul
    ramp = smooth_ramp()
    p_ramp = scaling_exponent(variation_spectrum(ramp, BLOCKS))
    results["tests"]["G1_signal_lisse"] = {
        "exposant": p_ramp,
        "seuil": G1_MAX,
        "passe": abs(p_ramp) <= G1_MAX,
    }

    # G2 — bruit stationnaire : l'exposant doit retrouver 1.5
    noise = stationary_noise()
    p_noise = scaling_exponent(variation_spectrum(noise, BLOCKS))
    results["tests"]["G2_bruit_stationnaire"] = {
        "exposant": p_noise,
        "theorie": STATIONARY_NOISE_EXPONENT,
        "intervalle": list(G2_RANGE),
        "passe": G2_RANGE[0] <= p_noise <= G2_RANGE[1],
    }

    # G3 — mélange de composition connue
    combined, true_fraction = mixture()
    spectrum = variation_spectrum(combined, BLOCKS)
    estimated = decompose(
        fine=spectrum[1],
        coarse=spectrum[PILOT_BLOCK],
        block=PILOT_BLOCK,
        net=net_variation(combined),
    )
    gap = abs(estimated.noise_fraction - true_fraction)
    results["tests"]["G3_melange"] = {
        "fraction_bruit_vraie": true_fraction,
        "fraction_bruit_estimee": estimated.noise_fraction,
        "ecart": gap,
        "seuil": G3_MAX_GAP,
        "exposant_estime": estimated.exponent,
        "passe": gap <= G3_MAX_GAP,
    }

    estimator_valid = all(
        results["tests"][k]["passe"]
        for k in ("G1_signal_lisse", "G2_bruit_stationnaire", "G3_melange")
    )

    # G4 — application descriptive aux trois nombres du pilote
    pilot = decompose(
        fine=PILOT_FINE,
        coarse=PILOT_COARSE_16,
        block=PILOT_BLOCK,
        net=PILOT_NET,
    )
    results["tests"]["G4_pilote"] = {
        "interpretable": estimator_valid,
        "exposant_infere": pilot.exponent,
        "part_signal": pilot.signal,
        "part_bruit_granularite_fine": pilot.noise_at_finest,
        "fraction_bruit_minorant": pilot.noise_fraction,
        "hypothese_fermeture": "S = net (signal monotone) — la fraction est un minorant",
        "passe": None,
        "note": "descriptif, sans seuil pré-enregistré",
    }

    results["estimateur_valide"] = estimator_valid
    results["verdict"] = "ESTIMATEUR_VALIDE" if estimator_valid else "ESTIMATEUR_REFUSE"

    out = Path(__file__).with_name("resultats_002.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
