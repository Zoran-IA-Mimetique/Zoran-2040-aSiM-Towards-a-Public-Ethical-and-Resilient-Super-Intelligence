"""v1.0.1 — un test négatif reproductible par correction obligatoire.

C1  MISSING_GUARD Amygdale/K3 → cible bloquée sans reçu vérifié.
C2  verdict dérivé du cadre minimal — un FAIL ou une borne basse à 0
    interdit PASS_DRY_RUN.
C3  jauge canonique [0,10] — dénominateur nul ou donnée absente → S=0.
C4  porte LLM — chemins réels du diff confrontés à la cible déclarée.
C5  --out dans --root ou dans les répertoires d'entrées → refus fail-closed.
C6  exhaustivité/unicité du manifeste — fichier réel absent, doublon,
    SHA mal formé → run bloqué.
C7  journal chaîné — falsification détectée.
"""

import copy
import json
import os
import shutil
import tempfile
import unittest

from zce import coherence, engine, llm_gate, patch, receipts, util

BASE = os.path.join(os.path.dirname(__file__), "..")
SAMPLE = os.path.join(BASE, "sample")
SCHEMA = util.load_json(os.path.join(BASE, "schemas", "llm_candidate.schema.json"))
MANIFEST = util.load_json(os.path.join(SAMPLE, "inputs", "manifest.json"))
LEDGER = util.load_json(os.path.join(SAMPLE, "inputs", "gap_ledger.json"))
NOW = "2026-08-28T12:00:00Z"

TARGET = "components/zoran_chat_runtime_v1/runtime.py"
RECEIPT_PATH = "docs/notes.md"
RECEIPT_SHA = "a" * 64


def _controls(receipt_sha=RECEIPT_SHA):
    return {
        TARGET: {"ok": True, "actual_sha256": "b" * 64},
        RECEIPT_PATH: {"ok": True, "actual_sha256": receipt_sha},
    }


def _decision():
    return {"path": TARGET, "label": "CORRECT", "rule_id": "R4_GAP_CORRECT",
            "cause": "test", "gap_id": "GAP-X"}


def _gaps(receipt=None):
    gap = {"gap_id": "GAP-MG", "kind": "MISSING_GUARD", "target": TARGET,
           "cause": "veto Amygdale/K3 non prouvé"}
    if receipt is not None:
        gap["guard_receipt"] = receipt
    return [{"gap_id": "GAP-X", "kind": "CORRECT", "target": TARGET,
             "cause": "test", "allowed_paths": ["components/zoran_chat_runtime_v1/"]},
            gap]


class TestC1AmygdalaVeto(unittest.TestCase):
    def test_missing_guard_without_receipt_blocks_patch(self):
        decisions = [_decision()]
        controls = _controls()
        rollback = patch.build_rollback_plan(decisions, controls)
        patches, blocked, _ = patch.build_patch_plan(decisions, _gaps(), rollback, controls)
        self.assertEqual(patches, [])
        self.assertEqual(len(blocked), 1)
        self.assertIn("GUARD_AMYGDALA_K3_RECEIPT", blocked[0]["blocked_by"])
        self.assertIn("GAP-MG", blocked[0]["cause"])

    def test_unverified_receipt_still_blocks(self):
        # Reçu présent mais SHA ne correspondant pas à l'objet contrôlé.
        gaps = _gaps({"path": RECEIPT_PATH, "content_sha256": "c" * 64})
        decisions = [_decision()]
        controls = _controls()
        rollback = patch.build_rollback_plan(decisions, controls)
        patches, blocked, _ = patch.build_patch_plan(decisions, gaps, rollback, controls)
        self.assertEqual(patches, [])
        self.assertIn("GUARD_AMYGDALA_K3_RECEIPT", blocked[0]["blocked_by"])

    def test_verified_receipt_unblocks(self):
        gaps = _gaps({"path": RECEIPT_PATH, "content_sha256": RECEIPT_SHA})
        decisions = [_decision()]
        controls = _controls()
        rollback = patch.build_rollback_plan(decisions, controls)
        patches, blocked, _ = patch.build_patch_plan(decisions, gaps, rollback, controls)
        self.assertEqual(blocked, [])
        self.assertEqual(len(patches), 1)


class TestC2DerivedVerdict(unittest.TestCase):
    def _cells(self, aligned10):
        return [coherence.frame_cell(
            f, {"mission_aligned": aligned10, "mission_applicable": 10,
                "relations_coherent": 10, "relations_applicable": 10},
            coherence.CLASS_OBSERVED, "test") for f in coherence.FRAMES]

    def test_fail_frame_forbids_pass(self):
        measure = coherence.measure(self._cells(9), self._cells(10))
        verdict, basis = coherence.verdict(measure)
        self.assertEqual(verdict, "FAIL")
        self.assertEqual(len(basis["failing_frames"]), 6)
        counters = {"files_total": 0, "files_ok": 0, "decisions_total": 0,
                    "labels": {}, "rollback_seq": 1, "patch_seq": 2}
        body = receipts.build_certificate(
            NOW, {}, {}, counters, {}, 0.0, 0.0, [], [], verdict, basis)
        self.assertEqual(body["verdict"], "FAIL_DRY_RUN")

    def test_lower_bound_zero_forbids_pass(self):
        cells = self._cells(10)
        cells[0] = coherence.conservative_cell("local", "donnée manquante test")
        measure = coherence.measure(cells, self._cells(10))
        verdict, _ = coherence.verdict(measure)
        self.assertEqual(verdict, "FAIL")

    def test_all_pass_grants_pass(self):
        measure = coherence.measure(self._cells(10), self._cells(10))
        verdict, _ = coherence.verdict(measure)
        self.assertEqual(verdict, "PASS")


