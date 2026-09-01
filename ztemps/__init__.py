"""Implémentation de référence de Z-TEMPS-PHYS-V1.

Périmètre volontairement étroit : ce paquet rend exécutables l'arithmétique de
la loi candidate (§3), ses conditions de domaine (§2), ses invariants (§5) et
ses prédictions P1-P3. Il ne franchit aucune des lignes que la spécification
marque comme non acquises.

Ce que ce paquet NE fait PAS, et ne doit pas faire sans révision de la spec :

- il ne mesure pas `C` (§10 : « Mesure physique universelle C — NON_MESURÉ ») ;
  un proxy externe doit fournir les profils ;
- il n'impose aucune forme de décroissance de la survie structurelle (P4 :
  « La forme exacte de cette décroissance reste à tester ; elle ne doit pas être
  imposée par avance ») ;
- il ne fixe aucune valeur de `τ_*` (§3 : « à mesurer ») ;
- il n'établit pas la correspondance relativiste (P5), faute de données.
"""

from .invariants import (
    InvariantReport,
    check_frame_conservation,
    check_no_time_inputs,
    check_representation_invariance,
)
from .law import (
    CalibrationLeakError,
    TauZResult,
    Transformation,
    Weights,
    tau_z,
    transformation_measure,
)
from .profile import CoherenceProfile, DissolutionError, Scale
from .trace import Record

__all__ = [
    "CalibrationLeakError",
    "CoherenceProfile",
    "DissolutionError",
    "InvariantReport",
    "Record",
    "Scale",
    "TauZResult",
    "Transformation",
    "Weights",
    "check_frame_conservation",
    "check_no_time_inputs",
    "check_representation_invariance",
    "tau_z",
    "transformation_measure",
]

__spec_version__ = "Z-TEMPS-PHYS-V1"
__status__ = "loi candidate — statut de loi physique NON ACQUIS (§10)"
