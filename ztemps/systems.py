"""Deux des trois familles du protocole §8, en version **synthétique**.

Avertissement, qui n'est pas une formalité : ce module ne contient aucune
donnée physique. Ce sont des simulations dont la dynamique est posée par nous.
Elles peuvent donc *réfuter* la machinerie (montrer qu'elle est incohérente ou
qu'aucun `τ_*` ne transfère même dans un cas que nous contrôlons entièrement),
mais elles ne peuvent **rien confirmer** de la loi candidate. La famille 1 du §8
— horloge physique de référence — reste absente.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from .proxy import ObjectSpec, RelationalState


@dataclass(frozen=True)
class SyntheticRun:
    """Séquence de configurations relationnelles et son temps de référence.

    `reference_times[k]` est le temps de référence de `states[k]`. Il sert
    uniquement à *tester* la prédiction, jamais à définir `C` (§8).
    """

    label: str
    spec: ObjectSpec
    states: tuple[RelationalState, ...]
    reference_times: tuple[float, ...]

    def __post_init__(self) -> None:
        if len(self.states) != len(self.reference_times):
            raise ValueError("un temps de référence par configuration")


def _complete_pairs(nodes: range) -> list[tuple[int, int]]:
    return [(i, j) for i in nodes for j in nodes if i < j]


def path_symmetries(n: int) -> tuple[dict[int, int], ...]:
    """Groupe d'automorphismes d'une chaîne à `n` sommets : {identité, retournement}.

    Déclaré explicitement parce que le §2 exige un alignement « par le groupe de
    symétries déclaré ». Une rotation cyclique n'en fait **pas** partie : elle
    n'est un automorphisme que d'un anneau, pas d'une chaîne.
    """
    return ({i: i for i in range(n)}, {i: n - 1 - i for i in range(n)})


def dephasing_family(
    n: int = 6,
    gamma: float = 0.35,
    dt: float = 0.25,
    n_steps: int = 24,
    seed: int = 20400,
) -> SyntheticRun:
    """Famille 2 du §8 — système soumis à une décohérence contrôlée.

    Les relations sont les cohérences `|ρ_ij|`, qui décroissent en `e^{-γt}`.
    Le temps de référence est le temps de laboratoire, qui coïncide ici avec le
    temps propre : le système ne se déplace pas.
    """
    rng = random.Random(seed)
    pairs = _complete_pairs(range(n))
    initial = {p: rng.uniform(0.5, 1.0) for p in pairs}
    states, times = [], []
    for k in range(n_steps + 1):
        t = k * dt
        decay = math.exp(-gamma * t)
        states.append({p: v * decay for p, v in initial.items()})
        times.append(t)
    spec = ObjectSpec(
        constituents=frozenset(range(n)),
        adjacency=frozenset((i, i + 1) for i in range(n - 1)),
        symmetries=path_symmetries(n),
    )
    return SyntheticRun(f"décohérence-{seed}", spec, tuple(states), tuple(times))


def perturbed_memory_family(
    n: int = 6,
    sigma: float = 0.06,
    dt: float = 1.0,
    n_steps: int = 24,
    seed: int = 20401,
) -> SyntheticRun:
    """Famille 3 du §8 — mémoire soumise à des perturbations contrôlées.

    Les relations sont les poids `W_ij`, perturbés additivement à chaque pas.
    Le « temps de référence » est ici l'exposition cumulée à la perturbation —
    **et c'est une faiblesse déclarée du protocole** : contrairement à la
    famille 2, ce système n'a pas de temps propre indépendant. Le test de
    transfert en est affaibli d'autant.
    """
    rng = random.Random(seed)
    pairs = _complete_pairs(range(n))
    current = {p: rng.uniform(-1.0, 1.0) for p in pairs}
    states, times = [dict(current)], [0.0]
    for k in range(1, n_steps + 1):
        current = {p: v + rng.gauss(0.0, sigma) for p, v in current.items()}
        states.append(dict(current))
        times.append(k * dt)
    spec = ObjectSpec(
        constituents=frozenset(range(n)),
        adjacency=frozenset((i, i + 1) for i in range(n - 1)),
        symmetries=path_symmetries(n),
    )
    return SyntheticRun(f"mémoire-{seed}", spec, tuple(states), tuple(times))
