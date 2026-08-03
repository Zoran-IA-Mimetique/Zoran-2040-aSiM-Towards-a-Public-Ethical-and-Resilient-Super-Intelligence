"""Variation cumulée et exposant d'agrégation — voir RESULTATS-GRANULARITE-002.md."""

import unittest

from ztemps.granularity import (
    coarse_grain,
    cumulative_variation,
    decompose,
    net_variation,
    scaling_exponent,
    variation_spectrum,
)


class CoarseGraining(unittest.TestCase):
    def test_block_one_is_identity(self):
        series = [1.0, 2.0, 3.0]
        self.assertEqual(coarse_grain(series, 1), series)

    def test_incomplete_trailing_block_is_dropped(self):
        """Un bloc incomplet a une variance différente et fausserait l'exposant."""
        self.assertEqual(coarse_grain([1.0, 3.0, 5.0, 7.0, 9.0], 2), [2.0, 6.0])

    def test_rejects_zero_block(self):
        with self.assertRaises(ValueError):
            coarse_grain([1.0], 0)


class Variation(unittest.TestCase):
    def test_cumulative_counts_every_reversal(self):
        self.assertAlmostEqual(cumulative_variation([0.0, 1.0, 0.0, 1.0]), 3.0)

    def test_net_ignores_the_path(self):
        self.assertAlmostEqual(net_variation([0.0, 1.0, 0.0, 1.0]), 1.0)

    def test_cumulative_never_below_net(self):
        series = [0.0, 5.0, -2.0, 3.0]
        self.assertGreaterEqual(cumulative_variation(series), net_variation(series))


class ScalingExponent(unittest.TestCase):
    def test_monotone_signal_is_granularity_independent(self):
        ramp = [i / 999 for i in range(1000)]
        self.assertLess(abs(scaling_exponent(variation_spectrum(ramp, (1, 2, 4, 8)))), 0.05)

    def test_requires_two_granularities(self):
        with self.assertRaises(ValueError):
            scaling_exponent({4: 1.0})


class Decomposition(unittest.TestCase):
    """G4 — l'inférence publiée sur les trois nombres du pilote V1.5."""

    def test_pilot_numbers_land_in_the_stationary_noise_regime(self):
        result = decompose(fine=28.717, coarse=0.695, block=16, net=0.349)
        self.assertAlmostEqual(result.exponent, 1.589, places=3)
        self.assertGreater(result.noise_fraction, 0.98)

    def test_ordering_of_inputs_is_enforced(self):
        # V(1) > V(k) > net : une variation cumulée ne peut pas passer sous le
        # déplacement net, ni croître avec l'agrégation.
        with self.assertRaises(ValueError):
            decompose(fine=0.5, coarse=1.0, block=16, net=0.1)
        with self.assertRaises(ValueError):
            decompose(fine=2.0, coarse=0.2, block=16, net=0.5)


if __name__ == "__main__":
    unittest.main()
