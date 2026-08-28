"""La formule S reproduit exactement les cellules gelées de
ZORAN_LEGACY_CODE_RECOVERY_MEASURE_V1.json (étalon Max Harness v2)."""

import unittest

from zce import coherence


class TestFormula(unittest.TestCase):
    def test_reproduces_frozen_measure_cells(self):
        # (mission a/b, relations a/b) -> S attendu, tiré du fichier de mesure V1.
        cases = [
            ((8, 12, 8, 12), 44.444444444444436),
            ((8, 10, 8, 10), 64.0),
            ((6, 10, 6, 10), 36.0),
            ((7, 10, 7, 10), 49.0),
            ((10, 10, 10, 10), 100.0),
            ((12, 12, 12, 12), 100.0),
        ]
        for counts, expected in cases:
            self.assertAlmostEqual(coherence.s_score(*counts), expected, places=9)

    def test_zero_applicable_is_empty_report_not_veto(self):
        self.assertEqual(coherence.s_score(0, 0, 0, 0), 100.0)

    def test_t_sigma_dampen(self):
        self.assertAlmostEqual(coherence.s_score(10, 10, 10, 10, t=1.0), 50.0)


class TestConservativeVeto(unittest.TestCase):
    def test_missing_datum_names_itself(self):
        cell = coherence.frame_cell(
            "local", {"mission_aligned": None, "mission_applicable": 10,
                      "relations_coherent": 5, "relations_applicable": 10},
            coherence.CLASS_OBSERVED, "test")
        self.assertEqual(cell["s"], 0.0)
        self.assertEqual(cell["interval"], [0.0, 100.0])
        self.assertEqual(cell["calibration_class"], coherence.CLASS_CONSERVATIVE)
        self.assertIn("mission_aligned", cell["cause"])


class TestAggregation(unittest.TestCase):
    def _cell(self, frame, s10):
        return coherence.frame_cell(
            frame, {"mission_aligned": s10, "mission_applicable": 10,
                    "relations_coherent": 10, "relations_applicable": 10},
            coherence.CLASS_OBSERVED, "test")

    def test_veto_min_no_average(self):
        cells = [self._cell(f, 10) for f in coherence.FRAMES[:-1]]
        cells.append(self._cell("global", 3))  # 30.0
        agg = coherence.aggregate(cells)
        self.assertEqual(agg["overall_point"], 30.0)
        self.assertEqual(agg["aggregation"], "VETO_MIN_NO_AVERAGE_COMPENSATION")

    def test_missing_frame_becomes_conservative_veto(self):
        agg = coherence.aggregate([self._cell("local", 10)])
        self.assertEqual(agg["overall_point"], 0.0)
        self.assertEqual(agg["computed_cells"], 6)
        self.assertEqual(agg["frames"]["peer"]["calibration_class"],
                         coherence.CLASS_CONSERVATIVE)

    def test_kinematics(self):
        before = [self._cell(f, 5) for f in coherence.FRAMES]
        after = [self._cell(f, 8) for f in coherence.FRAMES]
        measure = coherence.measure(before, after)
        self.assertAlmostEqual(measure["overall_delta_s"], 30.0)
        self.assertFalse(measure["runtime_promotion"])


if __name__ == "__main__":
    unittest.main()
