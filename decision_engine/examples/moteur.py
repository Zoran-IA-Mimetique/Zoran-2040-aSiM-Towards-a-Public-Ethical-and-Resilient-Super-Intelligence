"""Cas de test minimal de la mission : « construire un moteur ».

Cadres :
    énergie, taille, coût, bruit

Dépendances (compromis -> coefficients négatifs) :
    énergie ↓ -> taille ↑     (effect = -0.4)
    taille ↑ -> bruit  ↓      (effect = -0.3)
    énergie ↓ -> coût  ↑      (effect = -0.5)

Rappel de la convention de signe (cf. ``models.Dependency``) :
``delta_target = effect * delta_source``. Un compromis « l'un baisse, l'autre
monte » s'écrit donc avec un effet **négatif**.
"""

from __future__ import annotations

from ..models import Dependency, Frame, System, MAXIMIZE, MINIMIZE


def build_system() -> System:
    """Construit le système « moteur » de l'exemple."""
    frames = [
        Frame(name="energie", type=MINIMIZE, priority=0.9, value=0.5),
        Frame(name="taille", type=MINIMIZE, priority=0.5, value=0.5),
        Frame(name="cout", type=MINIMIZE, priority=0.8, value=0.5),
        # Le bruit est ici surveillé mais pas prioritaire dans la décision.
        Frame(name="bruit", type=MINIMIZE, priority=0.3, value=0.5),
    ]
    dependencies = [
        Dependency(source="energie", target="taille", effect=-0.4),
        Dependency(source="taille", target="bruit", effect=-0.3),
        Dependency(source="energie", target="cout", effect=-0.5),
    ]
    return System(frames=frames, dependencies=dependencies)


def demo() -> dict:
    """Scénario : « je veux un moteur avec peu d'énergie et peu de coût ».

    On applique les objectifs, on observe la propagation, puis on renvoie la
    décision complète.
    """
    from ..engine import DecisionEngine

    engine = DecisionEngine(build_system())

    # Objectif utilisateur : énergie basse, coût bas ; taille/bruit ignorés
    # (donc passifs : surveillés mais non bloquants).
    engine.apply_objectives(
        {
            "energie": 0.2,
            "cout": 0.3,
            "taille": "ignored",
            "bruit": "ignored",
        }
    )

    # Conséquence de la baisse d'énergie depuis 0.5 vers 0.2 (delta = -0.3).
    propagated = engine.propagate_delta("energie", -0.3)

    decision = engine.decide()
    decision["propagation_energie_-0.3"] = propagated
    return decision


if __name__ == "__main__":  # pragma: no cover
    import json

    print(json.dumps(demo(), indent=2, ensure_ascii=False))
