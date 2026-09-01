"""Tests du moteur BTP v2 (btp_engine.py), focalisés sur les 3 corrections."""

import pytest

from btp_engine import (
    Dependency,
    Engine,
    Frame,
    Scenario,
    create_btp_engine,
    define_scenarios,
    stress_test,
    zoran_decision_bridge,
)


# -- Correction 2 : propagation cascade + chemins multiples + anti-cycle ----
def test_cascade_reaches_grandchild():
    # A -> B -> C : modifier A doit toucher C (cascade complète).
    frames = {"A": Frame(0.5), "B": Frame(0.5), "C": Frame(0.5)}
    deps = [Dependency("A", "B", 0.5), Dependency("B", "C", 0.5)]
    eng = Engine(frames, deps)
    eng.apply_delta("A", 0.4)
    assert frames["B"].value == pytest.approx(0.7)   # 0.5 + 0.5*0.4
    assert frames["C"].value == pytest.approx(0.6)   # 0.5 + 0.5*0.2


def test_diamond_paths_are_summed():
    # A->B->D et A->C->D : D reçoit la somme des deux chemins.
    frames = {k: Frame(0.5) for k in "ABCD"}
    deps = [
        Dependency("A", "B", 0.4),
        Dependency("A", "C", 0.4),
        Dependency("B", "D", 0.5),
        Dependency("C", "D", 0.5),
    ]
    eng = Engine(frames, deps)
    eng.apply_delta("A", 0.5)
    # chaque chemin : 0.5 * 0.4 * 0.5 = 0.1 ; somme = 0.2
    assert frames["D"].value == pytest.approx(0.7)


def test_cycle_is_safe():
    frames = {"A": Frame(0.5), "B": Frame(0.5)}
    deps = [Dependency("A", "B", 0.5), Dependency("B", "A", 0.5)]
    eng = Engine(frames, deps)
    eng.apply_delta("A", 0.4)  # ne doit pas boucler à l'infini
    assert 0.0 <= frames["A"].value <= 1.0
    assert 0.0 <= frames["B"].value <= 1.0


# -- Correction 3 : run_scenario restaure valeurs ET activation -------------
def test_run_scenario_restores_full_state():
    eng = create_btp_engine()
    before = {k: (v.value, v.active) for k, v in eng.frames.items()}
    eng.run_scenario(define_scenarios()[0])
    after = {k: (v.value, v.active) for k, v in eng.frames.items()}
    assert before == after


# -- Correction 1 : gap normalisé (comparable aux scores) -------------------
def test_score_gap_is_normalized():
    eng = create_btp_engine()
    s = eng.compute_score()
    # gap = total - active, tous deux dans [0, 1] => gap dans [-1, 1].
    assert s["gap"] == pytest.approx(s["total_score"] - s["active_score"], abs=2e-3)
    assert -1.0 <= s["gap"] <= 1.0


# -- Contraintes ------------------------------------------------------------
def test_constraint_violation_detected():
    eng = create_btp_engine()
    eng.apply_delta("systeme.energie", 0.2)  # 0.5 -> 0.7 > max 0.4
    violations = eng.check_constraints()
    assert any(k == "systeme.energie" for k, *_ in violations)


# -- Suggestions ------------------------------------------------------------
def test_suggestions_prioritise_violations():
    eng = create_btp_engine()
    eng.apply_delta("systeme.energie", 0.2)
    sugg = eng.suggest_actions()
    assert sugg, "au moins une suggestion attendue"
    assert sugg[0]["priority"] == 1
    assert sugg[0]["type"] == "constraint_fix"


def test_simulate_suggestion_is_non_destructive():
    eng = create_btp_engine()
    eng.apply_delta("systeme.energie", 0.2)
    snapshot = {k: v.value for k, v in eng.frames.items()}
    eng.simulate_suggestion(eng.suggest_actions()[0])
    assert {k: v.value for k, v in eng.frames.items()} == snapshot


# -- Bridge ZORAN -----------------------------------------------------------
def test_zoran_bridge_activates_mentioned_frames():
    eng = create_btp_engine()
    res = zoran_decision_bridge("je veux optimiser énergie et coût", eng)
    assert set(res["active"]) == {"systeme.energie", "systeme.cout"}


def test_zoran_bridge_fallback():
    eng = create_btp_engine()
    res = zoran_decision_bridge("bonjour", eng)  # rien de mappé
    assert "systeme.energie" in res["active"]


# -- Mémoire multi-tour -----------------------------------------------------
def test_stress_test_records_sessions_and_compare():
    eng = create_btp_engine()
    stress_test(eng, verbose=False)
    labels = [s["label"] for s in eng.sessions]
    assert labels == ["initial", "optim energie", "reduction cout",
                      "carbone activé", "boost isolation", "corrige energie"]
    diff = eng.compare(0, len(eng.sessions) - 1)
    assert diff["mur.isolation"] == pytest.approx(0.3)
