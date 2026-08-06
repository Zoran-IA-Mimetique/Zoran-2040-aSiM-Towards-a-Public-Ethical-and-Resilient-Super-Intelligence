"""Jauge normative `S` — forme canonique gelée, valeur `NON_MESURÉ`.

```text
S = (β × ΔΦ) / (1 + T + σ)
```

## Le défaut que ce module corrige

Une version antérieure prenait quatre `float` renseignés pour quatre mesures.
C'était faux, et c'était exactement la fabrication de score que le §27
interdit : quatre nombres sans proxy, sans normalisation, sans incertitude et
sans provenance ne mesurent rien. Le seul fait qu'une variable Python contienne
`0.7` ne dit pas d'où vient `0.7`.

## Deux registres, séparés par la structure du module

| | Entrée | Sortie | Statut |
| --- | --- | --- | --- |
| `calcul_formel()` | quatre nombres nus | un nombre | **`CALCUL_FORMEL`** — arithmétique, jamais une mesure |
| `evaluer_S()` | un `ContratDeMesure` | `None` sans contrat complet | **`NON_MESURÉ`** tant que le contrat manque |

`calcul_formel` existe pour vérifier l'algèbre — notamment que le `1` du
dénominateur tient quand `T = σ = 0`. Son résultat porte le statut
`CALCUL_FORMEL` et **ne doit jamais être présenté comme une mesure**, ni dans
le code, ni dans la documentation, ni dans un rapport.

`evaluer_S` est l'API publique. Elle exige un **contrat de mesure** : chacun
des quatre termes doit nommer son proxy, sa normalisation, son incertitude et
sa provenance, et ce proxy doit être calibré. Un jeu de proxys calibrés qui ne
sont **pas reliés** aux quatre termes ne débloque rien.

Aucun contrat de mesure n'existe dans ce dépôt — voir `CONTRAT_ZORAN`. Donc
`evaluer_S()` rend `S = NON_MESURÉ`, et c'est la réponse correcte.

Le `1` du dénominateur est obligatoire. Sans lui, `T = σ = 0` ferait diverger
`S`. Il est vérifié par test.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Sequence

from .proxys import ProxyDeclare

#: Forme canonique, citée telle quelle. Toute autre écriture est un écart.
FORMULE_CANONIQUE = "S = (β × ΔΦ) / (1 + T + σ)"

#: Le terme constant du dénominateur, non négociable.
CONSTANTE_DENOMINATEUR = 1.0

#: Les quatre termes, dans l'ordre de la formule.
TERMES = ("beta", "delta_phi", "T", "sigma")


class StatutJauge(str, Enum):
    """Ce qu'un nombre issu de ce module est — et n'est pas."""

    CALCUL_FORMEL = "CALCUL_FORMEL — arithmétique de démonstration, pas une mesure"
    HORS_DOMAINE = "HORS_DOMAINE — la forme canonique ne s'applique pas"
    NON_MESURE = "NON_MESURÉ"
    MESURE = "MESURÉ — contrat de mesure complet et proxys calibrés"


@dataclass(frozen=True)
class ResultatFormel:
    """Sortie de `calcul_formel`. Son statut n'est jamais `MESURE`."""

    valeur: float | None
    statut: StatutJauge
    motif: str

    def __post_init__(self) -> None:
        if self.statut is StatutJauge.MESURE:
            raise ValueError(
                "un calcul formel ne peut pas porter le statut MESURÉ : "
                "l'arithmétique ne mesure rien (§27)"
            )


@dataclass(frozen=True)
class TermeMesure:
    """Un terme de la jauge **relié** à ce qui le produit.

    Les cinq champs sont obligatoires. Un terme qui n'en renseigne qu'une
    partie n'est pas mesuré : il est renseigné, ce qui n'est pas la même chose.
    """

    valeur: float
    proxy: str          # identifiant d'un ProxyDeclare calibré
    normalisation: str  # comment la grandeur brute devient ce nombre
    incertitude: float
    provenance: str     # jeu de données, campagne, empreinte d'exécution

    def __post_init__(self) -> None:
        if not math.isfinite(self.valeur):
            raise ValueError("valeur non finie : hors domaine de la forme canonique")
        if not math.isfinite(self.incertitude) or self.incertitude < 0.0:
            raise ValueError("incertitude absente, négative ou non finie")
        for champ in ("proxy", "normalisation", "provenance"):
            if not getattr(self, champ).strip():
                raise ValueError(
                    f"{champ} vide : le terme n'est pas relié à ce qui le produit, "
                    "donc il n'est pas mesuré (§27)"
                )


@dataclass(frozen=True)
class ContratDeMesure:
    """Le lien explicite entre les quatre termes et leurs proxys.

    Tant qu'un des quatre est `None`, le contrat est incomplet et `S` reste
    `NON_MESURÉ`. Il n'existe pas de contrat partiel utilisable : la formule
    n'a pas de valeur si un seul de ses termes manque.
    """

    beta: TermeMesure | None = None
    delta_phi: TermeMesure | None = None
    T: TermeMesure | None = None
    sigma: TermeMesure | None = None

    @property
    def termes_absents(self) -> tuple[str, ...]:
        return tuple(nom for nom in TERMES if getattr(self, nom) is None)

    @property
    def est_complet(self) -> bool:
        return not self.termes_absents

    @property
    def proxys_requis(self) -> tuple[str, ...]:
        return tuple(
            getattr(self, nom).proxy for nom in TERMES if getattr(self, nom) is not None
        )


