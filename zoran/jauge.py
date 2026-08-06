"""Jauge normative `S` — forme canonique gelée, valeur `NON_MESURÉ`.

§27 : « `S` reste NON_MESURÉ tant que proxys, seuils et pondérations ne sont
pas calibrés. » Ce module ne calcule donc rien tant que les quatre termes ne
sont pas mesurés **et** que les proxys critiques ne sont pas calibrés.

Il existe pour une seule raison : rendre la forme canonique **opposable**.

```text
S = (β × ΔΦ) / (1 + T + σ)
```

Le `1` du dénominateur est obligatoire. Sans lui, `T = σ = 0` ferait diverger
`S`, et la jauge cesserait d'être bornée là où elle doit l'être. Le code
refuse toute écriture qui le retire.

Ce module n'introduit aucune prétention nouvelle : il n'ajoute pas de terme,
n'en retire pas, et ne produit pas de nombre. Il interdit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .proxys import Criticite, ProxyDeclare, portes_absolues

#: Forme canonique, citée telle quelle. Toute autre écriture est un écart.
FORMULE_CANONIQUE = "S = (β × ΔΦ) / (1 + T + σ)"

#: Le terme constant du dénominateur, non négociable.
CONSTANTE_DENOMINATEUR = 1.0


@dataclass(frozen=True)
class TermesJauge:
    """Les quatre termes de la jauge. `None` vaut `NON_MESURÉ`, jamais zéro."""

    beta: float | None = None
    delta_phi: float | None = None
    T: float | None = None
    sigma: float | None = None

    @property
    def termes_non_mesures(self) -> tuple[str, ...]:
        return tuple(
            nom
            for nom in ("beta", "delta_phi", "T", "sigma")
            if getattr(self, nom) is None
        )


def evaluer_S(
    termes: TermesJauge = TermesJauge(),
    proxys: Sequence[ProxyDeclare] = (),
) -> tuple[float | None, str]:
    """Retourne `(None, motif)` — `NON_MESURÉ` — tant qu'une condition manque.

    Deux portes, en conjonction et jamais en moyenne (§12.2) :

    1. les quatre termes doivent être mesurés ;
    2. **aucun** proxy critique ne doit rester sans seuil calibré.

    La seconde porte est la plus contraignante : un nombre calculé sur des
    proxys non calibrés serait un score sans référence, c'est-à-dire un
    chiffre présentable et faux.
    """
    manques: list[str] = []

    absents = termes.termes_non_mesures
    if absents:
        manques.append(f"termes NON_MESURÉS : {list(absents)}")

    bloquantes = portes_absolues(proxys)
    if bloquantes:
        manques.append(
            f"{len(bloquantes)} proxy(s) critique(s) sans seuil calibré : "
            f"{list(bloquantes)}"
        )
    elif not any(p.criticite is Criticite.CRITIQUE for p in proxys):
        manques.append(
            "aucun proxy critique déclaré : la porte absolue n'est pas "
            "évaluable, donc `S` non plus (§24)"
        )

    if manques:
        return None, "S = NON_MESURÉ — " + " ; ".join(manques)

    denominateur = CONSTANTE_DENOMINATEUR + termes.T + termes.sigma
    if denominateur <= 0.0:
        return None, (
            "S = NON_MESURÉ — dénominateur non positif : "
            f"1 + T + σ = {denominateur}. Hors domaine de la forme canonique."
        )
    return (termes.beta * termes.delta_phi) / denominateur, (
        f"calculé sous la forme canonique {FORMULE_CANONIQUE}"
    )
