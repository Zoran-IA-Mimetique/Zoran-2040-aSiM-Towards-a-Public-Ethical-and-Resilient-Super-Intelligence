"""Objet `CadreCausal` et promotion selon les sept critères.

Exécute le point 1 de l'ordre de travail verrouillé (§20 de la lettre de
mission du 6 août 2026) :

> Ajouter au moteur multicadres un objet CadreCausal et une fonction
> proposer/promotionner les cadres selon les sept critères, sans prétendre à la
> perfection.

## Ce que ce module ne fait pas

La conclusion d'audit du §18 est explicite : « Ne pas le réécrire aveuglément ».
Ce module **n'est pas** un sélecteur automatique de hiérarchie, et ne prétend
pas l'être. Il applique les sept critères du §12.1 à des cadres **déclarés**, et
refuse la promotion quand une condition manque.

Il ne calcule ni `S` ni `Φ_C`. Le §27 fixe `S = NON_MESURÉ` tant que les proxys,
seuils et pondérations ne sont pas calibrés ; le §12.2 interdit une valeur
numérique de `Φ_C` hors domaine défini. Aucune fonction ici ne les produit.

## Verrous encodés dans le code, pas seulement documentés

- **Règle de promotion (§12.1)** — si une condition manque, l'ensemble reste
  voisinage, secteur, relation ou proxy. `promouvoir()` ne peut pas retourner
  `CADRE` avec un critère absent.
- **NON_MESURÉ (§2)** — une absence n'est jamais imputée. Un critère non
  renseigné vaut `NON_MESURE`, distinct de « non satisfait ».
- **Aucune moyenne (§12.2)** — le verdict est une conjonction de portes, jamais
  une moyenne des critères. Il n'existe pas de « score de cadre » ici.
- **Règle des deux cadres (§0)** — local et premier relationnel englobant sont
  obligatoires ; les niveaux supérieurs ne s'ajoutent que si la chaîne causale
  les atteint.
- **Double comptage (§12.1, critère 7)** — évaluable seulement sur la
  hiérarchie, jamais sur un cadre isolé. Le code le reflète.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable, Mapping, Sequence


class Statut(str, Enum):
    """Verdict de promotion. `CADRE` n'est atteint que si les sept critères tiennent."""

    CADRE = "cadre"
    VOISINAGE = "voisinage"
    SECTEUR = "secteur"
    RELATION = "relation"
    PROXY = "proxy"
    NON_MESURE = "NON_MESURÉ"


class Critere(str, Enum):
    """Les sept conditions du §12.1, dans l'ordre de la lettre."""

    FRONTIERE = "frontière explicite"
    FONCTION = "fonction ou objectif propre"
    PROXYS = "variables et proxys mesurables propres"
    TRIPLET = "triplet opérant-opérande-opéré"
    CAUSALITE = "relation causale testable avec les autres niveaux"
    INVARIANT = "invariant critique ou seuil de sortie propre"
    SANS_DOUBLE_COMPTE = "absence de double comptage"


#: Le critère 7 se juge sur la hiérarchie entière, pas sur un cadre isolé.
CRITERES_LOCAUX = tuple(c for c in Critere if c is not Critere.SANS_DOUBLE_COMPTE)


@dataclass(frozen=True)
class Triplet:
    """§5 — `𝒯(X) = (O_opérant, O_opérande, O_opéré)`."""

    operant: str
    operande: str
    opere: str

    def __post_init__(self) -> None:
        for nom in ("operant", "operande", "opere"):
            if not getattr(self, nom).strip():
                raise ValueError(
                    f"{nom} vide : un triplet incomplet ne définit pas un cadre (§5)"
                )


@dataclass(frozen=True)
class CadreCausal:
    """Un niveau déclaré, avec ce qui est renseigné et ce qui ne l'est pas.

    Un champ laissé à `None` vaut **NON_MESURÉ** : la lettre interdit de le
    traiter comme une absence de la propriété (§2). Un champ renseigné mais vide
    est refusé à la construction — mieux vaut `None` explicite qu'une coquille
    silencieuse.
    """

    identifiant: str
    frontiere: str | None = None
    fonction: str | None = None
    proxys: tuple[str, ...] = ()
    triplet: Triplet | None = None
    #: Identifiants des cadres avec lesquels une causalité testable est déclarée.
    causalite_testable: tuple[str, ...] = ()
    #: Invariants critiques ou seuils de sortie propres au cadre.
    invariants: tuple[str, ...] = ()
    #: Variables partagées avec d'autres cadres, tracées explicitement (§12.1).
    variables_partagees: Mapping[str, tuple[str, ...]] = field(default_factory=dict)
    note: str = ""

    def __post_init__(self) -> None:
        if not self.identifiant.strip():
            raise ValueError("un cadre sans identifiant n'est pas traçable")
        for nom in ("frontiere", "fonction"):
            valeur = getattr(self, nom)
            if valeur is not None and not valeur.strip():
                raise ValueError(
                    f"{nom} renseigné mais vide : utiliser None pour NON_MESURÉ (§2)"
                )

    def criteres_locaux(self) -> dict[Critere, bool | None]:
        """État des six critères jugeables sur le cadre seul.

        `None` signifie **NON_MESURÉ**, et jamais « non satisfait ».
        """
        return {
            Critere.FRONTIERE: None if self.frontiere is None else True,
            Critere.FONCTION: None if self.fonction is None else True,
            Critere.PROXYS: None if not self.proxys else True,
            Critere.TRIPLET: None if self.triplet is None else True,
            Critere.CAUSALITE: None if not self.causalite_testable else True,
            Critere.INVARIANT: None if not self.invariants else True,
        }


