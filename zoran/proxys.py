"""Point 4 de l'ordre de travail — gel de la structure avant calcul.

> Geler les proxys, les seuils, les liens causaux et les données manquantes
> avant calcul.

## Ce qui est gelable sans arbitrage physique, et ce qui ne l'est pas

Je m'étais déclaré bloqué sur ce point. C'était une erreur : la structure se
gèle sans inventer une seule valeur.

**Gelable ici** — identité du proxy, grandeur physique, unité, lieu de mesure,
**sens** du seuil, criticité, traitement des absences, protocole de calibration.

**Non gelable ici** — la **valeur** des seuils. Elle reste `None`, c'est-à-dire
`NON_MESURÉ`, et le §23 l'exige : « Les coefficients physiques non calibrés
restent étiquetés NON_MESURÉ. »

Le code force cette séparation : une valeur de seuil sans protocole de
calibration déclaré est refusée à la construction. On ne peut pas poser un
nombre sans dire comment il serait obtenu.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Mapping, Sequence


class SensSeuil(str, Enum):
    """Dans quel sens le franchissement dégrade — §23, « sens des seuils »."""

    CROISSANT_DEGRADE = "dégradation quand la grandeur croît"
    DECROISSANT_DEGRADE = "dégradation quand la grandeur décroît"
    BILATERAL = "dégradation hors d'une plage admissible"


class Criticite(str, Enum):
    """§11 — « Un seul invariant critique violé suffit à sortir du noyau »."""

    CRITIQUE = "critique : sa violation sort du noyau de viabilité"
    NON_CRITIQUE = "non critique : dégrade sans sortir seul"
    NON_MESUREE = "NON_MESURÉ"


class StatutSeuil(str, Enum):
    """Défaut 3 de l'audit — un protocole déclaré n'est pas une calibration exécutée.

    L'ancienne version qualifiait de « MESURÉ » un seuil simplement renseigné
    avec un texte de protocole. C'était faux : un protocole dit comment on
    obtiendrait la valeur, il ne l'obtient pas.
    """

    NON_MESURE = "NON_MESURÉ"
    PROTOCOLE_ABSENT = "protocole absent"
    PROTOCOLE_DECLARE = "protocole déclaré, calibration non exécutée"
    CALIBRATION_EXECUTEE = "calibration exécutée, traçabilité incomplète"
    SEUIL_CALIBRE = "seuil calibré, traçable"


@dataclass(frozen=True)
class Calibration:
    """Résultat d'une calibration réellement exécutée.

    Les cinq champs sont obligatoires pour atteindre `SEUIL_CALIBRE`. Il ne
    suffit pas d'avoir un nombre : il faut savoir d'où il vient, avec quelle
    incertitude, et pouvoir le retrouver.
    """

    resultat: float
    incertitude: float
    source: str      # jeu de données ou campagne
    provenance: str  # fichier, empreinte ou identifiant d'exécution

    def __post_init__(self) -> None:
        if self.incertitude < 0.0:
            raise ValueError("l'incertitude ne peut pas être négative")
        for champ in ("source", "provenance"):
            if not getattr(self, champ).strip():
                raise ValueError(
                    f"{champ} vide : une calibration sans provenance vérifiable "
                    "n'est pas traçable (§23)"
                )

    @property
    def est_complete(self) -> bool:
        return bool(self.source.strip() and self.provenance.strip())


class TraitementAbsence(str, Enum):
    """§24 — « Les données manquantes sont NON_MESURÉ, jamais imputées »."""

    NON_MESURE = "absence → NON_MESURÉ, aucune imputation"
    ABSTENTION = "absence → abstention sur l'objet, comptée dans le taux"


@dataclass(frozen=True)
class ProxyDeclare:
    """Un proxy gelé en structure, sa valeur de seuil restant NON_MESURÉ."""

    identifiant: str
    cadre: str
    grandeur: str
    unite: str
    lieu_de_mesure: str
    sens_seuil: SensSeuil
    criticite: Criticite
    traitement_absence: TraitementAbsence
    protocole_calibration: str | None = None
    #: Reste `None` — NON_MESURÉ — tant que le protocole n'a pas été exécuté.
    seuil: float | None = None
    #: Résultat de la calibration, quand elle a réellement été exécutée.
    calibration: Calibration | None = None
    note: str = ""

    def __post_init__(self) -> None:
        for champ in ("identifiant", "cadre", "grandeur", "unite", "lieu_de_mesure"):
            if not getattr(self, champ).strip():
                raise ValueError(f"{champ} vide : le proxy n'est pas gelable")
        if self.seuil is not None and not self.protocole_calibration:
            raise ValueError(
                f"{self.identifiant} : une valeur de seuil sans protocole de "
                "calibration est interdite (§23). Poser un nombre sans dire "
                "comment il s'obtient, c'est le contraire d'un gel."
            )

    @property
    def seuil_est_calibre(self) -> bool:
        """Vrai seulement si la calibration a été exécutée **et** est traçable.

        Renommé depuis `seuil_est_mesure` : l'ancien nom laissait croire qu'un
        seuil renseigné était mesuré (défaut 3 de l'audit).
        """
        return self.statut_seuil() is StatutSeuil.SEUIL_CALIBRE

    def statut_seuil(self) -> StatutSeuil:
        """Statut exact, en cinq valeurs distinctes plutôt qu'un booléen."""
        if not self.protocole_calibration:
            return StatutSeuil.PROTOCOLE_ABSENT
        if self.calibration is None:
            return StatutSeuil.PROTOCOLE_DECLARE
        if self.seuil is None or not self.calibration.est_complete:
            return StatutSeuil.CALIBRATION_EXECUTEE
        return StatutSeuil.SEUIL_CALIBRE


@dataclass(frozen=True)
class TransfertCausal:
    """Lien causal déclaré entre deux cadres, sur une grandeur donnée.

    Sert à décrire une grandeur qui **circule** entre cadres sans être la même
    observable — cas de la température de contact et de la température de
    voisinage. Déclarer le transfert évite à la fois le double comptage et la
    perte d'information que produirait une fusion.
    """

    source: str
    cible: str
    grandeur: str
    mecanisme: str
    statut: str = "NON_MESURÉ"

    def __post_init__(self) -> None:
        if self.source == self.cible:
            raise ValueError("un transfert relie deux cadres distincts")
        for champ in ("grandeur", "mecanisme"):
            if not getattr(self, champ).strip():
                raise ValueError(f"{champ} vide : le transfert n'est pas testable")


def portes_absolues(proxys: Sequence[ProxyDeclare]) -> tuple[str, ...]:
    """Proxys critiques dont le seuil reste NON_MESURÉ.

    §24 : « Les portes absolues passent avant toute comparaison relative. »
    Tant que cette liste n'est pas vide, aucune porte absolue n'est calculable
    et tout verdict comparatif serait prématuré.
    """
    return tuple(
        p.identifiant
        for p in proxys
        if p.criticite is Criticite.CRITIQUE and not p.seuil_est_calibre
    )


def gel_complet(proxys: Sequence[ProxyDeclare]) -> tuple[bool, str]:
    """La structure est-elle gelée ? Conjonction, jamais une moyenne."""
    sans_protocole = [p.identifiant for p in proxys if not p.protocole_calibration]
    sans_criticite = [
        p.identifiant for p in proxys if p.criticite is Criticite.NON_MESUREE
    ]
    manques = []
    if sans_protocole:
        manques.append(f"sans protocole de calibration : {sans_protocole}")
    if sans_criticite:
        manques.append(f"criticité NON_MESURÉE : {sans_criticite}")
    if manques:
        return False, " ; ".join(manques)
    return True, (
        "structure gelée : identités, unités, lieux, sens, criticités et "
        "protocoles sont déclarés. Aucun seuil n'est calibré — les protocoles "
        "sont DÉCLARÉS, pas EXÉCUTÉS."
    )


# --- §13 — Roulement : proxys gelés --------------------------------------

_CAL_LABO = (
    "campagne de calibration sur banc instrumenté : balayage de charge et de "
    "régime, mesure simultanée du proxy et de l'état de référence, seuil fixé "
    "au quantile de sortie observé, gelé avant ouverture de la vérité (§23)"
)
_CAL_CORPUS = (
    "estimation sur corpus annoté (XJTU-SY en transfert principal, NASA IMS en "
    "contrôle externe), groupes causaux séparés entre apprentissage et test "
    "(§17), seuil gelé avant ouverture de la vérité"
)

PROXYS_ROULEMENT: tuple[ProxyDeclare, ...] = (
    ProxyDeclare(
        identifiant="R0_temperature_contact",
        cadre="R0 — Bille",
        grandeur="température de l'interface bille–piste",
        unite="K",
        lieu_de_mesure="interface de contact hertzien, résolution temporelle "
        "suffisante pour capter les pics rapides",
        sens_seuil=SensSeuil.CROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
        protocole_calibration=_CAL_LABO,
        note="Distincte de R1_temperature_voisinage : même dimension physique, "
        "observable différente. Ne pas fusionner — voir TRANSFERTS.",
    ),
    ProxyDeclare(
        identifiant="R1_temperature_voisinage",
        cadre="R1 — Voisinage",
        grandeur="température du film, de la cage et de la zone de contacts",
        unite="K",
        lieu_de_mesure="zone de voisinage, agrégée spatialement et "
        "temporellement",
        sens_seuil=SensSeuil.CROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
        protocole_calibration=_CAL_LABO,
        note="L'agrégation est constitutive : ce proxy n'est pas la moyenne de "
        "R0_temperature_contact, il mesure un autre objet.",
    ),
    ProxyDeclare(
        identifiant="R0_fissure",
        cadre="R0 — Bille",
        grandeur="longueur ou profondeur de fissure",
        unite="m",
        lieu_de_mesure="surface et sous-couche de la bille",
        sens_seuil=SensSeuil.CROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
        protocole_calibration=_CAL_LABO,
    ),
    ProxyDeclare(
        identifiant="R1_epaisseur_film",
        cadre="R1 — Voisinage",
        grandeur="épaisseur du film lubrifiant",
        unite="m",
        lieu_de_mesure="entre corps roulant et piste, au droit du contact",
        sens_seuil=SensSeuil.DECROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
        protocole_calibration=_CAL_LABO,
        note="Sens inverse des autres : c'est la décroissance qui dégrade.",
    ),
    ProxyDeclare(
        identifiant="R3_vibration_globale",
        cadre="R3 — Roulement complet",
        grandeur="amplitude vibratoire large bande",
        unite="m·s⁻²",
        lieu_de_mesure="palier, accéléromètre",
        sens_seuil=SensSeuil.CROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.ABSTENTION,
        protocole_calibration=_CAL_CORPUS,
        note="§17 : PRONOSTIA s'arrête autour de 20 g de façon non uniforme ; "
        "XJTU-SY dépasse 10× le régime normal. Frontières hétérogènes : le "
        "seuil ne se transfère pas entre corpus sans recalibration.",
    ),
    ProxyDeclare(
        identifiant="R4_desalignement",
        cadre="R4 — Machine",
        grandeur="désalignement arbre/logement",
        unite="rad",
        lieu_de_mesure="montage machine, mesure au comparateur ou au laser",
        sens_seuil=SensSeuil.BILATERAL,
        criticite=Criticite.NON_CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
        protocole_calibration=_CAL_LABO,
        note="Bilatéral : un désalignement de signe opposé dégrade aussi.",
    ),
)

TRANSFERTS_ROULEMENT: tuple[TransfertCausal, ...] = (
    TransfertCausal(
        source="R0 — Bille",
        cible="R1 — Voisinage",
        grandeur="chaleur de contact",
        mecanisme="conduction et convection du contact vers le film, la cage et "
        "les pistes ; les pics rapides de R0 s'amortissent et se moyennent dans "
        "R1, avec un retard et un facteur de forme à mesurer",
        statut="NON_MESURÉ — retard et facteur de forme non calibrés",
    ),
)