class TestC3CanonicalGauge(unittest.TestCase):
    def test_zero_denominator_is_veto_cell(self):
        cell = coherence.frame_cell(
            "peer", {"mission_aligned": 0, "mission_applicable": 0,
                     "relations_coherent": 1, "relations_applicable": 1},
            coherence.CLASS_OBSERVED, "test")
        self.assertEqual(cell["s"], 0.0)
        self.assertEqual(cell["interval"], [0.0, 100.0])
        self.assertEqual(cell["calibration_class"], coherence.CLASS_CONSERVATIVE)
        self.assertIn("mission_applicable", cell["cause"])

    def test_t_sigma_out_of_range_is_veto(self):
        counts = {"mission_aligned": 10, "mission_applicable": 10,
                  "relations_coherent": 10, "relations_applicable": 10}
        for kwargs, name in (({"t": 10.5}, "T"), ({"sigma": -0.1}, "sigma")):
            cell = coherence.frame_cell("local", counts, coherence.CLASS_OBSERVED,
                                        "test", **kwargs)
            self.assertEqual(cell["s"], 0.0)
            self.assertIn(name, cell["cause"])

    def test_frozen_cells_still_exact_with_beta_10(self):
        self.assertAlmostEqual(coherence.s_score(8, 12, 8, 12), 44.444444444444436)
        self.assertAlmostEqual(coherence.s_score(6, 10, 6, 10), 36.0)


class TestC4DiffPathAnalysis(unittest.TestCase):
    def _ok(self):
        return util.load_json(os.path.join(SAMPLE, "candidates", "llm_candidate_ok.json"))

    def test_diff_hitting_zmos_under_innocent_target_rejected(self):
        candidate = self._ok()
        candidate["diff_unified"] = (
            "--- a/components/zmos_v2_transactional/writer.py\n"
            "+++ b/components/zmos_v2_transactional/writer.py\n"
            "@@ -1 +1 @@\n-x\n+y")
        decision = llm_gate.gate(candidate, SCHEMA, NOW,
                                 manifest=MANIFEST, ledger=LEDGER)
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        causes = " | ".join(decision["causes"])
        self.assertIn("DIFF_TARGET_MISMATCH", causes)
        self.assertIn("GUARD_PROTECTED_COMPONENTS", causes)
        self.assertIn("zmos_v2_transactional", causes)

    def test_missing_context_is_fail_closed(self):
        decision = llm_gate.gate(self._ok(), SCHEMA, NOW)
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        self.assertTrue(any(c.startswith("CONTEXT:") for c in decision["causes"]))

    def test_gap_target_mismatch_rejected(self):
        candidate = self._ok()
        candidate["gap_id"] = "GAP-003"  # cible runtime.py, pas l'adaptateur
        decision = llm_gate.gate(candidate, SCHEMA, NOW,
                                 manifest=MANIFEST, ledger=LEDGER)
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        self.assertTrue(any("≠ target_path" in c for c in decision["causes"]))


class TestC5OutputIsolation(unittest.TestCase):
    def _run(self, out_dir):
        return engine.run_dry_run(
            root=os.path.join(SAMPLE, "frozen_tree"),
            manifest_path=os.path.join(SAMPLE, "inputs", "manifest.json"),
            graph_path=os.path.join(SAMPLE, "inputs", "relation_graph.json"),
            ledger_path=os.path.join(SAMPLE, "inputs", "gap_ledger.json"),
            out_dir=out_dir, now=NOW, schemas_dir=os.path.join(BASE, "schemas"))

    def test_out_inside_root_refused(self):
        out = os.path.join(SAMPLE, "frozen_tree", "zce_out")
        with self.assertRaises(engine.InputRejected) as ctx:
            self._run(out)
        self.assertIn("GUARD_OUTPUT_ISOLATION", str(ctx.exception))
        self.assertFalse(os.path.exists(out))

    def test_out_inside_inputs_dir_refused(self):
        out = os.path.join(SAMPLE, "inputs", "zce_out")
        with self.assertRaises(engine.InputRejected) as ctx:
            self._run(out)
        self.assertIn("GUARD_OUTPUT_ISOLATION", str(ctx.exception))
        self.assertFalse(os.path.exists(out))

    def test_preexisting_output_is_refused_and_stale_file_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="zce_stale_out_") as tmp:
            out = os.path.join(tmp, "run")
            os.mkdir(out)
            stale = os.path.join(out, "STALE_OUTPUT.json")
            with open(stale, "w", encoding="utf-8") as stream:
                stream.write("stale\n")
            with self.assertRaises(engine.InputRejected) as ctx:
                self._run(out)
            self.assertIn("GUARD_OUTPUT_ISOLATION", str(ctx.exception))
            with open(stale, "r", encoding="utf-8") as stream:
                self.assertEqual(stream.read(), "stale\n")


