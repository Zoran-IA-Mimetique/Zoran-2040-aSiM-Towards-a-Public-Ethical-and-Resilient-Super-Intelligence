"""Tests du moteur de décision « cadres + curseurs »."""

from __future__ import annotations

import pytest

from decision_engine import DecisionEngine, Dependency, Frame, System
from decision_engine.examples.moteur import build_system, demo
from decision_engine.propagation import propagate_delta, split_impacts
from decision_engine.scoring import frame_score


# --------------------------------------------------------------------------
# Modèles
# --------------------------------------------------------------------------
def test_frame_clamp_and_normalize():
    f = Frame(name="x", bounds=(0.0, 10.0), value=15.0)
    assert f.value == 10.0  # clampé à la borne haute
    assert f.normalized() == 1.0
    f.value = f.clamp(-5.0)
    assert f.value == 0.0


def test_frame_invalid_type():
    with pytest.raises(ValueError):
        Frame(name="x", type="optimize")


def test_system_rejects_duplicate_frames():
    with pytest.raises(ValueError):
        System(frames=[Frame(name="a"), Frame(name="a")])


def test_system_rejects_unknown_dependency():
    with pytest.raises(ValueError):
        System(
            frames=[Frame(name="a")],
            dependencies=[Dependency(source="a", target="ghost", effect=0.1)],
        )


def test_roundtrip_serialisation():
    system = build_system()
    restored = System.from_dict(system.to_dict())
    assert restored.to_dict() == system.to_dict()


# --------------------------------------------------------------------------
# Propagation
# --------------------------------------------------------------------------
def test_propagation_signed_effect():
    system = build_system()
    # énergie -0.3 -> taille (effect -0.4) => +0.12
    impacts = propagate_delta(system, "energie", -0.3)
    assert impacts["taille"] == pytest.approx(0.12)
    assert impacts["cout"] == pytest.approx(0.15)  # effect -0.5 * -0.3
    # chaîne énergie -> taille -> bruit : 0.12 * -0.3 = -0.036
    assert impacts["bruit"] == pytest.approx(-0.036)


def test_propagation_is_cycle_safe():
    system = System(
        frames=[Frame(name="a"), Frame(name="b")],
        dependencies=[
            Dependency(source="a", target="b", effect=0.5),
            Dependency(source="b", target="a", effect=0.5),
        ],
    )
    # Ne doit pas boucler à l'infini.
    impacts = propagate_delta(system, "a", 1.0)
    assert "b" in impacts
    assert "a" not in impacts  # la source d'origine n'est pas réinjectée


def test_split_impacts_active_vs_passive():
    system = build_system()
    system.get("taille").active = False
    impacts = propagate_delta(system, "energie", -0.3)
    active, ignored = split_impacts(system, impacts)
    assert "taille" in ignored
    assert "cout" in active


# --------------------------------------------------------------------------
# Scoring (par cadre, pas de score global)
# --------------------------------------------------------------------------
def test_frame_score_direction():
    minimize = Frame(name="cout", type="minimize", value=0.2)
    maximize = Frame(name="repa", type="maximize", value=0.2)
    assert frame_score(minimize) == pytest.approx(0.8)
    assert frame_score(maximize) == pytest.approx(0.2)


def test_scores_are_per_frame():
    engine = DecisionEngine(build_system())
    scores = engine.scores()
    assert set(scores) == {"energie", "taille", "cout", "bruit"}
    # Aucun "score global" n'est produit.
    assert "global" not in scores
    assert "total" not in scores


# --------------------------------------------------------------------------
# Moteur
# --------------------------------------------------------------------------
def test_activation_visible_is_not_active():
    engine = DecisionEngine(build_system())
    engine.deactivate("bruit")
    assert engine.system.has("bruit")            # toujours visible
    assert engine.system.get("bruit").active is False
    assert "bruit" not in engine.decide()["decision"]


def test_apply_objectives_ignored_becomes_passive():
    engine = DecisionEngine(build_system())
    engine.apply_objectives({"energie": 0.2, "taille": "ignored"})
    assert engine.system.get("energie").value == pytest.approx(0.2)
    assert engine.system.get("taille").active is False


def test_move_cursor_mutates_state():
    engine = DecisionEngine(build_system())
    before = engine.system.get("cout").value
    engine.move_cursor("energie", -0.3)
    after = engine.system.get("cout").value
    assert after == pytest.approx(before + 0.15)
    assert engine.system.get("energie").value == pytest.approx(0.2)


def test_explore_does_not_mutate_state():
    engine = DecisionEngine(build_system())
    snapshot = engine.to_dict()
    results = engine.explore("energie", [-0.2, 0.2])
    assert len(results) == 2
    assert engine.to_dict() == snapshot  # l'exploration est non destructive


def test_decide_output_shape():
    engine = DecisionEngine(build_system())
    out = engine.decide()
    for key in ("decision", "scores", "impacts", "ignored_impacts", "warnings", "alternatives"):
        assert key in out


def test_demo_runs():
    result = demo()
    assert "decision" in result
    assert "propagation_energie_-0.3" in result
