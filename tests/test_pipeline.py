"""Tests du pipeline « idée -> JSON -> simulation » (translator + run_from_json)."""

import pytest

import translator as tr
from btp_engine import create_btp_engine, run_from_json
from webapp import idea_payload


# -- Traducteur (déterministe) ----------------------------------------------
def test_translate_detects_frames_and_direction():
    p = tr.translate_idea("réduire la consommation énergétique et le coût")
    assert "systeme.energie" in p["frames"]
    assert "systeme.cout" in p["frames"]
    assert p["deltas"]["systeme.energie"] == -0.2   # minimize + « réduire »
    assert p["deltas"]["systeme.cout"] == -0.2


def test_translate_reduce_does_not_lower_maximize_frame():
    # « réduire l'énergie » ne doit PAS baisser l'inertie (cadre à maximiser).
    p = tr.translate_idea("stockage thermique et inertie pour réduire l'énergie")
    assert "systeme.inertie" in p["frames"]
    assert "systeme.inertie" not in p["deltas"]      # pas de delta négatif parasite
    assert p["deltas"].get("systeme.energie") == -0.2


def test_translate_increase_raises_maximize_frame():
    p = tr.translate_idea("augmenter l'isolation des murs")
    assert p["deltas"]["mur.isolation"] == 0.2


def test_translate_fallback_when_nothing_matched():
    p = tr.translate_idea("xyz blabla")
    assert "systeme.energie" in p["frames"]
    assert p["context"]["confidence"] <= 0.4


def test_translate_context_type():
    assert tr.translate_idea("nouveau concept innovant")["context"]["type"] == "innovation"
    assert tr.translate_idea("réduire le coût")["context"]["type"] == "optimisation"


def test_llm_translator_falls_back_on_bad_json():
    p = tr.translate_idea_llm("réduire l'énergie", call_llm=lambda s, u: "pas du json")
    assert "systeme.energie" in p["frames"]  # repli déterministe


# -- run_from_json ----------------------------------------------------------
def test_run_from_json_injects_new_frame():
    engine = create_btp_engine()
    payload = {"frames": {"systeme.inertie": {"value": 0.8, "active": True, "weight": 1.5}},
               "deltas": {}}
    out = run_from_json(engine, payload, auto_adjust=False)
    assert "systeme.inertie" in engine.frames
    assert "systeme.inertie" in out["active"]


def test_run_from_json_auto_adjust_repairs_violation():
    engine = create_btp_engine()
    # on force l'énergie (résultat) au-delà du seuil ; les leviers d'entrée
    # (isolation) doivent la ramener sous la limite.
    payload = {"frames": {"systeme.energie": {"value": 0.85, "active": True},
                          "mur.isolation": {"value": 0.4, "active": True},
                          "toiture.isolation": {"value": 0.4, "active": True}},
               "deltas": {}}
    out = run_from_json(engine, payload, auto_adjust=True)
    assert out["auto_adjust"]["feasible"] is True
    assert out["violations"] == []
    # l'optimiseur a bougé un levier d'entrée, pas le résultat directement.
    assert all(m["frame"] in ("mur.isolation", "toiture.isolation")
               for m in out["auto_adjust"]["moves"])


def test_auto_adjust_only_moves_root_levers():
    engine = create_btp_engine()
    engine.frames["systeme.energie"].value = 0.9  # violation directe
    res = engine.auto_adjust()
    for move in res["moves"]:
        # jamais un cadre qui est lui-même la cible d'une dépendance (résultat)
        assert move["frame"] not in engine.reverse_graph


# -- pipeline / endpoint ----------------------------------------------------
def test_pipeline_end_to_end():
    out = tr.pipeline("réduire l'énergie grâce à une forte isolation")
    assert "payload" in out and "result" in out
    assert "score" in out["result"]


def test_idea_payload_shape():
    out = idea_payload({"idea": "réduire le coût et le carbone"})
    assert set(out) == {"payload", "result"}
    assert "violations" in out["result"]
    assert "auto_adjust" in out["result"]
