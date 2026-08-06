"""Objet `CadreCausal`, promotion, rôles typés et identité causale.

Exécute le point 1 de l'ordre de travail verrouillé (§20), corrigé par l'audit
du SHA `01eec9c` sur ses défauts 2 et 4.

## Ce que ce module ne fait pas

La conclusion d'audit du §18 est explicite : « Ne pas le réécrire aveuglément ».
Ce module **n'est pas** un sélecteur automatique de hiérarchie. Il applique les
sept critères du §12.1 à des cadres **déclarés**, et refuse la promotion quand
une condition manque.

Il ne calcule ni `S` ni `Φ_C` (§27, §12.2).

## Correction du défaut 2 — la règle des deux cadres était sous-spécifiée

« Au moins deux cadres promus » était insuffisant : deux cadres quelconques
satisfaisaient la porte. Les rôles sont désormais **typés**, et la règle exige
nommément le cadre `LOCAL` et son premier `VOISINAGE_RELATIONNEL`, avec leur
lien causal déclaré des deux côtés.

## Correction du défaut 4 — le contrôle du double comptage était lexical

Il comparait des **noms** de proxys. Il comparait donc mal :

- deux noms différents désignant le même effet passaient inaperçus ;
- deux observables distinctes portant un nom voisin étaient confondues.

Le contrôle porte désormais sur un **identifiant d'effet causal**, distinct du
nom du proxy. Quand cet identifiant n'est pas déclaré, l'identité sémantique
n'est pas établissable et le verdict est `NON_MESURÉ` — **jamais un PASS
automatique**.

Limite conservée et déclarée : le contrôle reste **structurel**. Il vérifie que
les identifiants d'effet sont cohérents avec les déclarations, pas que deux
effets physiquement identiques ont bien reçu le même identifiant. Cette dernière
garantie relève de la physique, pas du moteur.
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


class RoleNiveau(str, Enum):
    """Rôle du niveau dans la hiérarchie — défaut 2 de l'audit.

    La règle des deux cadres du §0 ne porte pas sur un **nombre** de cadres mais
    sur deux rôles nommés : le local, et son premier relationnel englobant.
    """

    LOCAL = "cadre local"
    VOISINAGE_RELATIONNEL = "premier cadre relationnel englobant"
    ENGLOBANT = "cadre englobant supérieur"
    SUPERIEUR = "cadre supérieur causal"
    PLANETE = "cadre planète"
    RELATION_DIAGNOSTIQUE = "relation diagnostique, non promue par défaut"


class VerdictRegleDeuxCadres(str, Enum):
    """La règle des deux cadres n'est pas booléenne : elle peut être indécidable."""

    PASS = "PASS structurel"
    FAIL = "FAIL"
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
class PartageDeclare:
    """Variable partagée entre deux cadres, avec sa provenance.

    §22 : « Les cadres se recouvrent uniquement si les variables partagées sont
    explicitement tracées. » Un partage sans provenance n'est pas une trace :
    il vaut `NON_MESURÉ`.
    """

    effet_causal: str
    provenance: str

    def __post_init__(self) -> None:
        if not self.effet_causal.strip():
            raise ValueError("un partage sans effet causal identifié n'est pas traçable")

    @property
    def est_trace(self) -> bool:
        return bool(self.provenance.strip())


@dataclass(frozen=True)
class CadreCausal:
    """Un niveau déclaré, avec ce qui est renseigné et ce qui ne l'est pas.

    Un champ laissé à `None` vaut **NON_MESURÉ** (§2). Un champ renseigné mais
    vide est refusé à la construction.
    """

    identifiant: str
    role: RoleNiveau | None = None
    frontiere: str | None = None
    fonction: str | None = None
    proxys: tuple[str, ...] = ()
    triplet: Triplet | None = None
    causalite_testable: tuple[str, ...] = ()
    invariants: tuple[str, ...] = ()
    #: Nom de proxy → identifiant d'effet causal. Défaut 4 de l'audit : le
    #: contrôle de double comptage porte sur l'effet, pas sur le nom.
    effets_causaux: Mapping[str, str] = field(default_factory=dict)
    #: Identifiant d'autre cadre → partages déclarés avec leur provenance.
    variables_partagees: Mapping[str, tuple[PartageDeclare, ...]] = field(
        default_factory=dict
    )
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
        inconnus = set(self.effets_causaux) - set(self.proxys)
        if inconnus:
            raise ValueError(
                f"{self.identifiant} : effets causaux déclarés pour des proxys "
                f"absents du cadre : {sorted(inconnus)}"
            )

    def effet(self, proxy: str) -> str | None:
        """Identifiant d'effet causal, ou `None` si l'identité n'est pas établie."""
        return self.effets_causaux.get(proxy)

    @property
    def effets_declares(self) -> frozenset[str]:
        return frozenset(self.effets_causaux.values())

    @property
    def proxys_sans_effet(self) -> tuple[str, ...]:
        return tuple(p for p in self.proxys if p not in self.effets_causaux)

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


