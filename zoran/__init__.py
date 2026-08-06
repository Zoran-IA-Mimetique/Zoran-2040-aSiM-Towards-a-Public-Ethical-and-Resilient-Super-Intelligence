"""Moteur multicadres — points 1 à 4 de l'ordre de travail verrouillé (§20).

Ce paquet est distinct de `ztemps/`. Il ne calcule ni `S` ni `Φ_C` :
la lettre de mission les fixe à `NON_MESURÉ` tant que proxys, seuils et
pondérations ne sont pas calibrés (§27, §12.2).
"""

from .cadres import (
    CadreCausal,
    Critere,
    LienTransfert,
    PartageDeclare,
    RapportHierarchie,
    RapportPromotion,
    RoleNiveau,
    Statut,
    Triplet,
    VerdictRegleDeuxCadres,
    evaluer_hierarchie,
    promouvoir,
)
from .jauge import (
    CONSTANTE_DENOMINATEUR,
    FORMULE_CANONIQUE,
    TermesJauge,
    evaluer_S,
)
from .proxys import (
    Calibration,
    Criticite,
    ProxyDeclare,
    SensSeuil,
    StatutSeuil,
    TraitementAbsence,
    TransfertCausal,
    gel_complet,
    portes_absolues,
)

__all__ = [
    "CONSTANTE_DENOMINATEUR",
    "CadreCausal",
    "Calibration",
    "Critere",
    "Criticite",
    "FORMULE_CANONIQUE",
    "LienTransfert",
    "PartageDeclare",
    "ProxyDeclare",
    "RapportHierarchie",
    "RapportPromotion",
    "RoleNiveau",
    "SensSeuil",
    "Statut",
    "StatutSeuil",
    "TermesJauge",
    "TraitementAbsence",
    "TransfertCausal",
    "Triplet",
    "VerdictRegleDeuxCadres",
    "evaluer_S",
    "evaluer_hierarchie",
    "gel_complet",
    "portes_absolues",
    "promouvoir",
]
