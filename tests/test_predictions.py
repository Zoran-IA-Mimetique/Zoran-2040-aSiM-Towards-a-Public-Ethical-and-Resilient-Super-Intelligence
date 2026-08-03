"""Prédictions falsifiables P1-P5 (§6) et invariants obligatoires (§5).

Chaque test porte le nom de la prédiction qu'il exerce. Un échec ici n'est pas
un bug d'implémentation : c'est un falsificateur au sens du §7, et il doit
remonter à la spécification avant d'être « corrigé ».
"""

import math
import unittest

import ztemps
from ztemps import (
    CoherenceProfile,
    Scale,
    Transformation,
    Weights,
    check_frame_conservation,
    check_no_time_inputs,
    check_representation_invariance,
    tau_z,
)

WEIGHTS = Weights({s: 1.0 for s in Scale}, calibration_sample_ids={"calib"})


def run(profiles, tau_star=1.0):
    events = [
        Transformation(sample_id=f"eval-{i}", profile=p) for i, p in enumerate(profiles)
    ]
    return tau_z(events, WEIGHTS, tau_star=tau_star)


class P1Fermeture(unittest.TestCase):
    """« À transformation nulle, D(C)=0. »"""

    def test_closed_system_produces_no_proper_time(self):
        result = run([CoherenceProfile.uniform(1.0)] * 10)
        self.assertTrue(all(p == 1.0 for p in CoherenceProfile.uniform(1.0).values.values()))
        self.assertEqual(result.value, 0.0)
        self.assertEqual(result.n_integrated, 10)

    def test_closure_is_detected_on_the_profile(self):
        self.assertTrue(CoherenceProfile.uniform(1.0).is_closed)
        self.assertFalse(CoherenceProfile.uniform(0.999).is_closed)


class P2Dissolution(unittest.TestCase):
    """« Lorsque C tombe à zéro, l'objet cesse d'avoir un temps propre défini. »"""

    def test_integration_stops_and_marks_the_object_undefined(self):
        profiles = [
            CoherenceProfile.uniform(0.5),
            CoherenceProfile.uniform(0.5),
            CoherenceProfile(
                {
                    Scale.LOCAL: 0.5,
                    Scale.OBJET: 0.0,
                    Scale.CADRE: 0.5,
                    Scale.GLOBAL: 0.5,
                }
            ),
            CoherenceProfile.uniform(0.5),
        ]
        result = run(profiles)
        self.assertFalse(result.is_defined)
        self.assertEqual(result.dissolved_at, 3)
        self.assertEqual(result.dissolution_scales, (Scale.OBJET,))

    def test_time_accumulated_before_dissolution_survives(self):
        """Le temps déjà accumulé reste valide : seule la suite est indéfinie."""
        before = run([CoherenceProfile.uniform(0.5)] * 2).value
        after = run(
            [CoherenceProfile.uniform(0.5)] * 2 + [CoherenceProfile.uniform(0.0)]
        )
        self.assertAlmostEqual(after.value, before)

    def test_dissolution_is_not_zero_time(self):
        """§2 : « C = 0 ne signifie pas temps égal à zéro. »"""
        result = run([CoherenceProfile.uniform(0.5)] * 5 + [CoherenceProfile.uniform(0.0)])
        self.assertGreater(result.value, 0.0)
        self.assertFalse(result.is_defined)


class P3Accumulation(unittest.TestCase):
    """« À nombre de transformations égal, une perte plus élevée donne un τ_Z plus grand. »"""

    def test_strictly_monotone_in_coherence_loss(self):
        n = 12
        previous = -math.inf
        for coherence in (1.0, 0.9, 0.75, 0.5, 0.25, 0.05):
            value = run([CoherenceProfile.uniform(coherence)] * n).value
            self.assertGreater(value, previous, f"non monotone à C={coherence}")
            previous = value

    def test_equal_event_count_is_what_is_compared(self):
        low = run([CoherenceProfile.uniform(0.9)] * 5)
        high = run([CoherenceProfile.uniform(0.4)] * 5)
        self.assertEqual(low.n_integrated, high.n_integrated)
        self.assertGreater(high.value, low.value)


class P4Memoire(unittest.TestCase):
    """« La forme exacte de cette décroissance reste à tester. »

    Garde-fou délibéré : ce test échoue si quelqu'un ajoute une loi de survie au
    paquet. P4 interdit explicitement d'imposer la forme par avance ; l'ajouter
    en douce transformerait une question ouverte en hypothèse cachée.
    """

    def test_no_survival_decay_law_is_shipped(self):
        forbidden = {"survival", "survie", "decay", "decroissance", "persistence"}
        exported = {name.lower() for name in ztemps.__all__}
        self.assertEqual(exported & forbidden, set())


class P5Correspondance(unittest.TestCase):
    """« τ_Z doit être monotone avec le temps propre relativiste. »"""

    def test_requires_physical_reference_data(self):
        raise unittest.SkipTest(
            "P5 exige une horloge physique de référence (§8, famille 1). "
            "Aucune donnée dans ce dépôt : la prédiction reste NON_MESURÉ (§10)."
        )


class Invariants(unittest.TestCase):
    """§5 — invariants obligatoires 1 à 5."""

    def test_i3_rejects_time_like_observables(self):
        self.assertFalse(check_no_time_inputs({"timestamp": 0, "x": 1}))
        self.assertFalse(check_no_time_inputs({"duree_ms": 3}))
        self.assertTrue(check_no_time_inputs({"r_ij": 1.0, "angle": 0.2}))

    def test_i1_i2_i4_invariance_under_declared_symmetries(self):
        def proxy(obs):
            # Proxy jouet : ne lit que la distance relative, donc invariant par
            # translation. Il ne prétend pas être un proxy physique de C.
            spread = abs(obs["x1"] - obs["x0"])
            return CoherenceProfile.uniform(1.0 / (1.0 + spread))

        translations = [
            lambda o, d=d: {"x0": o["x0"] + d, "x1": o["x1"] + d}
            for d in (1.0, -3.5, 100.0)
        ]
        report = check_representation_invariance(
            proxy, {"x0": 0.0, "x1": 2.0}, translations
        )
        self.assertTrue(report, report.detail)

    def test_i1_i2_i4_detects_a_representation_dependent_proxy(self):
        def bad_proxy(obs):
            # Lit une coordonnée absolue : dépend du choix de repère, donc
            # falsificateur au sens du §7, tiret 1.
            return CoherenceProfile.uniform(1.0 / (1.0 + abs(obs["x0"])))

        report = check_representation_invariance(
            bad_proxy, {"x0": 0.0, "x1": 2.0}, [lambda o: {**o, "x0": o["x0"] + 5.0}]
        )
        self.assertFalse(report)
        self.assertGreater(report.worst_deviation, 0.0)

    def test_i5_frame_conservation(self):
        self.assertTrue(check_frame_conservation({s: 1.0 for s in Scale}))
        self.assertFalse(check_frame_conservation({Scale.LOCAL: 1.0}))
        self.assertFalse(
            check_frame_conservation({**{s: 1.0 for s in Scale}, Scale.LOCAL: 0.0})
        )


if __name__ == "__main__":
    unittest.main()