@dataclass(frozen=True)
class LienTransfert:
    """Transfert causal déclaré entre deux cadres, sur un effet donné.

    Sert à distinguer un **transfert** — un effet qui circule de R0 vers R1 —
    de **deux dettes indépendantes** qui seraient comptées deux fois.
    """

    source: str
    cible: str
    effet_causal: str

    def relie(self, a: str, b: str) -> bool:
        return {self.source, self.cible} == {a, b}


def _effets_partages(
    cadre: CadreCausal, autre: CadreCausal
) -> tuple[frozenset[str], tuple[str, ...]]:
    """Effets causaux communs, et proxys dont l'identité n'est pas établissable."""
    communs = cadre.effets_declares & autre.effets_declares
    indetermines = cadre.proxys_sans_effet + autre.proxys_sans_effet
    return communs, indetermines


def _double_comptage(
    cadre: CadreCausal,
    hierarchie: Sequence[CadreCausal],
    transferts: Sequence[LienTransfert],
) -> tuple[bool | None, str]:
    """Critère 7 — sur l'**effet causal**, jamais sur le nom du proxy.

    Trois issues :

    - `True` — aucun effet commun non justifié ;
    - `False` — un même effet causal attribué deux fois sans règle de partage
      ni transfert déclaré ;
    - `None` — identité sémantique non établissable : `NON_MESURÉ`, jamais un
      PASS automatique.
    """
    autres = [c for c in hierarchie if c.identifiant != cadre.identifiant]
    if not autres:
        return None, "cadre isolé : le critère 7 n'est pas jugeable (§12.1)"

    if cadre.proxys_sans_effet:
        return None, (
            "identité causale non établie pour : "
            f"{list(cadre.proxys_sans_effet)} — NON_MESURÉ, pas un PASS"
        )

    non_justifies: list[str] = []
    sans_provenance: list[str] = []

    for autre in autres:
        communs, indetermines = _effets_partages(cadre, autre)
        if indetermines and communs:
            return None, (
                f"identité causale incomplète côté {autre.identifiant} : "
                f"{sorted(set(indetermines))}"
            )
        for effet in sorted(communs):
            partages = tuple(cadre.variables_partagees.get(autre.identifiant, ()))
            partages += tuple(autre.variables_partagees.get(cadre.identifiant, ()))
            declares = [p for p in partages if p.effet_causal == effet]
            transfert = any(
                t.effet_causal == effet
                and t.relie(cadre.identifiant, autre.identifiant)
                for t in transferts
            )
            if transfert:
                continue  # un transfert n'est pas deux dettes indépendantes
            if not declares:
                non_justifies.append(f"{effet} avec {autre.identifiant}")
            elif not any(p.est_trace for p in declares):
                sans_provenance.append(f"{effet} avec {autre.identifiant}")

    if non_justifies:
        return False, (
            "même effet causal attribué deux fois sans partage ni transfert "
            "déclaré : " + " ; ".join(non_justifies[:4])
        )
    if sans_provenance:
        return None, (
            "variable partagée sans provenance : "
            + " ; ".join(sans_provenance[:4])
            + " — NON_MESURÉ (§22)"
        )
    return True, "aucun effet causal partagé non justifié"


def promouvoir(
    cadre: CadreCausal,
    hierarchie: Sequence[CadreCausal] = (),
    *,
    repli: Statut = Statut.VOISINAGE,
    transferts: Sequence[LienTransfert] = (),
) -> RapportPromotion:
    """Applique les sept critères. **Ne promeut jamais un ensemble incomplet.**"""
    if repli is Statut.CADRE:
        raise ValueError(
            "le repli ne peut pas être CADRE : ce serait contourner la règle de "
            "promotion du §12.1"
        )

    criteres: dict[Critere, bool | None] = dict(cadre.criteres_locaux())
    ok_septieme, motif_septieme = _double_comptage(cadre, hierarchie, transferts)
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

    refuses = tuple(c for c in manquants if criteres[c] is False)
    non_mesures = tuple(c for c in manquants if criteres[c] is None)

    if refuses:
        motif = "critère(s) non satisfait(s) : " + " ; ".join(c.value for c in refuses)
        if Critere.SANS_DOUBLE_COMPTE in refuses:
            motif += f" — {motif_septieme}"
    else:
        motif = "NON_MESURÉ : " + " ; ".join(c.value for c in non_mesures)
        if Critere.SANS_DOUBLE_COMPTE in non_mesures:
            motif += f" — {motif_septieme}"

    return RapportPromotion(cadre.identifiant, repli, criteres, manquants, motif)


