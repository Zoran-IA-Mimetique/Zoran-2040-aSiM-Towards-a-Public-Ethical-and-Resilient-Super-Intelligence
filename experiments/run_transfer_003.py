"""Essai PROXY-C-003 — PROXY-C-001 rejoué sous les décisions D1 et D2.

Protocole figé dans `PRE-ENREGISTREMENT-PROXY-C-003.md`. Identique à l'essai
001 sauf sur deux points, décidés dans `DECISIONS-SPEC-001.md` :

- **D1** : proxy à recouvrement continu (`OverlapRatioProxy`), sans tolérance ;
- **D2** : seule l'échelle `OBJET` dissout l'objet.

Mêmes familles, graines, poids, critères et seuils que 001 : c'est ce qui rend
la comparaison 001 ↔ 003 attribuable aux deux décisions et à rien d'autre.

    python -m experiments.run_transfer_003
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

from ztemps import (
    CoherenceProfile,
    Scale,
    Transformation,
    Weights,
    check_frame_conservation,
    check_representation_invariance,
    tau_z,
)
from ztemps.proxy import OverlapRatioProxy
from ztemps.systems import SyntheticRun, dephasing_family, perturbed_memory_family

# --- Constantes pré-enregistrées, identiques à l'essai 001 ----------------
# D2 : l'échelle porteuse de l'identité, et la seule qui dissout l'objet.
DISSOLVING_SCALES = frozenset({Scale.OBJET})
UNIFORM_WEIGHT = 0.25
SEED_CALIBRATION = 20400
SEED_REPLICATE = 20402
SEED_MEMORY = 20401
THRESHOLD_INTRA = 0.15
THRESHOLD_INTER = 0.30
THRESHOLD_INVARIANCE = 1e-9


def events_of(run: SyntheticRun) -> list[Transformation]:
    """Une transformation par pas ; `N` est l'index, aucun temps n'y entre."""
    proxy = OverlapRatioProxy(spec=run.spec)
    return [
        Transformation(
            sample_id=f"{run.label}-{index}",
            profile=proxy(run.states[index - 1], run.states[index]),
            object_id=run.label,
            proxy_id="OverlapRatioProxy (D1, sans tolérance)",
        )
        for index in range(1, len(run.states))
    ]


def cumulative_measure(
    run: SyntheticRun, weights: Weights, *, as_evaluation: bool = False
) -> list[float]:
    """S(N) = Σ[e=1..N] D(C(e)), sans τ_*, pour chaque N.

    `as_evaluation=True` active le contrôle du §3 : si ce run a servi à calibrer
    les poids, `tau_z` refuse de l'évaluer.
    """
    events = events_of(run)
    ids = {e.sample_id for e in events} if as_evaluation else None
    sums = []
    for index in range(1, len(events) + 1):
        result = tau_z(
            events[:index],
            weights,
            tau_star=1.0,
            evaluation_sample_ids=ids,
            dissolving_scales=DISSOLVING_SCALES,
        )
        sums.append(result.value)
    return sums


def fit_tau_star(sums: list[float], reference: list[float]) -> float | None:
    """Moindres carrés par l'origine : τ_* = Σ S·t / Σ S².

    Renvoie `None` si `Σ S² = 0` : aucune transformation cohérentielle n'a été
    accumulée, et `τ_*` est alors **indéterminé**. Ce cas est enregistré comme
    résultat, pas traité comme une panne : un instrument qui ne mesure rien doit
    le dire, pas s'interrompre.
    """
    denominator = sum(s * s for s in sums)
    if denominator == 0.0:
        return None
    return sum(s * t for s, t in zip(sums, reference)) / denominator


def median_relative_error(
    sums: list[float], reference: list[float], tau_star: float | None
) -> float | None:
    """Erreur relative médiane, ou `None` si τ_* est indéterminé."""
    if tau_star is None:
        return None
    errors = [abs(tau_star * s - t) / t for s, t in zip(sums, reference) if t != 0.0]
    return statistics.median(errors) if errors else None


def passes(error: float | None, threshold: float) -> bool:
    """Un critère non mesurable ne passe pas : l'absence de mesure n'est pas un succès."""
    return error is not None and error <= threshold


def is_strictly_increasing(values: list[float]) -> bool:
    return all(b > a for a, b in zip(values, values[1:]))


def relabelling_invariance(run: SyntheticRun) -> float:
    """T4 — écart maximal du profil sous réétiquetage des constituants."""
    proxy = OverlapRatioProxy(spec=run.spec)
    # L'opération doit appartenir au groupe **déclaré** de l'objet. Appliquer un
    # réétiquetage qui n'en est pas membre ne teste pas l'invariance : il teste
    # une invariance que la spécification n'a jamais demandée.
    reversal = run.spec.symmetries[-1]

    def relabel(state):
        return {
            tuple(sorted((reversal[i], reversal[j]))): v for (i, j), v in state.items()
        }

    before, after = run.states[0], run.states[1]

    def as_proxy(observables):
        return proxy(observables["before"], observables["after"])

    report = check_representation_invariance(
        as_proxy,
        {"before": before, "after": after},
        [lambda o: {"before": relabel(o["before"]), "after": relabel(o["after"])}],
        tolerance=THRESHOLD_INVARIANCE,
        label="T4 — invariance par réétiquetage",
    )
    return report.worst_deviation


def main() -> int:
    calibration = dephasing_family(seed=SEED_CALIBRATION)
    replicate = dephasing_family(seed=SEED_REPLICATE)
    memory = perturbed_memory_family(seed=SEED_MEMORY)

    calibration_ids = {e.sample_id for e in events_of(calibration)}
    weights = Weights(
        {s: UNIFORM_WEIGHT for s in Scale}, calibration_sample_ids=calibration_ids
    )

    sums_cal = cumulative_measure(calibration, weights)
    tau_star = fit_tau_star(sums_cal, list(calibration.reference_times[1:]))

    results = {
        "essai": "PROXY-C-003",
        "decisions": ["D1 recouvrement continu", "D2 dissolution par OBJET seul"],
        "tau_star": tau_star,
        "poids": "uniformes 1/4",
        "tests": {},
    }

    # T1 — monotonie (P5 au sens faible)
    monotone = {}
    for run in (calibration, replicate, memory):
        sums = cumulative_measure(run, weights)
        monotone[run.label] = is_strictly_increasing(sums)
    results["tests"]["T1_monotonie"] = {
        "par_famille": monotone,
        "passe": all(monotone.values()),
    }

    # T2 — transfert intra-famille
    sums_rep = cumulative_measure(replicate, weights, as_evaluation=True)
    e_intra = median_relative_error(
        sums_rep, list(replicate.reference_times[1:]), tau_star
    )
    results["tests"]["T2_transfert_intra"] = {
        "e_rel": e_intra,
        "seuil": THRESHOLD_INTRA,
        "passe": passes(e_intra, THRESHOLD_INTRA),
    }

    # T3 — transfert inter-familles (le test du §10)
    sums_mem = cumulative_measure(memory, weights, as_evaluation=True)
    e_inter = median_relative_error(
        sums_mem, list(memory.reference_times[1:]), tau_star
    )
    results["tests"]["T3_transfert_inter"] = {
        "e_rel": e_inter,
        "seuil": THRESHOLD_INTER,
        "passe": passes(e_inter, THRESHOLD_INTER),
    }

    # T4 — invariance de représentation
    deviation = max(relabelling_invariance(run) for run in (calibration, memory))
    results["tests"]["T4_invariance"] = {
        "ecart_max": deviation,
        "seuil": THRESHOLD_INVARIANCE,
        "passe": deviation <= THRESHOLD_INVARIANCE,
    }

    # T5 — conservation des cadres
    frame = check_frame_conservation(weights.values)
    results["tests"]["T5_cadres"] = {"passe": bool(frame), "detail": frame.detail}

    results["verdict"] = (
        "TOUS_CRITERES_PASSES"
        if all(t["passe"] for t in results["tests"].values())
        else "ECHEC"
    )

    # Diagnostic, non pré-enregistré comme critère : de quoi interpréter un
    # échec sans avoir à relancer l'essai.
    results["diagnostic"] = {}
    for run in (calibration, memory):
        events = events_of(run)
        integration = tau_z(
            events, weights, tau_star=1.0, dissolving_scales=DISSOLVING_SCALES
        )
        results["diagnostic"][run.label] = {
            "n_pas": len(events),
            "n_pas_integres": integration.n_integrated,
            "dissous_au_pas": integration.dissolved_at,
            "echelles_dissoutes": [
                s.name for s in integration.dissolution_scales
            ],
            "profils": {
                f"pas_{k}": {s.name: events[k - 1].profile[s] for s in Scale}
                for k in (1, 2, 3, len(events) // 2, len(events))
            },
        }

    out = Path(__file__).with_name("resultats_003.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
