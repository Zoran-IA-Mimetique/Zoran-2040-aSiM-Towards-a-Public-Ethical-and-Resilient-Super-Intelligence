"""Corrélation de rang exacte — voir RESULTATS-JUMEAUX-005.md."""

import unittest

from ztemps.ordinal import (
    detectability,
    exact_p_value,
    minimum_n,
    spearman_rho,
)


class Rho(unittest.TestCase):
    def test_perfect_agreement(self):
        self.assertAlmostEqual(spearman_rho([1, 2, 3, 4], [10, 20, 30, 40]), 1.0)

    def test_perfect_inversion(self):
        self.assertAlmostEqual(spearman_rho([1, 2, 3, 4], [40, 30, 20, 10]), -1.0)

    def test_ties_are_refused(self):
        """Les ex æquo cassent la loi exacte : ils sont refusés, pas contournés."""
        with self.assertRaises(ValueError) as ctx:
            spearman_rho([1.0, 1.0, 2.0], [1.0, 2.0, 3.0])
        self.assertIn("ex æquo", str(ctx.exception))

    def test_below_three_observations_is_undefined(self):
        with self.assertRaises(ValueError):
            spearman_rho([1, 2], [1, 2])


class ExactPValue(unittest.TestCase):
    def test_perfect_order_at_n4_is_one_in_twentyfour(self):
        self.assertAlmostEqual(exact_p_value([1, 2, 3, 4], [1, 2, 3, 4]), 1 / 24)

    def test_perfect_order_at_n3_cannot_reach_five_percent(self):
        """Le fait qui rend l'essai 005 indécidable."""
        self.assertAlmostEqual(exact_p_value([1, 2, 3], [1, 2, 3]), 1 / 6)
        self.assertGreater(1 / 6, 0.05)


class DetectabilityLimits(unittest.TestCase):
    def test_n3_can_never_conclude(self):
        limits = detectability(3)
        self.assertFalse(limits.can_reach(0.05))
        self.assertAlmostEqual(limits.p_perfect_order, 1 / 6)

    def test_n4_concludes_only_on_a_perfect_order(self):
        limits = detectability(4)
        self.assertTrue(limits.can_reach(0.05))
        self.assertFalse(limits.is_robust_at(0.05))

    def test_n5_survives_one_inversion(self):
        self.assertTrue(detectability(5).is_robust_at(0.05))

    def test_minimum_sizes(self):
        self.assertEqual(minimum_n(0.05), 4)
        self.assertEqual(minimum_n(0.05, robust=True), 5)


if __name__ == "__main__":
    unittest.main()