@dataclass(frozen=True)
class RapportHierarchie:
    """Verdict d'ensemble. Conjonction de portes, jamais une moyenne (§12.2)."""

    rapports: tuple[RapportPromotion, ...]
    regle_deux_cadres: VerdictRegleDeuxCadres
    motif: str

    @property
    def cadres_promus(self) -> tuple[str, ...]:
        return tuple(r.identifiant for r in self.rapports if r.est_cadre)

    @property
    def admissible(self) -> bool:
        """PASS structurel uniquement. Ne dit rien de la validité physique."""
        return self.regle_deux_cadres is VerdictRegleDeuxCadres.PASS


def _verifier_regle_deux_cadres(
    cadres: Sequence[CadreCausal], promus: frozenset[str]
) -> tuple[VerdictRegleDeuxCadres, str]:
    """§0 — le cadre local ET son premier relationnel englobant, nommément.

    Défaut 2 de l'audit : deux cadres quelconques ne satisfont pas cette règle.
    """
    par_role = {r: [c for c in cadres if c.role is r] for r in RoleNiveau}
    sans_role = [c.identifiant for c in cadres if c.role is None]

    locaux = par_role[RoleNiveau.LOCAL]
    voisinages = par_role[RoleNiveau.VOISINAGE_RELATIONNEL]

    if not locaux:
        return (
            VerdictRegleDeuxCadres.FAIL,
            "aucun cadre déclaré LOCAL : la règle des deux cadres du §0 ne peut "
            "pas être satisfaite par deux cadres quelconques",
        )
    if len(locaux) > 1 or len(voisinages) > 1:
        return (
            VerdictRegleDeuxCadres.NON_MESURE,
            "ordre hiérarchique ambigu : "
            f"{len(locaux)} LOCAL et {len(voisinages)} VOISINAGE_RELATIONNEL "
            "déclarés — la paire minimale n'est pas identifiable",
        )
    if not voisinages:
        return (
            VerdictRegleDeuxCadres.FAIL,
            "aucun premier cadre relationnel englobant déclaré : un cadre "
            "supérieur non directement englobant ne le remplace pas",
        )

    local, voisinage = locaux[0], voisinages[0]

    if local.identifiant not in promus or voisinage.identifiant not in promus:
        manquants = [
            c.identifiant
            for c in (local, voisinage)
            if c.identifiant not in promus
        ]
        return (
            VerdictRegleDeuxCadres.FAIL,
            f"rôle déclaré mais cadre non promu : {manquants}",
        )

    lien_aller = voisinage.identifiant in local.causalite_testable
    lien_retour = local.identifiant in voisinage.causalite_testable
    if not (lien_aller and lien_retour):
        return (
            VerdictRegleDeuxCadres.NON_MESURE,
            "lien causal entre le local et son premier englobant non déclaré "
            f"des deux côtés (aller={lien_aller}, retour={lien_retour})",
        )

    motif = (
        f"PASS structurel : LOCAL « {local.identifiant} » et "
        f"VOISINAGE_RELATIONNEL « {voisinage.identifiant} » promus, lien causal "
        "déclaré des deux côtés"
    )
    if sans_role:
        motif += f" — rôles NON_MESURÉS par ailleurs : {sans_role}"
    return VerdictRegleDeuxCadres.PASS, motif


def evaluer_hierarchie(
    cadres: Iterable[CadreCausal],
    *,
    replis: Mapping[str, Statut] | None = None,
    transferts: Sequence[LienTransfert] = (),
) -> RapportHierarchie:
    """Évalue une hiérarchie déclarée et vérifie la règle des deux cadres typée."""
    cadres = tuple(cadres)
    replis = replis or {}
    rapports = tuple(
        promouvoir(
            c,
            cadres,
            repli=replis.get(c.identifiant, Statut.VOISINAGE),
            transferts=transferts,
        )
        for c in cadres
    )
    promus = frozenset(r.identifiant for r in rapports if r.est_cadre)
    verdict, motif = _verifier_regle_deux_cadres(cadres, promus)
    return RapportHierarchie(rapports, verdict, motif)
