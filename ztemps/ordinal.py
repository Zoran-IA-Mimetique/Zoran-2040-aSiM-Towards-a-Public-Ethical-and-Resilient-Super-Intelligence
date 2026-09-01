"""Corrélation de rang exacte, pour très petits échantillons.

Motivation : la matrice des jumeaux conjoints propose de chercher une relation
entre degré de partage corporel et autonomie individuelle sur quatre à cinq cas
documentés. À cette taille, les formules asymptotiques usuelles (approximation
normale, table de Student) sont fausses — non pas imprécises, fausses. Ce module
énumère **toutes** les permutations et donne la loi exacte sous l'hypothèse
nulle.

Il sert aussi à répondre à la question qui doit être posée avant de collecter
quoi que ce soit : *combien de cas faut-il pour que la relation cherchée soit
seulement détectable ?*
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import permutations
from math import factorial
from typing import Sequence

#: Au-delà, l'énumération exhaustive devient déraisonnable (12! ≈ 4.8·10⁸).
MAX_EXACT_N = 11


def spearman_rho(first: Sequence[float], second: Sequence[float]) -> float:
    """ρ de Spearman sur deux séries de rangs sans ex æquo."""
    if len(first) != len(second):
        raise ValueError("les deux séries doivent avoir la même longueur")
    n = len(first)
    if n < 3:
        raise ValueError("ρ n'est pas défini en dessous de trois observations")
    ranks_a, ranks_b = _to_ranks(first), _to_ranks(second)
    d2 = sum((a - b) ** 2 for a, b in zip(ranks_a, ranks_b))
    return 1.0 - 6.0 * d2 / (n * (n * n - 1))


def _to_ranks(values: Sequence[float]) -> list[int]:
    """Rangs 0..n-1. Les ex æquo sont refusés : ils cassent la loi exacte."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    if any(
        values[order[i]] == values[order[i + 1]] for i in range(len(order) - 1)
    ):
        raise ValueError(
            "ex æquo détectés : la loi exacte par permutations suppose un ordre "
            "strict. Départager explicitement, ou renoncer au test."
        )
    ranks = [0] * len(values)
    for rank, index in enumerate(order):
        ranks[index] = rank
    return ranks


def exact_p_value(first: Sequence[float], second: Sequence[float]) -> float:
    """P(ρ >= ρ_observé) sous l'hypothèse nulle, unilatéral, par énumération."""
    n = len(first)
    if n > MAX_EXACT_N:
        raise ValueError(f"énumération exacte limitée à n <= {MAX_EXACT_N}")
    observed = spearman_rho(first, second)
    base = list(range(n))
    hits = sum(
        1
        for candidate in permutations(base)
        if spearman_rho(base, list(candidate)) >= observed - 1e-12
    )
    return hits / factorial(n)


@dataclass(frozen=True)
class Detectability:
    """Ce qu'un `n` donné permet d'atteindre, avant toute collecte."""

    n: int
    p_perfect_order: float
    p_one_inversion: float

    def can_reach(self, alpha: float) -> bool:
        """Un ordre parfait suffit-il à passer sous le seuil ?"""
        return self.p_perfect_order <= alpha

    def is_robust_at(self, alpha: float) -> bool:
        """Le résultat survit-il à une seule inversion de rang ?"""
        return self.p_one_inversion <= alpha


def detectability(n: int) -> Detectability:
    """Meilleur `p` atteignable à `n` observations, ordre parfait et à une inversion près.

    C'est l'analyse à faire **avant** de coder les cas. Si `p_perfect_order`
    dépasse déjà le seuil retenu, aucune donnée ne pourra conclure, et la
    collecte doit être redimensionnée plutôt que menée puis interprétée.
    """
    if not 3 <= n <= MAX_EXACT_N:
        raise ValueError(f"n doit être entre 3 et {MAX_EXACT_N}")
    base = list(range(n))
    distribution = [spearman_rho(base, list(p)) for p in permutations(base)]
    total = len(distribution)

    perfect = max(distribution)
    swapped = base[:]
    swapped[0], swapped[1] = swapped[1], swapped[0]
    one_inversion = spearman_rho(base, swapped)

    return Detectability(
        n=n,
        p_perfect_order=sum(1 for r in distribution if r >= perfect - 1e-12) / total,
        p_one_inversion=sum(
            1 for r in distribution if r >= one_inversion - 1e-12
        )
        / total,
    )


def minimum_n(alpha: float = 0.05, *, robust: bool = False) -> int | None:
    """Plus petit `n` permettant de conclure au seuil `alpha`.

    `robust=True` exige que le résultat tienne encore avec une inversion de
    rang — c'est-à-dire qu'il ne repose pas sur un ordonnancement parfait, ce
    qu'aucun codage de cas cliniques hétérogènes ne peut promettre.
    """
    for n in range(3, MAX_EXACT_N + 1):
        report = detectability(n)
        if report.is_robust_at(alpha) if robust else report.can_reach(alpha):
            return n
    return None
