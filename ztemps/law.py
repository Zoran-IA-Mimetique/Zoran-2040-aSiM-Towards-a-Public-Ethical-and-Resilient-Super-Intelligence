"""Loi candidate dτ_Z = τ_* · D(C(e)) · dN — Z-TEMPS-PHYS-V1 §3.

Ce module implémente l'arithmétique de la loi candidate et *rien de plus*. Il ne
mesure pas `C` : la mesure physique de la cohérence est explicitement
`NON_MESURÉ` au §10 de la spécification. Un proxy externe fournit les profils ;
ce module en tire `τ_Z` et fait respecter les contraintes épistémiques du §3
(séparation calibration / évaluation) et du §5 (invariants).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence

from .profile import CoherenceProfile, DissolutionError, Scale
from .trace import Record


class CalibrationLeakError(RuntimeError):
    """Levée quand les poids ont été calibrés sur des données d'évaluation.

    §3 : « Ils ne peuvent pas être ajustés pour confirmer une série de résultats
    déjà observés. » Cette contrainte est ici rendue exécutable plutôt que
    laissée à la discipline de l'expérimentateur.
    """


@dataclass(frozen=True)
class Weights:
    """Poids `w_s` de la mesure de transformation, avec provenance obligatoire.

    Les poids ne peuvent pas exister sans jeu de calibration déclaré : un poids
    sans provenance est un paramètre libre, et un paramètre libre invalide toute
    prédiction au sens du §7.
    """

    values: Mapping[Scale, float]
    calibration_sample_ids: frozenset[str]

    def __post_init__(self) -> None:
        missing = set(Scale) - set(self.values)
        if missing:
            names = ", ".join(sorted(s.name for s in missing))
            raise ValueError(f"poids manquants pour les échelles : {names}")
        for scale, w in self.values.items():
            if w <= 0.0:
                # Invariant 5 : un poids nul supprimerait un cadre de
                # l'agrégation, ce que la conservation des cadres interdit.
                raise ValueError(
                    f"w_{scale.name} = {w} : les poids doivent être strictement "
                    "positifs (invariant 5, conservation des cadres)"
                )
        if not self.calibration_sample_ids:
            raise ValueError(
                "poids sans jeu de calibration déclaré : interdit par §3"
            )
        object.__setattr__(self, "values", {s: float(self.values[s]) for s in Scale})
        object.__setattr__(
            self, "calibration_sample_ids", frozenset(self.calibration_sample_ids)
        )

    @property
    def calibration_id(self) -> str:
        """Empreinte stable du jeu de calibration, pour la traçabilité (invariant 6)."""
        joined = "\x1f".join(sorted(self.calibration_sample_ids))
        return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]

    def __getitem__(self, scale: Scale) -> float:
        return self.values[scale]


@dataclass(frozen=True)
class Transformation:
    """Une transformation élémentaire `e` : un passage entre deux configurations.

    `sample_id` identifie le système observé, pas l'instant : le compteur `N` est
    l'index dans la séquence, et aucun horodatage n'entre ici (invariant 3).
    """

    sample_id: str
    profile: CoherenceProfile
    object_id: str = "objet"
    proxy_id: str = "proxy-non-déclaré"
    uncertainty: float | None = None


@dataclass
class TauZResult:
    """Résultat d'une intégration discrète τ_Z(N) = τ_* · Σ D(C(e))."""

    value: float
    n_integrated: int
    dissolved_at: int | None = None
    dissolution_scales: tuple[Scale, ...] = ()
    records: list[Record] = field(default_factory=list)

    @property
    def is_defined(self) -> bool:
        """Faux dès que l'objet s'est dissous : τ_Z ultérieur est indéfini (P2)."""
        return self.dissolved_at is None


def transformation_measure(profile: CoherenceProfile, weights: Weights) -> float:
    """D(C(e)) = Σ_s w_s · (1 - C_s(e)) — forme minimale testable du §3.

    Somme sur *toutes* les échelles déclarées : aucune n'est omise, aucune n'est
    écrasée par une échelle supérieure (invariant 5).
    """
    return sum(weights[s] * (1.0 - profile[s]) for s in Scale)


def tau_z(
    events: Sequence[Transformation],
    weights: Weights,
    tau_star: float,
    *,
    evaluation_sample_ids: Iterable[str] | None = None,
    stop_on_dissolution: bool = True,
) -> TauZResult:
    """Intégration discrète τ_Z(N) = τ_* · Σ[e=1..N] D(C(e)) (§3).

    L'intégration s'arrête à la dissolution : quand une composante du profil
    atteint 0, le porteur du temps n'est plus défini et la somme ne peut pas se
    poursuivre sur *ce* objet (§4, P2). Le temps déjà accumulé reste valide.

    `evaluation_sample_ids` active le contrôle de fuite de calibration du §3.
    """
    if tau_star <= 0.0:
        raise ValueError("τ_* doit être strictement positif")

    if evaluation_sample_ids is not None:
        leaked = weights.calibration_sample_ids & frozenset(evaluation_sample_ids)
        if leaked:
            raise CalibrationLeakError(
                f"{len(leaked)} échantillon(s) servent à la fois à calibrer les "
                f"poids et à évaluer la loi : {sorted(leaked)[:3]}… "
                "Les poids doivent venir d'un jeu séparé (§3)."
            )

    total = 0.0
    records: list[Record] = []
    for index, event in enumerate(events, start=1):
        dissolved = event.profile.dissolved_scales
        if dissolved:
            if stop_on_dissolution:
                return TauZResult(
                    value=tau_star * total,
                    n_integrated=index - 1,
                    dissolved_at=index,
                    dissolution_scales=dissolved,
                    records=records,
                )
            raise DissolutionError(dissolved[0], index)

        d = transformation_measure(event.profile, weights)
        total += d
        records.extend(
            Record(
                object_id=event.object_id,
                transformation_id=f"{event.sample_id}#{index}",
                scale=s,
                proxy_id=event.proxy_id,
                value=event.profile[s],
                uncertainty=event.uncertainty,
                calibration_id=weights.calibration_id,
            )
            for s in Scale
        )

    return TauZResult(value=tau_star * total, n_integrated=len(events), records=records)
