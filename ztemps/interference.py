"""Accumulateur et lisibilité — le modèle à deux branches.

Ce module sépare deux grandeurs que la loi candidate confond aujourd'hui.

Un interféromètre à deux branches est le cas canonique où « deux histoires
produisent deux temps propres ». Il fait apparaître **deux quantités
distinctes** :

- la **phase** `φ_i = ω_i · t`, qui **s'accumule**. C'est elle qui porte la
  différence de temps propre : `Δφ = ω_0 (τ_L − τ_R)` ;
- la **visibilité** `V = |⟨Ψ_L|Ψ_R⟩|`, qui **décroît**. C'est elle que mesure
  le profil `C` de Z-TEMPS.

Les deux sont indépendantes. Un interféromètre parfaitement cohérent (`V = 1`,
aucune décohérence) accumule tout de même `Δφ ≠ 0`.

Or `τ_Z = Σ (1 − C)` accumule la décroissance de la **visibilité**. Sur le cas
qui motive tout le cadre, il lit donc **zéro** là où la physique lit `Δφ`.

Le vocabulaire retenu ici :

```text
accumulateur   ce qui croît et porte le temps        (φ, la phase)
lisibilité     ce qui décroît et rend φ mesurable    (V, la visibilité)
```
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class Branch:
    """Une histoire relationnelle : son taux d'accumulation propre."""

    label: str
    rate: float  # ω_i — vitesse d'accumulation de phase le long de cette branche

    def phase(self, t: float) -> float:
        return self.rate * t


@dataclass(frozen=True)
class TwoBranchRun:
    """Trajectoire d'un objet à deux histoires, échantillonnée."""

    times: tuple[float, ...]
    accumulator: tuple[float, ...]  # Δφ(t) — la différence de phase
    readability: tuple[float, ...]  # V(t) — la visibilité

    def interference(self) -> tuple[float, ...]:
        """P(t) = ½ (1 + V cos Δφ) — ce qu'un détecteur mesure réellement."""
        return tuple(
            0.5 * (1.0 + v * math.cos(d))
            for v, d in zip(self.readability, self.accumulator)
        )

    @property
    def accumulated(self) -> float:
        return self.accumulator[-1]

    @property
    def final_readability(self) -> float:
        return self.readability[-1]


def two_branch_run(
    left: Branch,
    right: Branch,
    *,
    n_steps: int = 200,
    dt: float = 0.02,
    coherence_time: float | None = None,
    beta: float = 2.0,
) -> TwoBranchRun:
    """Deux branches de taux différents, avec ou sans perte de lisibilité.

    `coherence_time=None` décrit un interféromètre **fermé** : `V = 1` partout.
    C'est le cas décisif, parce que la phase y accumule sans qu'aucune
    cohérence ne soit perdue.
    """
    times, accumulator, readability = [], [], []
    for k in range(n_steps + 1):
        t = k * dt
        times.append(t)
        accumulator.append(left.phase(t) - right.phase(t))
        readability.append(
            1.0
            if coherence_time is None
            else math.exp(-((t / coherence_time) ** beta))
        )
    return TwoBranchRun(tuple(times), tuple(accumulator), tuple(readability))


def recoverable_difference(run: TwoBranchRun) -> tuple[float, ...]:
    """`V · |Δφ|` — la part de l'accumulation encore lisible dans la mesure.

    C'est la grandeur qui articule les deux rôles : elle vaut `|Δφ|` tant que la
    lisibilité est parfaite, et tend vers zéro quand l'objet décohère — sans que
    `Δφ` lui-même cesse d'exister.

    Cela donne une lecture exacte du §4 de la spécification : « `C = 0` :
    dissolution de l'objet ; temps propre ultérieur indéfini ». **Le temps ne
    s'arrête pas, il devient illisible.**
    """
    return tuple(v * abs(d) for v, d in zip(run.readability, run.accumulator))


def pendulum_analogue(
    drift_rates: Sequence[float],
    *,
    n_steps: int = 200,
    dt: float = 0.02,
) -> tuple[tuple[float, ...], ...]:
    """Le pendant classique : deux pendules de même rythme visible.

    `f_i = h(X_i)` est identique pour les deux, alors que `X_i` dérive
    différemment. La projection `h` est non injective : c'est **elle** qui joue
    le rôle de la visibilité, et non le changement d'état lui-même.

    Renvoie les dérives internes `X_i(t)`, dont la différence est l'analogue
    exact de `Δφ`.
    """
    return tuple(
        tuple(rate * k * dt for k in range(n_steps + 1)) for rate in drift_rates
    )
