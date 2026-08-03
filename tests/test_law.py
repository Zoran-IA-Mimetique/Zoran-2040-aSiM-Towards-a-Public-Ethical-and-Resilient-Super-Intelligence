"""Conditions de domaine (§2), loi candidate (§3) et traçabilité (§5.6)."""

import unittest

from ztemps import (
    CalibrationLeakError,
    CoherenceProfile,
    Record,
    Scale,
    Transformation,
    Weights,
    tau_z,
    transformation_measure,
)


def weights(**overrides) -> Weights:
    base = {s: 1.0 for s in Scale}
    base.update({Scale[k.upper()]: v for k, v in overrides.items()})
    return Weights(base, calibration_sample_ids={"calib-a", "calib-b"})


def event(sample_id: str, profile: CoherenceProfile) -> Transformation:
    return Transformation(
        sample_id=sample_id,
        profile=profile,
        object_id="horloge-test",
        proxy_id="proxy-synthétique",
        uncertainty=0.01,
    )


class DomainConditions(unittest.TestCase):
    """§2 — 0 <= C_s <= 1, profil complet sur les quatre échelles."""

    def test_rejects_out_of_domain(self):
        for bad in (-0.1, 1.1):
            with self.subTest(value=bad):
                with self.assertRaises(ValueError):
                    CoherenceProfile.uniform(bad)

    def test_rejects_incomplete_profile(self):
        with self.assertRaises(ValueError) as ctx:
            CoherenceProfile({Scale.LOCAL: 0.9, Scale.OBJET: 0.9})
        self.assertIn("invariant 5", str(ctx.exception).lower())

    def test_dissolution_is_reported_per_scale(self):
        profile = CoherenceProfile(
            {Scale.LOCAL: 0.0, Scale.OBJET: 0.5, Scale.CADRE: 1.0, Scale.GLOBAL: 1.0}
        )
        self.assertEqual(profile.dissolved_scales, (Scale.LOCAL,))


class TransformationMeasure(unittest.TestCase):
    """§3 — D(C(e)) = Σ_s w_s · (1 - C_s(e))."""

    def test_sums_over_every_scale(self):
        profile = CoherenceProfile(
            {Scale.LOCAL: 0.5, Scale.OBJET: 0.5, Scale.CADRE: 0.5, Scale.GLOBAL: 0.5}
        )
        self.assertAlmostEqual(transformation_measure(profile, weights()), 2.0)

    def test_weights_must_be_strictly_positive(self):
        with self.assertRaises(ValueError) as ctx:
            weights(local=0.0)
        self.assertIn("invariant 5", str(ctx.exception))

    def test_weights_require_declared_calibration(self):
        with self.assertRaises(ValueError) as ctx:
            Weights({s: 1.0 for s in Scale}, calibration_sample_ids=frozenset())
        self.assertIn("§3", str(ctx.exception))


class CalibrationDiscipline(unittest.TestCase):
    """§3 — les poids ne peuvent pas être ajustés sur les résultats observés."""

    def test_overlap_between_calibration_and_evaluation_is_refused(self):
        w = weights()
        events = [event("calib-a", CoherenceProfile.uniform(0.9))]
        with self.assertRaises(CalibrationLeakError):
            tau_z(events, w, tau_star=1.0, evaluation_sample_ids={"calib-a", "eval-1"})

    def test_disjoint_sets_are_accepted(self):
        w = weights()
        events = [event("eval-1", CoherenceProfile.uniform(0.9))]
        result = tau_z(events, w, tau_star=1.0, evaluation_sample_ids={"eval-1"})
        self.assertTrue(result.is_defined)


class Traceability(unittest.TestCase):
    """§5, invariant 6 — objet, transformation, échelle, proxy, incertitude."""

    def test_one_record_per_scale_per_transformation(self):
        events = [event("eval-1", CoherenceProfile.uniform(0.8)) for _ in range(3)]
        result = tau_z(events, weights(), tau_star=1.0)
        self.assertEqual(len(result.records), 3 * len(Scale))
        row = result.records[0].as_row()
        self.assertEqual(
            set(row),
            {
                "objet",
                "transformation",
                "echelle",
                "proxy",
                "valeur",
                "incertitude",
                "calibration",
            },
        )

    def test_untraceable_record_is_refused(self):
        with self.assertRaises(ValueError):
            Record(
                object_id="",
                transformation_id="t1",
                scale=Scale.LOCAL,
                proxy_id="p",
                value=0.5,
                uncertainty=None,
                calibration_id="abc",
            )


class DissolvingScales(unittest.TestCase):
    """D2 — seule l'échelle déclarée porteuse de l'identité dissout l'objet."""

    def _local_only_zero(self):
        return event(
            "eval-1",
            CoherenceProfile(
                {
                    Scale.LOCAL: 0.0,
                    Scale.OBJET: 0.5,
                    Scale.CADRE: 0.5,
                    Scale.GLOBAL: 0.5,
                }
            ),
        )

    def test_default_still_dissolves_on_any_scale(self):
        """Le défaut reproduit l'essai 001 : ses résultats publiés ne bougent pas."""
        result = tau_z([self._local_only_zero()], weights(), tau_star=1.0)
        self.assertFalse(result.is_defined)

    def test_under_d2_a_local_zero_does_not_dissolve(self):
        result = tau_z(
            [self._local_only_zero()],
            weights(),
            tau_star=1.0,
            dissolving_scales={Scale.OBJET},
        )
        self.assertTrue(result.is_defined)
        self.assertEqual(result.n_integrated, 1)
        # L'échelle perdue contribue sa perte maximale au lieu d'arrêter le compte.
        self.assertAlmostEqual(result.value, 1.0 * (1 - 0) + 3 * (1 - 0.5))


if __name__ == "__main__":
    unittest.main()