#: **Aucun contrat de mesure n'existe pour ZORAN.** Proxys, seuils et
#: pondérations ne sont pas calibrés (§27), et aucun des quatre termes n'est
#: relié à une observable. `None` vaut ici `NON_MESURÉ`, pas « à faire plus tard ».
CONTRAT_ZORAN: ContratDeMesure | None = None


def calcul_formel(
    beta: float, delta_phi: float, T: float, sigma: float
) -> ResultatFormel:
    """Évalue l'**algèbre** de la forme canonique. Ne mesure rien.

    Sert à vérifier des propriétés de la formule — en particulier que le `1`
    du dénominateur empêche la divergence à `T = σ = 0`. Le statut rendu est
    `CALCUL_FORMEL` ou `HORS_DOMAINE`, jamais `MESURE`.
    """
    valeurs = {"β": beta, "ΔΦ": delta_phi, "T": T, "σ": sigma}

    non_finis = [nom for nom, v in valeurs.items() if not math.isfinite(v)]
    if non_finis:
        return ResultatFormel(
            None,
            StatutJauge.HORS_DOMAINE,
            f"valeur(s) non finie(s) : {non_finis} — NaN et l'infini ne sont pas "
            "des points du domaine",
        )

    negatifs = [nom for nom in ("T", "σ") if valeurs[nom] < 0.0]
    if negatifs:
        return ResultatFormel(
            None,
            StatutJauge.HORS_DOMAINE,
            f"terme(s) de charge négatif(s) : {negatifs} — `T` et `σ` sont des "
            "charges, la forme canonique ne les définit pas en dessous de zéro",
        )

    denominateur = CONSTANTE_DENOMINATEUR + T + sigma
    if denominateur <= 0.0:
        return ResultatFormel(
            None,
            StatutJauge.HORS_DOMAINE,
            f"dénominateur non positif : 1 + T + σ = {denominateur}",
        )

    return ResultatFormel(
        (beta * delta_phi) / denominateur,
        StatutJauge.CALCUL_FORMEL,
        f"calcul formel sous {FORMULE_CANONIQUE} — dénominateur {denominateur}. "
        "Ce nombre n'est PAS une mesure.",
    )


def evaluer_S(
    contrat: ContratDeMesure | None = None,
    proxys: Sequence[ProxyDeclare] = (),
) -> tuple[float | None, str]:
    """API publique. Rend `(None, motif)` — `S = NON_MESURÉ` — sans contrat complet.

    Quatre portes, en conjonction et jamais en moyenne (§12.2) :

    1. un contrat de mesure existe ;
    2. il est complet — les quatre termes sont reliés à un proxy, une
       normalisation, une incertitude et une provenance ;
    3. **chaque proxy nommé par le contrat** est déclaré et calibré. Un jeu de
       proxys calibrés mais non reliés aux termes ne débloque rien ;
    4. les valeurs sont dans le domaine de la forme canonique.

    Un nombre calculé hors de ces conditions serait un score sans référence,
    c'est-à-dire un chiffre présentable et faux.
    """
    if contrat is not None and not isinstance(contrat, ContratDeMesure):
        raise TypeError(
            "evaluer_S attend un ContratDeMesure, pas des nombres nus. Quatre "
            "valeurs sans proxy, normalisation, incertitude ni provenance ne "
            "mesurent rien — utiliser calcul_formel() pour l'algèbre seule."
        )

    if contrat is None:
        return None, (
            "S = NON_MESURÉ — aucun contrat de mesure. Les quatre termes ne sont "
            "reliés à aucun proxy, aucune normalisation, aucune provenance (§27)."
        )

    if not contrat.est_complet:
        return None, (
            "S = NON_MESURÉ — contrat incomplet, termes non reliés : "
            f"{list(contrat.termes_absents)}"
        )

    par_identifiant = {p.identifiant: p for p in proxys}
    inconnus: list[str] = []
    non_calibres: list[str] = []
    for nom in TERMES:
        terme: TermeMesure = getattr(contrat, nom)
        proxy = par_identifiant.get(terme.proxy)
        if proxy is None:
            inconnus.append(f"{nom} → {terme.proxy}")
        elif not proxy.seuil_est_calibre:
            non_calibres.append(f"{nom} → {terme.proxy} ({proxy.statut_seuil().value})")

    if inconnus:
        return None, (
            "S = NON_MESURÉ — proxy nommé par le contrat mais absent des proxys "
            f"déclarés : {inconnus}"
        )
    if non_calibres:
        return None, (
            f"S = NON_MESURÉ — proxy(s) non calibré(s) : {non_calibres}"
        )

    formel = calcul_formel(
        contrat.beta.valeur,
        contrat.delta_phi.valeur,
        contrat.T.valeur,
        contrat.sigma.valeur,
    )
    if formel.valeur is None:
        return None, f"S = NON_MESURÉ — {formel.motif}"

    return formel.valeur, (
        f"contrat complet, quatre proxys calibrés, {FORMULE_CANONIQUE}"
    )
