"""Essai ROLES-007 — `τ_Z` suit-il l'accumulateur ou la lisibilité ?

Protocole figé dans `PRE-ENREGISTREMENT-ROLES-007.md`.

    python -m experiments.run_roles_007
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from ztemps import Scale, Transformation, Weights, tau_z
from ztemps.interference import Branch, recoverable_difference, two_branch_run
from ztemps.ordinal import spearman_rho
from ztemps.proxy import ObjectSpec, OverlapRatioProxy

# --- Constantes pré-enregistrées (§4) -------------------------------------
OMEGA_LEFT = 1.00
OMEGA_RIGHT = 1.03
N_STEPS = 200
DT = 0.02
COHERENCE_TIME = 3.0
BETA = 2.0
R1_MIN_PHASE = 0.1
R2_MAX_TAU_Z = 1e-12
R3_MIN_TAU_Z = 0.5
R4_MAX_GAP = 1e-12

N_CONSTITUENTS = 4
SPEC = ObjectSpec(
    constituents=frozenset(range(N_CONSTITUENTS)),
    adjacency=frozenset((i, i + 1) for i in range(N_CONSTITUENTS - 1)),
)
PAIRS = [
    (i, j) for i in range(N_CONSTITUENTS) for j in range(N_CONSTITUENTS) if i < j
]


def cumulative_tau_z(readability) -> list[float]:
    """`τ_Z` calculé sur l'objet dont les relations portent la visibilité."""
    proxy = OverlapRatioProxy(spec=SPEC)
    states = [{p: v for p in PAIRS} for v in readability]
    events = [
        Transformation(
            sample_id=f"pas-{k}",
            profile=proxy(states[k - 1], states[k]),
            object_id="interferometre",
            proxy_id="OverlapRatioProxy",
        )
        for k in range(1, len(states))
    ]
    weights = Weights({s: 0.25 for s in Scale}, calibration_sample_ids={"roles-007"})
    return [
        tau_z(
            events[:k],
            weights,
            tau_star=1.0,
            dissolving_scales={Scale.OBJET},
        ).value
        for k in range(1, len(events) + 1)
    ]


def main() -> int:
    left = Branch("L", OMEGA_LEFT)
    right = Branch("R", OMEGA_RIGHT)

    closed = two_branch_run(left, right, n_steps=N_STEPS, dt=DT, coherence_time=None)
    open_ = two_branch_run(
        left,
        right,
        n_steps=N_STEPS,
        dt=DT,
        coherence_time=COHERENCE_TIME,
        beta=BETA,
    )

    tau_closed = cumulative_tau_z(closed.readability)
    tau_open = cumulative_tau_z(open_.readability)

    results = {
        "essai": "ROLES-007",
        "ferme": {
            "phase_finale": abs(closed.accumulated),
            "visibilite_finale": closed.final_readability,
            "tau_z_final": tau_closed[-1],
        },
        "avec_decoherence": {
            "phase_finale": abs(open_.accumulated),
            "visibilite_finale": open_.final_readability,
            "tau_z_final": tau_open[-1],
        },
        "tests": {},
    }

    # R1 — la phase accumule dans l'interféromètre fermé.
    results["tests"]["R1_phase_accumule"] = {
        "phase": abs(closed.accumulated),
        "seuil_minimal": R1_MIN_PHASE,
        "passe": abs(closed.accumulated) > R1_MIN_PHASE,
    }

    # R2 — mais τ_Z y reste nul. Critère décisif.
    results["tests"]["R2_tau_z_nul_si_ferme"] = {
        "tau_z": tau_closed[-1],
        "seuil": R2_MAX_TAU_Z,
        "passe": tau_closed[-1] < R2_MAX_TAU_Z,
        "note": "un succès ici est une mauvaise nouvelle pour la loi",
    }

    # R3 — τ_Z ne devient non nul qu'avec la décohérence.
    results["tests"]["R3_tau_z_suit_la_decoherence"] = {
        "tau_z": tau_open[-1],
        "seuil_minimal": R3_MIN_TAU_Z,
        "passe": tau_open[-1] > R3_MIN_TAU_Z,
    }

    # R4 — la décohérence ne change pas l'accumulateur.
    gap = abs(abs(open_.accumulated) - abs(closed.accumulated))
    results["tests"]["R4_phase_insensible_a_la_decoherence"] = {
        "ecart": gap,
        "seuil": R4_MAX_GAP,
        "passe": gap < R4_MAX_GAP,
    }

    # R5 — τ_Z corrèle avec la lisibilité perdue, pas avec l'accumulateur.
    times = open_.times[1:]
    minus_log_v = [
        -math.log(v) if v > 0 else float("inf") for v in open_.readability[1:]
    ]
    phases = [abs(d) for d in open_.accumulator[1:]]
    usable = [
        i
        for i, value in enumerate(minus_log_v)
        if math.isfinite(value) and value > 0 and phases[i] > 0
    ][:60]
    rho_readability = spearman_rho(
        [tau_open[i] for i in usable], [minus_log_v[i] for i in usable]
    )
    rho_phase = spearman_rho(
        [tau_open[i] for i in usable], [phases[i] for i in usable]
    )
    results["tests"]["R5_correlation"] = {
        "rho_avec_moins_ln_V": rho_readability,
        "rho_avec_phase": rho_phase,
        "passe": rho_readability > rho_phase,
        "note": (
            "les deux peuvent être élevés car tout croît avec t ; "
            "ce qui compte est l'écart, et R2 est le critère décisif"
        ),
    }

    # Grandeur articulant les deux rôles, non pré-enregistrée comme critère.
    recoverable = recoverable_difference(open_)
    results["lisible"] = {
        "V_fois_phase_au_debut": recoverable[1],
        "V_fois_phase_a_la_fin": recoverable[-1],
        "phase_a_la_fin": abs(open_.accumulated),
    }

    results["verdict"] = (
        "DISSOCIATION_CONFIRMEE"
        if all(t["passe"] for t in results["tests"].values())
        else "DISSOCIATION_NON_ETABLIE"
    )

    out = Path(__file__).with_name("resultats_007.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
