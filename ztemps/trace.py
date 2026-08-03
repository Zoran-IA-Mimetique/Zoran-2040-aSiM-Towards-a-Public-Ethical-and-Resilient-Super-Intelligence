"""Traçabilité — Z-TEMPS-PHYS-V1 §5, invariant 6.

« Traçabilité de chaque valeur : objet, transformation, échelle, proxy,
incertitude. » L'invariant est ici structurel : il est impossible de produire une
valeur de cohérence sans les cinq champs, parce qu'aucun n'a de valeur par
défaut silencieuse.

C'est le point de contact avec EthicChain (M11) : un `Record` est écrit *avant*
que la valeur ne produise un effet, jamais reconstruit après coup.
"""

from __future__ import annotations

from dataclasses import dataclass

from .profile import Scale


@dataclass(frozen=True)
class Record:
    """Une valeur de cohérence et tout ce qui permet de la contester."""

    object_id: str
    transformation_id: str
    scale: Scale
    proxy_id: str
    value: float
    uncertainty: float | None
    calibration_id: str

    def __post_init__(self) -> None:
        for field_name in ("object_id", "transformation_id", "proxy_id"):
            if not getattr(self, field_name):
                raise ValueError(
                    f"{field_name} vide : l'invariant 6 exige la traçabilité "
                    "complète de chaque valeur"
                )
        if self.uncertainty is not None and self.uncertainty < 0.0:
            raise ValueError("l'incertitude ne peut pas être négative")

    def as_row(self) -> dict[str, object]:
        """Ligne de journal, sérialisable telle quelle vers EthicChain."""
        return {
            "objet": self.object_id,
            "transformation": self.transformation_id,
            "echelle": self.scale.name,
            "proxy": self.proxy_id,
            "valeur": self.value,
            "incertitude": self.uncertainty,
            "calibration": self.calibration_id,
        }
