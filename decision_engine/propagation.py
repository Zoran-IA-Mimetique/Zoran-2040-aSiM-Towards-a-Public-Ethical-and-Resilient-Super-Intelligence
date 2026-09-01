"""Propagation des effets dans le graphe de dépendances.

Quand on bouge un curseur (``delta`` appliqué à un cadre), le changement se
répercute sur les cadres couplés, puis sur les cadres couplés à ceux-ci, etc.

La règle est volontairement simple et prévisible :

    delta_target = effect * delta_source

Les effets se composent le long d'un chemin (multiplication des coefficients).
Pour rester robuste face aux cycles et aux couplages très faibles, la
propagation :

* ne ré-entre pas dans un cadre déjà visité sur le *chemin courant* (anti-cycle) ;
* ignore les contributions devenues négligeables (``epsilon``) ;
* limite la profondeur de propagation (``max_depth``).
"""

from __future__ import annotations

from typing import Dict

from .models import System

# Seuil en dessous duquel une contribution propagée est considérée nulle.
DEFAULT_EPSILON = 1e-6
# Profondeur maximale de propagation le long d'une chaîne de dépendances.
DEFAULT_MAX_DEPTH = 16


def propagate_delta(
    system: System,
    frame_name: str,
    delta: float,
    *,
    epsilon: float = DEFAULT_EPSILON,
    max_depth: int = DEFAULT_MAX_DEPTH,
) -> Dict[str, float]:
    """Propage un changement ``delta`` à partir de ``frame_name``.

    Renvoie un dictionnaire ``{cadre: impact}`` regroupant l'impact net sur
    chaque cadre *atteint* par la propagation. Le cadre d'origine n'est pas
    inclus : on ne renvoie que les conséquences sur les autres cadres.

    L'impact est cumulé : si plusieurs chemins atteignent le même cadre, leurs
    contributions s'additionnent.
    """
    if not system.has(frame_name):
        raise KeyError(f"cadre inexistant : {frame_name!r}")

    impacts: Dict[str, float] = {}

    def _walk(current: str, current_delta: float, depth: int, path: frozenset) -> None:
        if depth >= max_depth or abs(current_delta) < epsilon:
            return
        for dep in system.outgoing(current):
            target = dep.target
            # Anti-cycle : on n'élargit pas un cadre déjà présent sur ce chemin.
            if target in path:
                continue
            contribution = dep.effect * current_delta
            if abs(contribution) < epsilon:
                continue
            impacts[target] = impacts.get(target, 0.0) + contribution
            _walk(target, contribution, depth + 1, path | {target})

    _walk(frame_name, delta, 0, frozenset({frame_name}))
    return impacts


def split_impacts(system: System, impacts: Dict[str, float]):
    """Sépare les impacts selon que le cadre touché est actif ou passif.

    Renvoie ``(impacts_actifs, impacts_ignorés)``. Les cadres inactifs sont
    surveillés (« monitoring ») mais ne bloquent pas la décision : leurs impacts
    sont rangés à part pour pouvoir être affichés comme avertissements.
    """
    active: Dict[str, float] = {}
    ignored: Dict[str, float] = {}
    for name, value in impacts.items():
        bucket = active if system.get(name).active else ignored
        bucket[name] = value
    return active, ignored
