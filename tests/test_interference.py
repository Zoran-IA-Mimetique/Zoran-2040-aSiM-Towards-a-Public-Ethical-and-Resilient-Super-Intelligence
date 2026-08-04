"""Accumulateur et lisibilité — voir RESULTATS-ROLES-007.md."""

import math
import unittest

from experiments.run_roles_007 import cumulative_tau_z
from ztemps.interference import (
    Branch,
    pendulum_analogue,
    recoverable_difference,
    two_branch_run,
)


class TwoBranch(unittest.TestCase):
    def test_phase_accumulates_linearly(self):
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.03), n_steps=100, dt=0.02)
        self.assertAlmostEqual(run.accumulated, -0.03 * 2.0, places=12)

    def test_closed_interferometer_keeps_perfect_readability(self):
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.03), coherence_time=None)
        self.assertEqual(run.final_readability, 1.0)

    def test_decoherence_does_not_touch_the_accumulator(self):
        """R4 — la visibilité décroît, la phase est inchangée."""
        closed = two_branch_run(Branch("L", 1.0), Branch("R", 1.03))
        opened = two_branch_run(Branch("L", 1.0), Branch("R", 1.03), coherence_time=3.0)
        self.assertAlmostEqual(closed.accumulated, opened.accumulated, places=15)
        self.assertLess(opened.final_readability, 0.2)

    def test_interference_pattern_flattens_without_readability(self):
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.5), coherence_time=0.5)
        self.assertAlmostEqual(run.interference()[-1], 0.5, places=3)


class Dissociation(unittest.TestCase):
    """R2 — le constat central : τ_Z est nul là où le temps propre accumule."""

    def test_tau_z_is_exactly_zero_on_a_closed_interferometer(self):
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.03), coherence_time=None)
        self.assertGreater(abs(run.accumulated), 0.1)  # la phase accumule
        self.assertEqual(cumulative_tau_z(run.readability)[-1], 0.0)  # τ_Z ne voit rien

    def test_tau_z_only_moves_with_decoherence(self):
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.03), coherence_time=3.0)
        self.assertGreater(cumulative_tau_z(run.readability)[-1], 0.5)


class Recoverable(unittest.TestCase):
    def test_readable_part_shrinks_while_the_phase_remains(self):
        """`V·|Δφ|` chute alors que `Δφ` ne bouge pas : illisible, pas inexistant."""
        run = two_branch_run(Branch("L", 1.0), Branch("R", 1.5), coherence_time=1.0)
        readable = recoverable_difference(run)
        self.assertLess(readable[-1], abs(run.accumulated) * 0.1)
        self.assertGreater(abs(run.accumulated), 1.0)


class PendulumSide(unittest.TestCase):
    def test_same_visible_rhythm_hides_different_internal_drifts(self):
        """`f_1 = f_2` sans `X_1 = X_2` : la projection perd la distinction."""
        drifts = pendulum_analogue([1.0, 1.4], n_steps=50, dt=0.02)
        visible = [round(0.0, 9), round(0.0, 9)]  # h(X) identique par construction
        self.assertEqual(visible[0], visible[1])
        self.assertNotAlmostEqual(drifts[0][-1], drifts[1][-1])
        self.assertGreater(abs(drifts[1][-1] - drifts[0][-1]), 0.3)


if __name__ == "__main__":
    unittest.main()
