"""Moteur de décision — version minimale single-file (« utile, pas parfait »).

Objectif : un moteur qui tourne tout de suite.
    - curseurs (Frame)
    - dépendances (Dependency)
    - propagation simple (1 niveau, linéaire)
    - cadres actifs / passifs
    - explication lisible

Volontairement minimal : pas de non-linéaire, pas d'IA, pas d'optimisation.
La version riche et testée vit dans le package ``decision_engine/``.
"""

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Frame:
    name: str
    value: float  # 0 → 1
    active: bool = True


@dataclass
class Dependency:
    source: str
    target: str
    weight: float  # coefficient d'impact


class DecisionEngine:
    def __init__(self, frames: Dict[str, Frame], deps: List[Dependency]):
        self.frames = frames
        self.deps = deps

    def apply_delta(self, frame_name: str, delta: float):
        if frame_name not in self.frames:
            return

        self.frames[frame_name].value += delta
        self.frames[frame_name].value = max(0, min(1, self.frames[frame_name].value))

        # propagation simple (1 niveau)
        for dep in self.deps:
            if dep.source == frame_name:
                target = self.frames[dep.target]
                target.value += dep.weight * delta
                target.value = max(0, min(1, target.value))

    def snapshot(self):
        return {
            name: round(frame.value, 3)
            for name, frame in self.frames.items()
        }

    def explain(self):
        active = {k: round(v.value, 3) for k, v in self.frames.items() if v.active}
        inactive = {k: round(v.value, 3) for k, v in self.frames.items() if not v.active}

        # Cadres passifs : impactés mais ignorés (surveillés, non bloquants).
        warnings = [
            f"⚠️ {name} impactée mais ignorée (valeur={value})"
            for name, value in inactive.items()
        ]

        return {
            "active_frames": active,
            "inactive_impacts": inactive,
            "warnings": warnings,
        }


# ----------------------------
# TEST SIMPLE
# ----------------------------

if __name__ == "__main__":
    frames = {
        "energie": Frame("energie", 0.5),
        "taille": Frame("taille", 0.5),
        "cout": Frame("cout", 0.5),
    }

    deps = [
        Dependency("energie", "taille", 0.4),
        Dependency("energie", "cout", 0.2),
        Dependency("taille", "cout", 0.1),
    ]

    engine = DecisionEngine(frames, deps)

    print("Initial:", engine.snapshot())

    # réduire énergie
    engine.apply_delta("energie", -0.2)
    print("After energy ↓:", engine.snapshot())

    # cadre passif : taille impactée mais ignorée
    frames["taille"].active = False
    print("Explain:", engine.explain())

    # test concret : explosion des effets
    engine.apply_delta("energie", -0.5)
    print("After energy ↓↓:", engine.snapshot())