@dataclass(frozen=True)
class RapportPromotion:
    """Verdict d'un cadre, avec le détail de ce qui manque."""

    identifiant: str
    statut: Statut
    criteres: Mapping[Critere, bool | None]
    manquants: tuple[Critere, ...]
    motif: str

    @property
    def est_cadre(self) -> bool:
        return self.statut is Statut.CADRE


def _double_comptage(
    cadre: CadreCausal, hierarchie: Sequence[CadreCausal]
) -> tuple[bool | None, str]:
    """Critère 7 — jugé sur la hiérarchie, jamais sur le cadre seul.

    « Les cadres se recouvrent uniquement si les variables partagées sont
    explicitement tracées » (§22). Un proxy commun à deux cadres sans
    déclaration de partage est un double comptage.
    """
    autres = [c for c in hierarchie if c.identifiant != cadre.identifiant]
    if not autres:
        return None, "cadre isolé : le critère 7 n'est pas jugeable (§12.1)"

    non_traces: list[str] = []
    for autre in autres:
        communs = set(cadre.proxys) & set(autre.proxys)
        traces = set(cadre.variables_partagees.get(autre.identifiant, ()))
        traces |= set(autre.variables_partagees.get(cadre.identifiant, ()))
        for proxy in sorted(communs - traces):
            non_traces.append(f"{proxy} partagé avec {autre.identifiant}")

    if non_traces:
        return False, "recouvrement non tracé : " + " ; ".join(non_traces[:4])
    return True, "aucun proxy partagé non tracé"


def promouvoir(
    cadre: CadreCausal,
    hierarchie: Sequence[CadreCausal] = (),
    *,
    repli: Statut = Statut.VOISINAGE,
) -> RapportPromotion:
    """Applique les sept critères. **Ne promeut jamais un ensemble incomplet.**

    `repli` déclare ce que l'ensemble reste s'il n'est pas promu — voisinage,
    secteur, relation ou proxy, selon ce que l'auteur en dit. Le défaut est
    `VOISINAGE`, le plus neutre.
    """
    if repli is Statut.CADRE:
        raise ValueError(
            "le repli ne peut pas être CADRE : ce serait contourner la règle de "
            "promotion du §12.1"
        )

    criteres: dict[Critere, bool | None] = dict(cadre.criteres_locaux())
    ok_septieme, motif_septieme = _double_comptage(cadre, hierarchie)
    criteres[Critere.SANS_DOUBLE_COMPTE] = ok_septieme

    manquants = tuple(c for c in Critere if criteres[c] is not True)

    if not manquants:
        return RapportPromotion(
            cadre.identifiant,
            Statut.CADRE,
            criteres,
            (),
            "les sept critères du §12.1 sont satisfaits",
        )

    non_mesures = tuple(c for c in manquants if criteres[c] is None)
    refuses = tuple(c for c in manquants if criteres[c] is False)

    if refuses:
        motif = "critère(s) non satisfait(s) : " + " ; ".join(c.value for c in refuses)
        if Critere.SANS_DOUBLE_COMPTE in refuses:
            motif += f" — {motif_septieme}"
    else:
        motif = "NON_MESURÉ : " + " ; ".join(c.value for c in non_mesures)

    return RapportPromotion(cadre.identifiant, repli, criteres, manquants, motif)


@dataclass(frozen=True)
class RapportHierarchie:
    """Verdict d'ensemble. Conjonction de portes, jamais une moyenne (§12.2)."""

    rapports: tuple[RapportPromotion, ...]
    deux_cadres_obligatoires: bool
    motif: str

    @property
    def cadres_promus(self) -> tuple[str, ...]:
        return tuple(r.identifiant for r in self.rapports if r.est_cadre)

    @property
    def admissible(self) -> bool:
        """Aucune moyenne ne compense un manque : c'est une conjonction."""
        return self.deux_cadres_obligatoires


def evaluer_hierarchie(
    cadres: Iterable[CadreCausal],
    *,
    replis: Mapping[str, Statut] | None = None,
) -> RapportHierarchie:
    """Évalue une hiérarchie déclarée et vérifie la règle des deux cadres.

    § 0 : « Les deux cadres obligatoires sont : local et premier supérieur
    relationnel englobant des objets voisins. » Le contrôle porte donc sur le
    nombre de cadres **effectivement promus**, pas sur le nombre de niveaux
    déclarés — un niveau déclaré mais non promu ne compte pas.
    """
    cadres = tuple(cadres)
    replis = replis or {}
    rapports = tuple(
        promouvoir(c, cadres, repli=replis.get(c.identifiant, Statut.VOISINAGE))
        for c in cadres
    )
    promus = tuple(r for r in rapports if r.est_cadre)
    assez = len(promus) >= 2
    motif = (
        f"{len(promus)} cadre(s) promu(s) : la règle des deux cadres est satisfaite"
        if assez
        else (
            f"{len(promus)} cadre(s) promu(s) — la règle des deux cadres du §0 "
            "exige le cadre local ET son premier relationnel englobant. "
            "Verdict : NON_MESURÉ tant que le second n'est pas complété."
        )
    )
    return RapportHierarchie(rapports, assez, motif)
