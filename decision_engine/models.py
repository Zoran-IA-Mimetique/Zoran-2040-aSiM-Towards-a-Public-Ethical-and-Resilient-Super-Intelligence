"""Modèles de données du moteur de décision « cadres + curseurs ».

Tout le moteur repose sur trois petits objets sérialisables :

* :class:`Frame`      -- une dimension que l'utilisateur manipule (un « curseur »).
* :class:`Dependency` -- un couplage orienté entre deux cadres.
* :class:`System`     -- l'ensemble des cadres et des dépendances.

Ce sont de simples ``@dataclass`` : un système peut donc être chargé / exporté
en JSON sans aucune dépendance tierce. La priorité est la clarté du modèle ;
aucune optimisation prématurée n'est faite ici.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

# Un cadre est soit à minimiser, soit à maximiser. Un cadre « minimize » est
# plus désirable quand sa valeur est basse (ex. coût, énergie) ; un cadre
# « maximize » est plus désirable quand sa valeur est haute (ex. réparabilité).
FrameType = str
MINIMIZE: FrameType = "minimize"
MAXIMIZE: FrameType = "maximize"
_VALID_TYPES = (MINIMIZE, MAXIMIZE)


@dataclass
class Frame:
    """Une dimension de décision, présentée à l'utilisateur comme un curseur.

    Attributs
    ---------
    name:
        Identifiant unique du cadre (ex. ``"energie"``).
    type:
        ``"minimize"`` ou ``"maximize"`` -- la direction qui rend le cadre
        *plus* désirable.
    active:
        Indique si le cadre participe à la décision. Un cadre inactif reste
        *visible* et reste calculé (cf. surveillance passive dans le moteur),
        mais il ne bloque jamais une décision.
    priority:
        Importance relative dans ``[0, 1]``. Sert à pondérer les compromis ;
        elle ne fusionne jamais les scores par cadre en un score global.
    value:
        Position courante du curseur, bornée à l'intérieur de ``bounds``.
    bounds:
        Intervalle admissible ``(bas, haut)`` pour ``value``.
    """

    name: str
    type: FrameType = MINIMIZE
    active: bool = True
    priority: float = 0.5
    value: float = 0.0
    bounds: Tuple[float, float] = (0.0, 1.0)

    def __post_init__(self) -> None:
        if self.type not in _VALID_TYPES:
            raise ValueError(
                f"cadre {self.name!r} : type doit être l'un de {_VALID_TYPES}, "
                f"reçu {self.type!r}"
            )
        low, high = self.bounds
        if low > high:
            raise ValueError(
                f"cadre {self.name!r} : bornes invalides {self.bounds!r}"
            )
        # On maintient le curseur dans son intervalle admissible en permanence.
        self.value = self.clamp(self.value)

    # -- utilitaires -----------------------------------------------------
    def clamp(self, value: float) -> float:
        """Renvoie ``value`` contraint à ``self.bounds``."""
        low, high = self.bounds
        return max(low, min(high, value))

    def normalized(self) -> float:
        """Renvoie ``value`` ramené dans ``[0, 1]`` selon ses bornes."""
        low, high = self.bounds
        span = high - low
        if span == 0:
            return 0.0
        return (self.value - low) / span

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "active": self.active,
            "priority": self.priority,
            "value": self.value,
            "bounds": list(self.bounds),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Frame":
        bounds = data.get("bounds", (0.0, 1.0))
        return cls(
            name=data["name"],
            type=data.get("type", MINIMIZE),
            active=data.get("active", True),
            priority=data.get("priority", 0.5),
            value=data.get("value", 0.0),
            bounds=(float(bounds[0]), float(bounds[1])),
        )


@dataclass
class Dependency:
    """Couplage orienté : un changement sur ``source`` se propage vers ``target``.

    Le changement propagé vaut ``delta_target = effect * delta_source``.

    ``effect`` est donc un coefficient *signé* :

    * un effet **positif** signifie que les deux cadres évoluent ensemble
      (source ↑ -> target ↑) ;
    * un effet **négatif** modélise un compromis
      (source ↓ -> target ↑), ex. baisser l'énergie augmente la taille.
    """

    source: str
    target: str
    effect: float

    def to_dict(self) -> Dict[str, Any]:
        # La spec nomme les extrémités « from »/« to » ; « from » étant un
        # mot-clé Python, on ne l'expose que dans la forme sérialisée.
        return {"from": self.source, "to": self.target, "effect": self.effect}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Dependency":
        return cls(
            source=data.get("from", data.get("source")),
            target=data.get("to", data.get("target")),
            effect=float(data["effect"]),
        )


@dataclass
class System:
    """Un système complet « cadres + dépendances »."""

    frames: List[Frame] = field(default_factory=list)
    dependencies: List[Dependency] = field(default_factory=list)

    def __post_init__(self) -> None:
        names = [f.name for f in self.frames]
        duplicates = {n for n in names if names.count(n) > 1}
        if duplicates:
            raise ValueError(f"noms de cadres dupliqués : {sorted(duplicates)}")
        # Toute dépendance doit référencer des cadres qui existent réellement.
        known = set(names)
        for dep in self.dependencies:
            for endpoint in (dep.source, dep.target):
                if endpoint not in known:
                    raise ValueError(
                        f"dépendance vers un cadre inconnu : {endpoint!r}"
                    )

    # -- recherches ------------------------------------------------------
    def get(self, name: str) -> Frame:
        for frame in self.frames:
            if frame.name == name:
                return frame
        raise KeyError(f"cadre inexistant : {name!r}")

    def has(self, name: str) -> bool:
        return any(f.name == name for f in self.frames)

    def active_frames(self) -> List[Frame]:
        return [f for f in self.frames if f.active]

    def passive_frames(self) -> List[Frame]:
        """Cadres visibles/calculés mais qui ne bloquent pas les décisions."""
        return [f for f in self.frames if not f.active]

    def outgoing(self, name: str) -> List[Dependency]:
        return [d for d in self.dependencies if d.source == name]

    # -- (dé)sérialisation ----------------------------------------------
    def to_dict(self) -> Dict[str, Any]:
        return {
            "frames": [f.to_dict() for f in self.frames],
            "dependencies": [d.to_dict() for d in self.dependencies],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "System":
        return cls(
            frames=[Frame.from_dict(f) for f in data.get("frames", [])],
            dependencies=[
                Dependency.from_dict(d) for d in data.get("dependencies", [])
            ],
        )
