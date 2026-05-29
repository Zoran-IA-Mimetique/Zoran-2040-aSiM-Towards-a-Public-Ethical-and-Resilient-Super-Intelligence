"""Tests des couches avancées : non-linéaire, apprentissage, bridge ZORAN, UI."""

import pytest

from btp_engine import Dependency, Engine, Frame, create_btp_engine
from webapp import simulate_payload
import zoran_bridge as zb


# -- Propagation non-linéaire (gamma) ---------------------------------------
def test_gamma_one_is_linear():
    frames = {"A": Frame(0.5), "B": Frame(0.5)}
    deps = [Dependency("A", "B", 0.5)]
    eng = Engine(frames, deps, gamma=1.0)
    eng.apply_delta("A", 0.4)
    assert frames["B"].value == pytest.approx(0.7)  # 0.5 + 0.5*0.4


def test_gamma_two_attenuates_small_deltas():
    frames = {"A": Frame(0.5), "B": Frame(0.5)}
    deps = [Dependency("A", "B", 0.5)]
    eng = Engine(frames, deps, gamma=2.0)
    eng.apply_delta("A", 0.4)
    # 0.5 + 0.5 * (0.4**2) = 0.5 + 0.08 = 0.58  (atténué vs linéaire 0.7)
    assert frames["B"].value == pytest.approx(0.58)


def test_gamma_preserves_sign():
    frames = {"A": Frame(0.5), "B": Frame(0.5)}
    deps = [Dependency("A", "B", 0.5)]
    eng = Engine(frames, deps, gamma=2.0)
    eng.apply_delta("A", -0.4)
    assert frames["B"].value == pytest.approx(0.42)  # 0.5 - 0.08


# -- Apprentissage des dépendances ------------------------------------------
def test_no_suggestion_without_enough_experiences():
    eng = create_btp_engine()
    eng.record_experience("p1")
    assert eng.suggest_dependency_updates() == []


def test_learning_detects_sign_conflict():
    # Dépendance avec poids NÉGATIF, mais source et cible varient ENSEMBLE.
    frames = {"x": Frame(0.5), "y": Frame(0.5)}
    deps = [Dependency("x", "y", -0.5)]
    eng = Engine(frames, deps)
    # Deux projets où x et y montent/descendent de concert (covariance > 0).
    eng.frames["x"].value, eng.frames["y"].value = 0.2, 0.2
    eng.record_experience("projet bas")
    eng.frames["x"].value, eng.frames["y"].value = 0.9, 0.9
    eng.record_experience("projet haut")
    sugg = eng.suggest_dependency_updates()
    assert sugg and sugg[0]["dependency"] == "x→y"
    # observé positif => poids suggéré supérieur au poids négatif actuel.
    assert sugg[0]["suggested_weight"] > -0.5


# -- Bridge ZORAN -----------------------------------------------------------
def test_build_engine_from_memory_overrides_frames():
    memory = [{"type": "constraint", "key": "global.carbone", "value": 0.3,
               "active": True, "weight": 1.8, "max": 0.65}]
    eng = zb.build_engine_from_zoran_memory(memory)
    assert eng.frames["global.carbone"].value == pytest.approx(0.3)
    assert eng.frames["global.carbone"].active is True
    assert eng.constraints["global.carbone"] == {"max": 0.65}


def test_extract_context_handles_accents():
    active = zb.extract_context("réduire l'énergie et le coût")
    assert "systeme.energie" in active
    assert "systeme.cout" in active


def test_run_decision_activates_only_intent():
    memory = []
    out = zb.run_decision("optimiser énergie", memory, delta=-0.2)
    assert out["activated"] == ["systeme.energie"]
    # seuls les cadres de l'intention sont actifs.
    assert all(f.active == (name == "systeme.energie")
               for name, f in out["_engine"].frames.items())


def test_feed_back_appends_trace():
    memory = []
    out = zb.run_decision("énergie", memory)
    zb.feed_back_to_zoran(out["_engine"], memory)
    assert memory[-1]["type"] == "decision_trace"
    assert "score" in memory[-1]


def test_run_decision_fallback_when_no_intent():
    out = zb.run_decision("bonjour", [], delta_frame="systeme.energie")
    assert out["activated"] == ["systeme.energie"]


# -- UI (logique pure, sans FastAPI) ----------------------------------------
def test_simulate_payload_shape():
    payload = {
        "frames": {"systeme.energie": {"value": 0.2, "active": True},
                   "global.carbone": {"value": 0.7, "active": True}},
        "deltas": {},
    }
    out = simulate_payload(payload)
    for key in ("active", "ignored", "score", "violations", "suggestions"):
        assert key in out
    assert "systeme.energie" in out["active"]


def test_simulate_payload_applies_deltas_and_constraints():
    payload = {"frames": {"systeme.energie": {"value": 0.5, "active": True}},
               "deltas": {"systeme.energie": 0.3}}  # 0.5 -> 0.8 > max 0.4
    out = simulate_payload(payload)
    assert any("systeme.energie" in m for m in out["violations"])
