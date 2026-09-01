"""Tests du cas RE2020 simplifié (re2020.py)."""

import re2020


def test_scenario_a_valide_avec_carbone_surveille():
    res = re2020.scenario_a()
    # énergie pilotée, coût en hausse, surface/carbone ignorés mais visibles.
    assert "energie" in res["active"]
    assert "cout" in res["active"]
    assert "surface" in res["ignored"]
    assert "carbone" in res["ignored"]
    # carbone inactif => jamais bloquant, solution valide.
    assert res["blocking"] == []
    assert res["valid"] is True


def test_scenario_b_carbone_actif_bloque():
    res = re2020.scenario_b()
    # carbone activé => devient un cadre de décision...
    assert "carbone" in res["active"]
    # ... et dépasse le seuil RE2020 => solution non conforme.
    assert "carbone" in res["blocking"]
    assert res["valid"] is False


def test_directions_metier():
    frames, deps = re2020.build()
    initial = {k: f.value for k, f in frames.items()}
    re2020.DecisionEngine(frames, deps).apply_delta("energie", -0.4)
    # énergie ↓ -> coût ↑, surface ↓, carbone ↑ (réalité métier).
    assert frames["cout"].value > initial["cout"]
    assert frames["surface"].value < initial["surface"]
    assert frames["carbone"].value > initial["carbone"]
