"""Dépendance de `τ_*` au taux — voir RESULTATS-TAU-004.md."""

import math
import unittest

from experiments.run_tau_004 import (
    DT,
    analytic_tau_star,
    cumulative_sums,
    fit_tau_star,
    median_relative_error,
)


class TauStarScaling(unittest.TestCase):
    def test_h1_fitted_tau_star_matches_the_analytic_prediction(self):
        for gamma in (0.05, 0.35, 1.6):
            with self.subTest(gamma=gamma):
                sums, reference = cumulative_sums(gamma)
                fitted = fit_tau_star(sums, reference)
                self.assertAlmostEqual(
                    fitted / analytic_tau_star(gamma), 1.0, places=9
                )

    def test_h3_product_gamma_tau_star_is_constant_in_the_small_regime(self):
        products = []
        for gamma in (0.05, 0.1, 0.2):
            sums, reference = cumulative_sums(gamma)
            products.append(gamma * fit_tau_star(sums, reference))
        spread = (max(products) - min(products)) / (sum(products) / len(products))
        self.assertLess(spread, 0.10)

    def test_h2_tau_star_does_not_transfer_across_rates(self):
        """Un succès de ce test est une mauvaise nouvelle pour la loi, pas pour le code."""
        sums_ref, reference_ref = cumulative_sums(0.35)
        tau_reference = fit_tau_star(sums_ref, reference_ref)
        sums, reference = cumulative_sums(1.6)
        self.assertGreater(
            median_relative_error(sums, reference, tau_reference), 0.15
        )

    def test_the_analytic_form_reduces_to_one_over_gamma(self):
        """τ_* = Δt/(1-e^(-γΔt)) → 1/γ quand γΔt << 1."""
        gamma = 1e-4
        self.assertAlmostEqual(analytic_tau_star(gamma) * gamma, 1.0, places=4)
        self.assertGreater(analytic_tau_star(gamma), DT)
        self.assertLess(abs(math.exp(-gamma * DT) - 1.0), 1e-4)


if __name__ == "__main__":
    unittest.main()