class TestC6ManifestIntegrity(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="zce_integrity_")
        self.root = os.path.join(self.tmp, "tree")
        shutil.copytree(os.path.join(SAMPLE, "frozen_tree"), self.root)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _check(self, manifest):
        graph = util.load_json(os.path.join(SAMPLE, "inputs", "relation_graph.json"))
        ledger = util.load_json(os.path.join(SAMPLE, "inputs", "gap_ledger.json"))
        return engine.check_integrity(self.root, manifest, graph, ledger)

    def test_undeclared_real_file_blocks_run(self):
        with open(os.path.join(self.root, "intrus.py"), "w", encoding="utf-8") as f:
            f.write("# fichier réel non déclaré\n")
        with self.assertRaises(engine.InputRejected) as ctx:
            self._check(copy.deepcopy(MANIFEST))
        self.assertIn("fichier réel absent du manifeste: intrus.py", str(ctx.exception))

    def test_duplicate_path_blocks_run(self):
        manifest = copy.deepcopy(MANIFEST)
        manifest["objects"].append(dict(manifest["objects"][0]))
        with self.assertRaises(engine.InputRejected) as ctx:
            self._check(manifest)
        self.assertIn("chemin dupliqué", str(ctx.exception))

    def test_malformed_sha_blocks_run(self):
        manifest = copy.deepcopy(MANIFEST)
        manifest["objects"][0]["content_sha256"] = "ZZZ-pas-un-sha"
        with self.assertRaises(engine.InputRejected) as ctx:
            self._check(manifest)
        self.assertIn("SHA-256 mal formé", str(ctx.exception))

    def test_duplicate_relation_and_gap_ids_block_run(self):
        graph = util.load_json(os.path.join(SAMPLE, "inputs", "relation_graph.json"))
        graph["relations"].append(dict(graph["relations"][0]))
        ledger = util.load_json(os.path.join(SAMPLE, "inputs", "gap_ledger.json"))
        ledger["gaps"].append(dict(ledger["gaps"][0]))
        with self.assertRaises(engine.InputRejected) as ctx:
            engine.check_integrity(self.root, copy.deepcopy(MANIFEST), graph, ledger)
        message = str(ctx.exception)
        self.assertIn("relation_id dupliqué", message)
        self.assertIn("gap_id dupliqué", message)

    def test_intact_sample_passes(self):
        receipt = self._check(copy.deepcopy(MANIFEST))
        self.assertEqual(receipt["integrity"], "PASS")


class TestC7JournalChain(unittest.TestCase):
    def _journal(self):
        journal = receipts.Journal(NOW)
        journal.log("A", {"x": 1})
        journal.log("B", {"x": 2})
        journal.log("C", {"x": 3})
        return journal

    def test_intact_chain_verifies(self):
        journal = self._journal()
        self.assertTrue(receipts.verify_chain(journal.entries)["ok"])
        self.assertEqual(journal.entries[0]["previous_event_sha256"],
                         receipts.GENESIS_SHA256)

    def test_tampered_event_breaks_chain(self):
        journal = self._journal()
        journal.entries[1]["event"] = "B_FALSIFIÉ"
        result = receipts.verify_chain(journal.entries)
        self.assertFalse(result["ok"])
        self.assertEqual(result["broken_seq"], 2)

    def test_tampered_payload_sha_breaks_chain(self):
        journal = self._journal()
        journal.entries[2]["payload_sha256"] = "f" * 64
        self.assertFalse(receipts.verify_chain(journal.entries)["ok"])

    def test_reference_journal_file_verifies_and_detects_falsification(self):
        with tempfile.TemporaryDirectory(prefix="zce_chain_") as tmp:
            out = os.path.join(tmp, "run")
            engine.run_dry_run(
                root=os.path.join(SAMPLE, "frozen_tree"),
                manifest_path=os.path.join(SAMPLE, "inputs", "manifest.json"),
                graph_path=os.path.join(SAMPLE, "inputs", "relation_graph.json"),
                ledger_path=os.path.join(SAMPLE, "inputs", "gap_ledger.json"),
                out_dir=out, now=NOW, schemas_dir=os.path.join(BASE, "schemas"))
            path = os.path.join(out, "ZCE_JOURNAL_V1.jsonl")
            with open(path, "r", encoding="utf-8") as f:
                entries = [json.loads(line) for line in f if line.strip()]
            self.assertTrue(receipts.verify_chain(entries)["ok"])
            entries[0]["event"] = "FALSIFIÉ"
            self.assertFalse(receipts.verify_chain(entries)["ok"])


if __name__ == "__main__":
    unittest.main()
