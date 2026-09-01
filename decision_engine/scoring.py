"""Scoring par cadre.

Point important de la mission : **pas de score global unique**. On expose un
score *par dimension*, ce qui laisse l'utilisateur arbitrer lui-même les
compromis au lieu de masquer les tensions derrière un seul chiffre.

Chaque score est une « désirabilité » dans ``[0, 1]`` :

* cadre ``minimize`` -> désirable quand la valeur est basse ;
* cadre ``maximize`` -> désirable quand la valeur est haute.
"""

from __future__ import annotations

from typing import Dict

from .models import Frame, System, MAXIMIZE


def frame_score(frame: Frame) -> float:
    """Désirabilité d'un cadre dans ``[0, 1]`` selon son type et sa valeur."""
    normalized = frame.normalized()
    if frame.type == MAXIMIZE:
        return normalized
    # minimize : plus la valeur est basse, plus c'est désirable.
    return 1.0 - normalized


def score(system: System, *, include_passive: bool = True) -> Dict[str, float]:
    """Renvoie ``{cadre: désirabilité}`` pour le système.

    Par défaut on inclut aussi les cadres passifs (inactifs) : ils sont
    calculés à titre de surveillance, même s'ils ne bloquent pas la décision.
    """
    result: Dict[str, float] = {}
    for frame in system.frames:
        if not include_passive and not frame.active:
            continue
        result[frame.name] = frame_score(frame)
    return result


def warnings(system: System, *, threshold: float = 0.25) -> Dict[str, float]:
    """Avertissements de surveillance pour les cadres passifs peu désirables.

    Exemple : « réparabilité très faible (non prise en compte) ». On ne renvoie
    que les cadres inactifs dont la désirabilité passe sous ``threshold``.
    """
    flagged: Dict[str, float] = {}
    for frame in system.passive_frames():
        value = frame_score(frame)
        if value < threshold:
            flagged[frame.name] = value
    return flagged
