"""Moteur multicadres — point 1 de l'ordre de travail verrouillé (§20).

Ce paquet est distinct de `ztemps/`. Il ne calcule ni `S` ni `Φ_C` :
la lettre de mission les fixe à `NON_MESURÉ` tant que proxys, seuils et
pondérations ne sont pas calibrés (§27, §12.2).
"""

from .cadres import (
    CadreCausal,
    Critere,
    RapportHierarchie,
    RapportPromotion,
    Statut,
    Triplet,
    evaluer_hierarchie,
    promouvoir,
)

__all__ = [
    "CadreCausal",
    "Critere",
    "RapportHierarchie",
    "RapportPromotion",
    "Statut",
    "Triplet",
    "evaluer_hierarchie",
    "promouvoir",
]
