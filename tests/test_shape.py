"""Exposant de forme de τ_Z — voir RESULTATS-FORME-006.md."""

import math
import unittest

from experiments.run_shape_006 import cumulative_tau_z, envelope_states, synthetic
from ztemps.profile import Scale
from ztemps.shape import stretching_exponent, tau_z_exponent


class StretchingExponent(unittest.TestCase):
    def test_recovers_beta_from_the_envelope_alone(self):
        for beta in (0.5, 1.0, 2.0):
            with self.subTest(beta=beta):
                times, amplitudes = synthetic(beta)
                fit = stretching_exponent(times, amplitudes)
                self.assertAlmostEqual(fit.exponent, beta, places=6)

    def test_needs_three_usable_points(self):
        with self.assertRaises(ValueError):
            stretching_exponent([1.0, 2.0], [0.5, 0.4])


class TauZShape(unittest.TestCase):
    """La prédiction centrale : pente log-log de τ_Z = β."""

    def test_slope_follows_beta(self):
        for beta in (0.5, 1.0, 1.5, 2.0):
            with self.subTest(beta=beta):
                times, amplitudes = synthetic(beta)
                cumulative = cumulative_tau_z(envelope_states(amplitudes))
                slope = tau_z_exponent(times[1:], cumulative)
                self.assertLess(abs(slope.exponent - beta), 0.05)
                self.assertGreater(slope.r_squared, 0.9999)

    def test_slope_is_independent_of_tau_star(self):
        """F4 — τ_* déplace la droite en log-log, il ne la penche pas."""
        times, amplitudes = synthetic(2.0)
        states = envelope_states(amplitudes)
        a = tau_z_exponent(times[1:], cumulative_tau_z(states, tau_star=1.0))
        b = tau_z_exponent(times[1:], cumulative_tau_z(states, tau_star=1e4))
        self.assertAlmostEqual(a.exponent, b.exponent, places=12)

    def test_slope_is_independent_of_weights(self):
        """F5 — aucun poids ne peut être réglé pour faire réussir la prédiction."""
        times, amplitudes = synthetic(2.0)
        states = envelope_states(amplitudes)
        flat = {s: 0.25 for s in Scale}
        skewed = {
            Scale.LOCAL: 0.7,
            Scale.OBJET: 0.1,
            Scale.CADRE: 0.1,
            Scale.GLOBAL: 0.1,
        }
        self.assertAlmostEqual(
            tau_z_exponent(times[1:], cumulative_tau_z(states, weight=flat)).exponent,
            tau_z_exponent(times[1:], cumulative_tau_z(states, weight=skewed)).exponent,
            places=12,
        )

    def test_exponential_decay_is_a_mere_clock_rescaling(self):
        """β = 1 : τ_Z ∝ t, et le §7 tiret 5 s'applique — aucun contenu nouveau."""
        times, amplitudes = synthetic(1.0)
        slope = tau_z_exponent(times[1:], cumulative_tau_z(envelope_states(amplitudes)))
        self.assertAlmostEqual(slope.exponent, 1.0, places=9)

    def test_gaussian_decay_is_not(self):
        """β = 2 : τ_Z ∝ t², qu'aucun changement d'unité ne produit."""
        times, amplitudes = synthetic(2.0)
        slope = tau_z_exponent(times[1:], cumulative_tau_z(envelope_states(amplitudes)))
        self.assertGreater(slope.exponent, 1.9)
        self.assertLess(abs(slope.exponent - 2.0), 0.05)


if __name__ == "__main__":
    unittest.main()


class Retraction(unittest.TestCase):
    """Verrouille le constat de RETRACTATION-FORME-006.md.

    Ces tests ne protègent pas une qualité : ils empêchent qu'on réaffirme un
    jour que FORME-006 était un test, alors que c'est de l'algèbre.
    """

    def test_uniform_envelope_makes_tau_z_the_log_of_the_decay(self):
        """τ_Z ≡ -ln A(t) : la prédiction est une identité, pas un énoncé."""
        times, amplitudes = synthetic(2.0)
        cumulative = cumulative_tau_z(envelope_states(amplitudes))
        for t, value in list(zip(times[1:], cumulative))[20:]:
            reference = -math.log(math.exp(-((t / 3.0) ** 2)))
            self.assertLess(abs(value - reference) / reference, 0.02)

    def test_weight_independence_only_holds_when_scales_are_identical(self):
        """F5 tenait parce que Σ w_s = 1, pas parce que la loi le prédisait.

        Dès que les échelles décroissent différemment, la pente dépend des
        poids — et le paramètre libre est de retour.
        """
        from ztemps import Transformation, Weights, tau_z
        from ztemps.proxy import ObjectSpec, OverlapRatioProxy

        spec = ObjectSpec(
            constituents=frozenset(range(4)),
            adjacency=frozenset((i, i + 1) for i in range(3)),
        )
        proxy = OverlapRatioProxy(spec)
        pairs = [(i, j) for i in range(4) for j in range(4) if i < j]
        adjacent = {(0, 1), (1, 2), (2, 3)}
        states = [
            {
                p: (
                    math.exp(-((k * 0.02 / 3.0) ** 2))
                    if p in adjacent
                    else math.exp(-k * 0.02 / 3.0)
                )
                for p in pairs
            }
            for k in range(201)
        ]
        events = [
            Transformation(sample_id=f"p{k}", profile=proxy(states[k - 1], states[k]))
            for k in range(1, 201)
        ]

        def slope_for(weights):
            w = Weights(weights, calibration_sample_ids={"retractation"})
            cumulative = [
                tau_z(
                    events[:k], w, tau_star=1.0, dissolving_scales={Scale.OBJET}
                ).value
                for k in range(1, 201)
            ]
            return tau_z_exponent([k * 0.02 for k in range(1, 201)], cumulative).exponent

        local_heavy = slope_for(
            {
                Scale.LOCAL: 0.97,
                Scale.OBJET: 0.01,
                Scale.CADRE: 0.01,
                Scale.GLOBAL: 0.01,
            }
        )
        global_heavy = slope_for(
            {
                Scale.LOCAL: 0.01,
                Scale.OBJET: 0.01,
                Scale.CADRE: 0.01,
                Scale.GLOBAL: 0.97,
            }
        )
        self.assertGreater(abs(local_heavy - global_heavy), 0.4)
