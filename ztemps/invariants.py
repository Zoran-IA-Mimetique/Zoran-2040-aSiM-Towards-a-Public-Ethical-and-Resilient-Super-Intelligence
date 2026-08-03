"""Vérificateurs des invariants obligatoires — Z-TEMPS-PHYS-V1 §5.

Ces fonctions ne *prouvent* pas les invariants : elles les testent sur un proxy
donné et un ensemble d'opérations donné. Un test qui passe n'établit pas
l'invariance ; un test qui échoue réfute le proxy. C'est le sens du §7 :
`τ_Z` qui dépend du choix de représentation est un falsificateur, pas un défaut
d'implémentation à corriger discrètement.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Mapping, Sequence

from .profile import CoherenceProfile, Scale

Observables = Mapping[str, object]
Proxy = Callable[[Observables], CoherenceProfile]
Operation = Callable[[Observables], Observables]

#: Noms d'observables trahissant l'entrée d'un temps dans la définition de `C`.
_TIME_LIKE = re.compile(
    r"(^|_)(t|dt|time|temps|timestamp|horodat\w*|date|clock|horloge|tick|"
    r"duree|duration|epoch|instant|delay|latency|latence)($|_)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class InvariantReport:
    """Résultat d'un test d'invariant, avec l'écart mesuré."""

    invariant: str
    passed: bool
    worst_deviation: float
    detail: str = ""

    def __bool__(self) -> bool:
        return self.passed


def check_no_time_inputs(observables: Observables) -> InvariantReport:
    """Invariant 3 — absence de temps dans la définition de `C` et de `N`.

    Contrôle nominal, donc faillible : un observable nommé `x_3` qui *est* un
    horodatage passera. C'est un garde-fou contre l'erreur ordinaire, pas une
    preuve d'absence de temps primitif.
    """
    offenders = sorted(k for k in observables if _TIME_LIKE.search(str(k)))
    return InvariantReport(
        invariant="I3 — absence de temps primitif",
        passed=not offenders,
        worst_deviation=float(len(offenders)),
        detail=(
            f"observables temporels interdits en entrée de C : {offenders}"
            if offenders
            else "aucun observable nommé comme une grandeur temporelle"
        ),
    )


def check_representation_invariance(
    proxy: Proxy,
    observables: Observables,
    operations: Sequence[Operation],
    *,
    tolerance: float = 1e-9,
    label: str = "I1/I2/I4 — invariance de représentation",
) -> InvariantReport:
    """Invariants 1, 2 et 4 — invariance par coordonnées, symétries, base d'observables.

    Les trois invariants ont la même forme testable : `C(x)` doit égaler
    `C(g·x)` pour toute opération `g` du groupe déclaré. Ils diffèrent seulement
    par le groupe que l'appelant fournit.
    """
    reference = proxy(observables)
    worst = 0.0
    failures: list[str] = []
    for index, op in enumerate(operations):
        transformed = proxy(op(observables))
        for scale in Scale:
            deviation = abs(transformed[scale] - reference[scale])
            worst = max(worst, deviation)
            if deviation > tolerance:
                failures.append(
                    f"op#{index} écarte C_{scale.name} de {deviation:.3e}"
                )
    return InvariantReport(
        invariant=label,
        passed=not failures,
        worst_deviation=worst,
        detail=(
            "; ".join(failures[:5])
            if failures
            else f"{len(operations)} opération(s), écart max {worst:.3e}"
        ),
    )


def check_frame_conservation(weights: Mapping[Scale, float]) -> InvariantReport:
    """Invariant 5 — conservation des cadres inférieurs et pairs lors de l'agrégation.

    Lecture retenue : l'agrégation multi-échelle ne peut ni omettre une échelle
    ni lui donner un poids nul, faute de quoi un cadre supérieur effacerait un
    cadre inférieur. C'est une *lecture* de l'invariant, à confirmer par les
    auteurs de la spécification — elle est signalée comme telle dans la
    passerelle.
    """
    missing = sorted(s.name for s in Scale if s not in weights)
    nulls = sorted(s.name for s in Scale if weights.get(s, 1.0) <= 0.0)
    problems = []
    if missing:
        problems.append(f"échelles absentes de l'agrégation : {missing}")
    if nulls:
        problems.append(f"échelles écrasées par un poids nul : {nulls}")
    return InvariantReport(
        invariant="I5 — conservation des cadres",
        passed=not problems,
        worst_deviation=float(len(missing) + len(nulls)),
        detail="; ".join(problems) if problems else "les quatre cadres sont conservés",
    )
