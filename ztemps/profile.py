"""Objet, échelles et profil de cohérence — Z-TEMPS-PHYS-V1 §2.

Le profil n'est pas réduit à un scalaire : la cohérence est mesurée à quatre
échelles et le passage au scalaire n'a lieu que dans `law.transformation_measure`,
sous les contraintes d'agrégation de l'invariant 5.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Mapping


class Scale(IntEnum):
    """Échelles du profil, ordonnées de la plus locale à la plus globale.

    L'ordre est significatif : l'invariant 5 (« conservation des cadres
    inférieurs et pairs ») s'énonce en termes de cette relation d'ordre.
    """

    LOCAL = 0
    OBJET = 1
    CADRE = 2
    GLOBAL = 3


class DissolutionError(RuntimeError):
    """Levée quand on demande le temps propre d'un objet dissous (§4, P2).

    `C_s = 0` ne signifie pas « temps nul » : le porteur du temps n'est plus
    défini. Toute mesure ultérieure relève d'un *autre* objet.
    """

    def __init__(self, scale: Scale, event_index: int) -> None:
        super().__init__(
            f"identité non définie à l'échelle {scale.name} "
            f"à la transformation #{event_index} : temps propre ultérieur indéfini"
        )
        self.scale = scale
        self.event_index = event_index


@dataclass(frozen=True)
class CoherenceProfile:
    """C(e) = [C_local, C_objet, C_cadre, C_global], chaque composante dans [0, 1].

    Chaque composante mesure la proportion de relations conservées et
    compatibles à l'échelle considérée, *après* alignement par le groupe de
    symétries déclaré (§2). L'alignement est la responsabilité du proxy ; cette
    classe ne fait que porter le résultat et en vérifier le domaine.
    """

    values: Mapping[Scale, float]

    def __post_init__(self) -> None:
        missing = set(Scale) - set(self.values)
        if missing:
            names = ", ".join(sorted(s.name for s in missing))
            raise ValueError(
                f"profil incomplet : échelles manquantes ({names}). "
                "L'invariant 5 interdit d'omettre une échelle."
            )
        unknown = set(self.values) - set(Scale)
        if unknown:
            raise ValueError(f"échelles inconnues dans le profil : {unknown!r}")
        for scale, value in self.values.items():
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise TypeError(f"C_{scale.name} doit être numérique, reçu {value!r}")
            if not 0.0 <= float(value) <= 1.0:
                raise ValueError(
                    f"C_{scale.name} = {value} hors domaine : 0 <= C_s <= 1 (§2)"
                )
        object.__setattr__(
            self, "values", {s: float(self.values[s]) for s in Scale}
        )

    def __getitem__(self, scale: Scale) -> float:
        return self.values[scale]

    @property
    def dissolved_scales(self) -> tuple[Scale, ...]:
        """Échelles où l'identité de l'objet cesse d'être définie (C_s = 0)."""
        return tuple(s for s in Scale if self.values[s] == 0.0)

    @property
    def is_closed(self) -> bool:
        """Transformation nulle : C_s = 1 partout (prédiction P1)."""
        return all(self.values[s] == 1.0 for s in Scale)

    @classmethod
    def uniform(cls, value: float) -> "CoherenceProfile":
        return cls({s: value for s in Scale})
