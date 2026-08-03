"""Variation cumulée et dépendance à la granularité.

Le pilote multi-domaine V1.5 rapporte, pour l'oscillateur lévité, trois nombres
qui ne peuvent pas coexister sans conséquence :

    variation cumulée brute      28.717
    agrégation par blocs de 16    0.695
    variation nette début-fin     0.349

Un facteur 41 entre les deux premières. Ce module sert à dire *pourquoi*, et à
séparer ce qui, dans une variation cumulée, vient de la transformation de
l'objet et ce qui vient de la densité d'échantillonnage.

Le fait mathématique de fond : la variation totale d'une trajectoire bruitée
**diverge** quand le pas d'échantillonnage tend vers zéro. Une variation cumulée
brute n'est donc pas une grandeur physique tant qu'une échelle de granulation
n'est pas déclarée — et une grandeur qui dépend du choix de représentation est
exactement le premier falsificateur du §7 de Z-TEMPS-PHYS-V1.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

#: Exposant attendu pour un bruit stationnaire additif, sous agrégation par
#: moyenne de blocs : chaque bloc réduit l'amplitude en 1/√k et le nombre de
#: pas en 1/k, d'où V(k) ∝ k^-1.5.
STATIONARY_NOISE_EXPONENT = 1.5


def coarse_grain(series: Sequence[float], block: int) -> list[float]:
    """Agrège la série par moyenne de blocs de taille `block`.

    Les points en excès à la fin sont laissés de côté : un bloc incomplet a une
    variance différente des autres et fausserait l'exposant.
    """
    if block < 1:
        raise ValueError("la taille de bloc doit valoir au moins 1")
    if block == 1:
        return list(series)
    usable = (len(series) // block) * block
    return [
        sum(series[i : i + block]) / block for i in range(0, usable, block)
    ]


def cumulative_variation(series: Sequence[float]) -> float:
    """Σ |x_{i+1} - x_i| — la « variation cumulée brute » du pilote."""
    return sum(abs(b - a) for a, b in zip(series, series[1:]))


def net_variation(series: Sequence[float]) -> float:
    """|x_fin - x_début| — la « variation nette début-fin » du pilote.

    Minorant de la variation cumulée à toute granularité : une trajectoire ne
    peut pas varier moins que son déplacement net.
    """
    return abs(series[-1] - series[0]) if series else 0.0


def variation_spectrum(
    series: Sequence[float], blocks: Sequence[int]
) -> dict[int, float]:
    """Variation cumulée à plusieurs granularités."""
    return {k: cumulative_variation(coarse_grain(series, k)) for k in blocks}


def scaling_exponent(spectrum: dict[int, float]) -> float:
    """Pente `p` de `log V = a - p · log k`, par moindres carrés.

    `p ≈ 0`   : la variation ne dépend pas de la granularité — grandeur robuste.
    `p ≈ 1.5` : bruit stationnaire — la valeur mesure l'échantillonnage, pas
                la transformation.
    """
    points = [
        (math.log(k), math.log(v)) for k, v in sorted(spectrum.items()) if v > 0.0
    ]
    if len(points) < 2:
        raise ValueError("au moins deux granularités non nulles sont nécessaires")
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    denominator = sum((x - mean_x) ** 2 for x, _ in points)
    if denominator == 0.0:
        raise ValueError("granularités toutes identiques")
    slope = sum((x - mean_x) * (y - mean_y) for x, y in points) / denominator
    return -slope


@dataclass(frozen=True)
class Decomposition:
    """Partage d'une variation cumulée entre transformation et échantillonnage."""

    signal: float
    noise_at_finest: float
    exponent: float

    @property
    def noise_fraction(self) -> float:
        total = self.signal + self.noise_at_finest
        return self.noise_at_finest / total if total > 0.0 else 0.0


def decompose(
    fine: float, coarse: float, block: int, net: float
) -> Decomposition:
    """Sépare `V(1) = S + Nz` et `V(k) = S + Nz · k^-p` à partir de trois nombres.

    Le système a trois inconnues pour deux équations. L'hypothèse qui ferme le
    système est déclarée et non neutre : **`S = net`**, c'est-à-dire que la part
    « transformation » du signal est monotone, donc que sa variation totale égale
    son déplacement net. C'est le cas le plus favorable au signal : toute
    non-monotonie du signal réel augmenterait `S` et diminuerait la part de
    bruit. La fraction de bruit obtenue est donc un **minorant**.
    """
    if block <= 1:
        raise ValueError("la granularité grossière doit être supérieure à 1")
    if not fine > coarse > net >= 0.0:
        raise ValueError(
            "attendu V(1) > V(k) > net >= 0 ; "
            f"reçu V(1)={fine}, V(k)={coarse}, net={net}"
        )
    signal = net
    noise = fine - signal
    exponent = math.log(noise / (coarse - signal)) / math.log(block)
    return Decomposition(signal=signal, noise_at_finest=noise, exponent=exponent)
