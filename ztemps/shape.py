"""Exposant de forme de `τ_Z` — la première prédiction sans paramètre libre.

## Pourquoi ce module existe

TAU-004 a établi que `τ_*` n'est pas universelle : elle vaut `1/(D'(0)·γ)`. Toute
prédiction portant sur l'**amplitude** de `τ_Z` est donc conditionnée par une
calibration propre au système, et ne peut rien réfuter à elle seule.

Il reste une chose que `τ_*` ne touche pas : **la forme**. Une constante
multiplicative ne change pas la pente d'un tracé log-log. Les poids `w_s` non
plus, tant qu'ils sont positifs.

## La prédiction

Pour une enveloppe de décroissance relationnelle `exp(-(t/T)^β)` :

```text
C(e_k)  = exp( -((t_k)^β - (t_{k-1})^β) / T^β )
D(e_k)  ≈ ((t_k)^β - (t_{k-1})^β) / T^β
τ_Z(t)  = τ_* Σ D  →  télescopage  →  τ_Z ∝ t^β
```

**La pente log-log de `τ_Z(t)` doit égaler l'exposant d'étirement `β` de la
décroissance sous-jacente.** Sans calibration, sans `τ_*`, sans poids.

C'est le premier énoncé du cadre qui soit réfutable par une seule expérience,
sur un seul système, sans comparaison entre systèmes — donc le premier que le
résultat de TAU-004 n'affaiblit pas.

## Pourquoi c'est testable sur du matériel réel

Un processeur supraconducteur donne les deux régimes dans **le même dispositif** :

- relaxation énergétique `T1` : décroissance exponentielle, `β = 1` ;
- déphasage Ramsey `T2*` sous bruit de flux en `1/f` : enveloppe gaussienne,
  `β = 2`.

La loi prédit donc, sur le même qubit, une pente de 1 sur un canal et de 2 sur
l'autre. Aucune calibration croisée n'intervient. Si les pentes ne suivent pas
les `β` ajustés indépendamment sur les enveloppes, la loi est fausse.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ShapeFit:
    """Ajustement d'une loi de puissance `y ∝ x^exposant` en log-log."""

    exponent: float
    r_squared: float
    n_points: int

    def agrees_with(self, expected: float, tolerance: float) -> bool:
        return abs(self.exponent - expected) <= tolerance


def _log_log_slope(xs: Sequence[float], ys: Sequence[float]) -> ShapeFit:
    points = [
        (math.log(x), math.log(y)) for x, y in zip(xs, ys) if x > 0.0 and y > 0.0
    ]
    if len(points) < 3:
        raise ValueError(
            "moins de trois points strictement positifs : pente indéterminée"
        )
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    if sxx == 0.0:
        raise ValueError("abscisses toutes identiques")
    slope = sum((x - mean_x) * (y - mean_y) for x, y in points) / sxx
    intercept = mean_y - slope * mean_x
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in points)
    ss_tot = sum((y - mean_y) ** 2 for _, y in points)
    return ShapeFit(
        exponent=slope,
        r_squared=1.0 - ss_res / ss_tot if ss_tot > 0.0 else 1.0,
        n_points=n,
    )


def stretching_exponent(
    times: Sequence[float], envelope: Sequence[float]
) -> ShapeFit:
    """`β` ajusté sur l'enveloppe elle-même : `ln(-ln(A)) = β·ln(t) - β·ln(T)`.

    C'est la mesure **indépendante** à laquelle la pente de `τ_Z` sera comparée.
    Elle ne fait intervenir aucune notion de Z-TEMPS : c'est de l'ajustement de
    décroissance ordinaire, ce qui est exactement ce qu'il faut pour que la
    comparaison ait valeur de test.
    """
    xs, ys = [], []
    for t, amplitude in zip(times, envelope):
        if t <= 0.0 or not 0.0 < amplitude < 1.0:
            continue  # ln(-ln(A)) exige 0 < A < 1
        xs.append(t)
        ys.append(-math.log(amplitude))
    return _log_log_slope(xs, ys)


def tau_z_exponent(
    times: Sequence[float], cumulative_tau_z: Sequence[float], *, tail: float = 0.5
) -> ShapeFit:
    """Pente log-log de `τ_Z(t)`.

    `tail` restreint l'ajustement à la fraction finale de la série : les premiers
    pas sont dominés par la discrétisation, où l'approximation `D ≈ Δ(t^β)/T^β`
    n'est pas encore valable. La valeur est déclarée, pas ajustée après coup.
    """
    if not 0.0 < tail <= 1.0:
        raise ValueError("tail doit être dans ]0, 1]")
    start = int(len(times) * (1.0 - tail))
    return _log_log_slope(times[start:], cumulative_tau_z[start:])


def shape_agreement(
    times: Sequence[float],
    envelope: Sequence[float],
    cumulative_tau_z: Sequence[float],
    *,
    tolerance: float = 0.10,
    tail: float = 0.5,
) -> dict[str, object]:
    """Compare la pente de `τ_Z` à l'exposant d'étirement de l'enveloppe.

    C'est le test complet, et il ne contient aucun paramètre ajustable : ni
    `τ_*`, ni les poids `w_s`, ni une échelle de temps de référence.
    """
    beta = stretching_exponent(times, envelope)
    slope = tau_z_exponent(times, cumulative_tau_z, tail=tail)
    return {
        "beta_enveloppe": beta.exponent,
        "beta_r2": beta.r_squared,
        "pente_tau_z": slope.exponent,
        "pente_r2": slope.r_squared,
        "ecart": abs(slope.exponent - beta.exponent),
        "tolerance": tolerance,
        "accord": slope.agrees_with(beta.exponent, tolerance),
    }
