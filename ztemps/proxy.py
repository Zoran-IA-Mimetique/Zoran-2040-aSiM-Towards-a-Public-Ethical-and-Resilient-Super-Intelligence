"""Premier proxy candidat de `C` — Z-TEMPS-PHYS-V1 §2 et §10.

§2 : chaque composante « mesure la proportion de relations conservées et
compatibles à l'échelle considérée, après alignement par le groupe de symétries
déclaré ». Ce module prend cette phrase au pied de la lettre et rien de plus.

Ce proxy n'est **pas** une mesure physique de `C`. C'est une lecture
opérationnelle de la définition du §2, applicable à tout système décrit par des
relations mesurables. Sa valeur se juge au §7 : s'il dépend de la
représentation, ou s'il n'admet pas de `τ_*` transférable, il est réfuté.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from .profile import CoherenceProfile, Scale

#: Une relation est un couple non ordonné de constituants.
Relation = tuple[int, int]
#: Un état relationnel associe une valeur mesurée à chaque relation.
RelationalState = Mapping[Relation, float]
#: Une symétrie est un réétiquetage des constituants.
Permutation = Mapping[int, int]


def _key(i: int, j: int) -> Relation:
    return (i, j) if i <= j else (j, i)


@dataclass(frozen=True)
class ObjectSpec:
    """Déclaration d'un objet : ses constituants, son cadre, ses symétries.

    Rien ici n'est temporel (invariant 3) : uniquement de la structure.
    """

    constituents: frozenset[int]
    frame: frozenset[int] = frozenset()
    adjacency: frozenset[Relation] = frozenset()
    symmetries: tuple[Permutation, ...] = ()

    def __post_init__(self) -> None:
        overlap = self.constituents & self.frame
        if overlap:
            raise ValueError(
                f"constituants à la fois dans l'objet et dans son cadre : {sorted(overlap)}"
            )
        if not self.constituents:
            raise ValueError("un objet sans constituant n'a pas de relations")

    def scale_sets(self, state: RelationalState) -> dict[Scale, frozenset[Relation]]:
        """Les quatre échelles du §2, emboîtées.

        L'emboîtement `LOCAL ⊆ OBJET ⊆ CADRE ⊆ GLOBAL` est ce qui donne son sens
        à « conservation des cadres inférieurs et pairs » (invariant 5) : une
        échelle supérieure contient les relations des échelles inférieures et ne
        peut donc pas les effacer.
        """
        present = frozenset(_key(*r) for r in state)
        obj = frozenset(
            r for r in present if r[0] in self.constituents and r[1] in self.constituents
        )
        local = frozenset(_key(*r) for r in self.adjacency) & obj
        cadre = frozenset(
            r
            for r in present
            if (r[0] in self.constituents or r[1] in self.constituents)
            and r[0] in self.constituents | self.frame
            and r[1] in self.constituents | self.frame
        ) | obj
        return {
            Scale.LOCAL: local or obj,
            Scale.OBJET: obj,
            Scale.CADRE: cadre,
            Scale.GLOBAL: present,
        }


@dataclass(frozen=True)
class RelationalOverlapProxy:
    """Proxy candidat : fraction de relations conservées ET compatibles.

    - *conservée* : `|r' - r| <= tolerance` ;
    - *compatible* : pas d'inversion de signe (`r · r' >= 0`). Une relation qui
      change de signe n'est pas une relation légèrement altérée, c'est une
      relation contradictoire — même quand l'écart est petit.

    L'alignement du §2 est réalisé en prenant le **meilleur** réétiquetage du
    groupe déclaré : `C_s = max_{g ∈ G} fraction_préservée(r, g·r')`. C'est ce
    qui rend le proxy invariant par les symétries de l'objet (invariants 2 et 4)
    par construction, et non par vérification a posteriori.
    """

    spec: ObjectSpec
    tolerance: float = 0.05

    def __post_init__(self) -> None:
        if self.tolerance < 0.0:
            raise ValueError("la tolérance ne peut pas être négative")

    def _relabel(self, state: RelationalState, perm: Permutation) -> RelationalState:
        return {_key(perm.get(i, i), perm.get(j, j)): v for (i, j), v in state.items()}

    def _preserved_fraction(
        self,
        before: RelationalState,
        after: RelationalState,
        relations: Iterable[Relation],
    ) -> float:
        relations = list(relations)
        if not relations:
            # Aucune relation à cette échelle : l'identité n'y est pas définie.
            return 0.0
        kept = 0
        for rel in relations:
            r0 = before.get(rel)
            r1 = after.get(rel)
            if r0 is None or r1 is None:
                continue  # relation disparue : ni conservée ni compatible
            if r0 * r1 < 0.0:
                continue  # incompatible
            if abs(r1 - r0) <= self.tolerance:
                kept += 1
        return kept / len(relations)

    def __call__(
        self, before: RelationalState, after: RelationalState
    ) -> CoherenceProfile:
        """Profil `C(e)` de la transformation menant de `before` à `after`."""
        before = {_key(*r): v for r, v in before.items()}
        after = {_key(*r): v for r, v in after.items()}
        scale_sets = self.spec.scale_sets(before)
        candidates: Sequence[RelationalState] = [after] + [
            self._relabel(after, perm) for perm in self.spec.symmetries
        ]
        values = {}
        for scale, relations in scale_sets.items():
            values[scale] = max(
                self._preserved_fraction(before, candidate, relations)
                for candidate in candidates
            )
        return CoherenceProfile(values)


@dataclass(frozen=True)
class OverlapRatioProxy:
    """Proxy révisé — décision D1 de `DECISIONS-SPEC-001.md`.

    Le proxy à seuil (`RelationalOverlapProxy`) sature : quand les relations ont
    décru vers zéro, l'écart pas-à-pas passe sous la tolérance et tout est
    déclaré conservé, si bien qu'un objet mort est mesuré parfaitement cohérent
    (constat F1 de `RESULTATS-PROXY-C-001.md`).

    Le défaut ne vient pas de la lecture incrémentale — qui doit être conservée,
    la loi du §3 étant écrite comme une différentielle — mais du **comptage à
    seuil**, qui jette l'information de magnitude. On le remplace par un rapport
    de recouvrement continu :

    ```text
    C_s = Σ_s min(|r|, |r'|) · compatible(r, r')  /  Σ_s max(|r|, |r'|)
    ```

    Propriétés, vérifiées dans les tests :

    - état inchangé → `C = 1` (P1 tient) ;
    - décroissance exponentielle uniforme de facteur `q` → `C = q` **constant**,
      donc `D` constant par pas et `τ_Z` linéaire dans le temps de référence.
      C'est P5 au sens fort, que le proxy à seuil ne pouvait pas produire ;
    - relations toutes nulles → dénominateur nul → `C = 0` : un objet dont
      aucune relation n'est mesurable n'est plus défini. La saturation devient
      une dissolution, ce qui est le comportement attendu ;
    - **aucune tolérance θ** : un paramètre libre de moins.
    """

    spec: ObjectSpec

    def _overlap(
        self,
        before: RelationalState,
        after: RelationalState,
        relations: Iterable[Relation],
    ) -> float:
        numerator = 0.0
        denominator = 0.0
        for rel in relations:
            r0 = before.get(rel, 0.0)
            r1 = after.get(rel, 0.0)
            denominator += max(abs(r0), abs(r1))
            if r0 * r1 >= 0.0:  # compatibles : pas d'inversion de signe
                numerator += min(abs(r0), abs(r1))
        if denominator == 0.0:
            # Aucune relation mesurable : l'identité n'est pas définie à cette
            # échelle. Ce n'est pas « parfaitement conservé ».
            return 0.0
        return numerator / denominator

    def __call__(
        self, before: RelationalState, after: RelationalState
    ) -> CoherenceProfile:
        before = {_key(*r): v for r, v in before.items()}
        after = {_key(*r): v for r, v in after.items()}
        scale_sets = self.spec.scale_sets(before)
        candidates: Sequence[RelationalState] = [after] + [
            self._relabel(after, perm) for perm in self.spec.symmetries
        ]
        return CoherenceProfile(
            {
                scale: max(
                    self._overlap(before, candidate, relations)
                    for candidate in candidates
                )
                for scale, relations in scale_sets.items()
            }
        )

    def _relabel(self, state: RelationalState, perm: Permutation) -> RelationalState:
        return {_key(perm.get(i, i), perm.get(j, j)): v for (i, j), v in state.items()}
