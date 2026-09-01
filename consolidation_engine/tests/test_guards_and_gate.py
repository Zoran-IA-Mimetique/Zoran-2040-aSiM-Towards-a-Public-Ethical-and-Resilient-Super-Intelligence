import io
import os
import unittest

from zce import cli, guards, llm_gate, util

BASE = os.path.join(os.path.dirname(__file__), "..")
SCHEMA = util.load_json(os.path.join(BASE, "schemas", "llm_candidate.schema.json"))
MANIFEST = util.load_json(os.path.join(BASE, "sample", "inputs", "manifest.json"))
LEDGER = util.load_json(os.path.join(BASE, "sample", "inputs", "gap_ledger.json"))
NOW = "2026-08-28T12:00:00Z"


def load_candidate(name):
    return util.load_json(os.path.join(BASE, "sample", "candidates", name))


def gate_with_context(candidate):
    return llm_gate.gate(candidate, SCHEMA, NOW, manifest=MANIFEST, ledger=LEDGER)


class TestGuards(unittest.TestCase):
    def test_protected_components(self):
        for path in ["components/zmos_v2_transactional/writer.py",
                     "components/k3_frame_algebra_v1_1/algebra.py",
                     "components/amygdala_k3_v1_exact/veto.py",
                     "zenmos/core.py", "engine_4_0/main.py"]:
            self.assertTrue(guards.is_protected(path), path)
        self.assertFalse(guards.is_protected("components/zoran_chat_runtime_v1/runtime.py"))
        self.assertFalse(guards.is_protected("lib/zoran-core-runtime.ts"))

    def test_historical_engines_00_to_11(self):
        for n in ["00", "05", "11"]:
            self.assertTrue(guards.is_historical_engine("moteurs/moteur_%s/main.py" % n))
        self.assertFalse(guards.is_historical_engine("moteurs/moteur_12/main.py"))

    def test_apply_always_refused(self):
        with self.assertRaises(guards.DryRunViolation):
            guards.refuse_apply()

    def test_cli_apply_exit_code_3(self):
        import contextlib
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            code = cli.main(["apply", "anything"])
        self.assertEqual(code, 3)
        self.assertIn("GUARD_DRY_RUN_ONLY", stderr.getvalue())


class TestLlmGate(unittest.TestCase):
    def test_good_candidate_accepted_for_sandbox_only(self):
        decision = gate_with_context(load_candidate("llm_candidate_ok.json"))
        self.assertEqual(decision["decision"], llm_gate.DECISION_ACCEPT)
        self.assertFalse(decision["executed"])
        self.assertFalse(decision["applied"])

    def test_bad_candidate_rejected_with_named_causes(self):
        decision = gate_with_context(load_candidate("llm_candidate_bad.json"))
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        causes = " | ".join(decision["causes"])
        self.assertIn("GUARD_PROTECTED_COMPONENTS", causes)
        self.assertIn("tests_declared", causes)
        self.assertIn("falsifier", causes)
        self.assertIn("rollback_ref", causes)

    def test_forbidden_execution_key_rejected(self):
        candidate = load_candidate("llm_candidate_ok.json")
        candidate["command"] = "echo hi"
        decision = gate_with_context(candidate)
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        self.assertTrue(any("GUARD_NO_LLM_EXECUTION" in c for c in decision["causes"]))

    def test_claims_applied_forces_rollback(self):
        candidate = load_candidate("llm_candidate_ok.json")
        candidate["claims_applied"] = True
        decision = gate_with_context(candidate)
        self.assertEqual(decision["decision"], llm_gate.DECISION_ROLLBACK)

    def test_oversized_diff_rejected(self):
        candidate = load_candidate("llm_candidate_ok.json")
        candidate["diff_unified"] = "\n".join("+x" for _ in range(200))
        decision = gate_with_context(candidate)
        self.assertEqual(decision["decision"], llm_gate.DECISION_REJECT)
        self.assertTrue(any("GUARD_MODIFICATION_BUDGET" in c for c in decision["causes"]))

    def test_gate_module_imports_no_execution_machinery(self):
        import ast
        source_path = os.path.join(BASE, "zce", "llm_gate.py")
        with open(source_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())
        forbidden_modules = {"subprocess", "os", "sys", "importlib"}
        forbidden_calls = {"eval", "exec", "__import__", "compile", "open"}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    self.assertNotIn(alias.name.split(".")[0], forbidden_modules)
            if isinstance(node, ast.ImportFrom):
                self.assertNotIn((node.module or "").split(".")[0], forbidden_modules)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                self.assertNotIn(node.func.id, forbidden_calls)


if __name__ == "__main__":
    unittest.main()
