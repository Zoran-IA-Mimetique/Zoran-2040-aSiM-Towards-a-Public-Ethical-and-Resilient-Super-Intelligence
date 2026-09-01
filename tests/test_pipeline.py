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


# -- cycle de vie (dimension temps) -----------------------------------------
def test_lifecycle_returns_none_without_carbon_frames():
    from btp_engine import Engine, Frame
    eng = Engine({"x": Frame(0.5)}, [])
    assert eng.lifecycle_carbon() is None


def test_lifecycle_formula():
    engine = create_btp_engine()
    engine.frames["global.carbone"].value = 0.9       # construction lourde
    engine.frames["global.carbone_annuel"].value = 0.1  # usage sobre
    lc = engine.lifecycle_carbon(horizon=10, baseline_annual=0.5)
    assert lc["cumulative"] == pytest.approx(0.9 + 0.1 * 10)        # 1.9
    assert lc["per_year"] == pytest.approx((0.9 + 0.1 * 10) / 11, abs=1e-3)
    assert lc["payback_years"] == pytest.approx(0.9 / (0.5 - 0.1), abs=0.1)


def test_lifecycle_verdict_flips_with_horizon():
    # même système : mauvais en court terme, bon en long terme.
    engine = create_btp_engine()
    engine.frames["global.carbone"].value = 0.9
    engine.frames["global.carbone_annuel"].value = 0.15
    short = engine.lifecycle_carbon(horizon=1)
    long = engine.lifecycle_carbon(horizon=30)
    assert short["favorable"] is False
    assert long["favorable"] is True


def test_no_payback_when_usage_not_sober():
    engine = create_btp_engine()
    engine.frames["global.carbone_annuel"].value = 0.9  # usage pire que la réf
    lc = engine.lifecycle_carbon(baseline_annual=0.5)
    assert lc["payback_years"] is None


def test_existing_carbone_constraint_unchanged():
    # garde-fou : la contrainte RE2020 instantanée n'a pas bougé.
    assert create_btp_engine().constraints["global.carbone"] == {"max": 0.65}


def test_run_from_json_sets_horizon_and_returns_lifecycle():
    engine = create_btp_engine()
    payload = {"frames": {"global.carbone": {"value": 0.8, "active": True},
                          "global.carbone_annuel": {"value": 0.2, "active": True}},
               "deltas": {}, "context": {"horizon": 40}}
    out = run_from_json(engine, payload, auto_adjust=False)
    assert engine.horizon == 40
    assert out["lifecycle"] is not None
    assert out["lifecycle"]["horizon"] == 40


def test_translator_detects_time_and_passive_heavy():
    p = tr.translate_idea("poche d'eau en béton, stockage thermique passif, sur 25 ans")
    assert p["context"]["horizon"] == 25.0
    assert p["frames"]["global.carbone"]["value"] == 0.85     # construction lourde
    assert p["frames"]["global.carbone_annuel"]["value"] == 0.2  # usage passif
    assert p["frames"]["global.cout_initial"]["value"] == 0.8    # investissement lourd
    assert p["frames"]["global.cout_annuel"]["value"] == 0.2     # exploitation sobre


# -- coût sur cycle de vie / ROI --------------------------------------------
def test_lifecycle_cost_returns_none_without_cost_frames():
    from btp_engine import Engine, Frame
    eng = Engine({"x": Frame(0.5)}, [])
    assert eng.lifecycle_cost() is None


def test_lifecycle_cost_total_and_roi():
    engine = create_btp_engine()
    engine.frames["global.cout_initial"].value = 0.85
    engine.frames["global.cout_annuel"].value = 0.15
    c = engine.lifecycle_cost(horizon=30, baseline_annual=0.5, discount_rate=0.0)
    assert c["total"] == pytest.approx(0.85 + 0.15 * 30)        # 5.35
    assert c["baseline_total"] == pytest.approx(0.5 * 30)        # 15.0
    assert c["payback_years"] == pytest.approx(0.85 / (0.5 - 0.15), abs=0.1)
    assert c["roi"] > 0 and c["favorable"] is True


def test_lifecycle_cost_verdict_flips_with_horizon():
    engine = create_btp_engine()
    engine.frames["global.cout_initial"].value = 0.85
    engine.frames["global.cout_annuel"].value = 0.15
    assert engine.lifecycle_cost(horizon=1)["favorable"] is False   # non rentable court terme
    assert engine.lifecycle_cost(horizon=30)["favorable"] is True   # rentable long terme


def test_discount_rate_lowers_total():
    engine = create_btp_engine()
    engine.frames["global.cout_initial"].value = 0.85
    engine.frames["global.cout_annuel"].value = 0.15
    brut = engine.lifecycle_cost(horizon=30, discount_rate=0.0)["total"]
    actualise = engine.lifecycle_cost(horizon=30, discount_rate=0.04)["total"]
    assert actualise < brut   # les coûts futurs actualisés pèsent moins


def test_run_from_json_returns_lifecycle_cost_and_discount():
    engine = create_btp_engine()
    payload = {"frames": {"global.cout_initial": {"value": 0.8, "active": True},
                          "global.cout_annuel": {"value": 0.2, "active": True}},
               "deltas": {}, "context": {"horizon": 30, "discount_rate": 0.04}}
    out = run_from_json(engine, payload, auto_adjust=False)
    assert engine.discount_rate == 0.04
    assert out["lifecycle_cost"] is not None
    assert out["lifecycle_cost"]["discount_rate"] == 0.04


# -- robustesse / fiabilité -------------------------------------------------
def _heavy_passive_engine():
    engine = create_btp_engine()
    engine.frames["global.carbone"].value = 0.85
    engine.frames["global.carbone_annuel"].value = 0.2
    engine.frames["global.cout_initial"].value = 0.85
    engine.frames["global.cout_annuel"].value = 0.2
    return engine


def test_reliability_one_equals_optimistic():
    # fiabilité parfaite -> identique au calcul nominal (rétro-compatibilité).
    engine = _heavy_passive_engine()
    nominal = engine.lifecycle_carbon(horizon=30)
    perfect = engine.lifecycle_carbon(horizon=30, reliability=1.0, maintenance=0.15)
    assert perfect["annual"] == pytest.approx(nominal["annual"])


def test_low_reliability_degrades_annual():
    engine = _heavy_passive_engine()
    good = engine.lifecycle_carbon(horizon=30, reliability=0.9, maintenance=0.15)
    bad = engine.lifecycle_carbon(horizon=30, reliability=0.2, maintenance=0.15)
    assert bad["annual"] > good["annual"]   # moins fiable -> usage réel plus lourd


def test_robustness_verdict_flips_with_reliability():
    engine = _heavy_passive_engine()
    engine.frames["systeme.fiabilite"].value = 0.9
    assert engine.robustness(horizon=30)["robuste"] is True
    engine.frames["systeme.fiabilite"].value = 0.3
    rob = engine.robustness(horizon=30)
    assert rob["robuste"] is False
    # l'optimiste reste favorable, mais le réaliste non -> sensible à l'exécution.
    assert rob["carbone"]["optimiste_favorable"] is True
    assert rob["carbone"]["realiste_favorable"] is False


def test_break_even_reliability_is_a_fraction():
    engine = _heavy_passive_engine()
    be = engine._break_even_reliability("carbon", 30, engine.maintenance_penalty)
    assert be is None or 0.0 <= be <= 1.0


def test_robustness_none_without_reliability_frame():
    from btp_engine import Engine, Frame
    assert Engine({"x": Frame(0.5)}, []).robustness() is None


def test_translator_detects_reliability_risk():
    p = tr.translate_idea("système avec pompes et risque de panne")
    assert p["frames"]["systeme.fiabilite"]["value"] == 0.45
    p2 = tr.translate_idea("solution simple et robuste sans entretien")
    assert p2["frames"]["systeme.fiabilite"]["value"] == 0.8


def test_run_from_json_returns_robustness():
    engine = _heavy_passive_engine()
    payload = {"frames": {"systeme.fiabilite": {"value": 0.3, "active": True}},
               "deltas": {}, "context": {"horizon": 30}}
    out = run_from_json(engine, payload, auto_adjust=False)
    assert out["robustness"] is not None
    assert out["robustness"]["robuste"] is False


# -- assistant d'ingénierie : analyse / détection / correction --------------
def _project_with_problems():
    from btp_engine import Frame
    engine = create_btp_engine()
    engine.frames["global.cout_initial"].active = True
    engine.frames["global.cout_initial"].value = 0.85
    engine.frames["global.carbone"].active = True
    engine.frames["systeme.inertie"] = Frame(0.8, True, 1.5)
    return engine


def test_analyze_project_detects_inertia_and_constraint():
    types = [i["type"] for i in _project_with_problems().analyze_project()]
    assert "inertia" in types
    assert "constraint" in types   # energie active à 0.5 > max 0.4


def test_detect_missing_frames():
    frames = [m["frame"] for m in _project_with_problems().detect_missing_frames()]
    assert "global.carbone_annuel" in frames
    assert "global.cout_annuel" in frames
    assert "systeme.fiabilite" in frames


def test_detect_missing_is_deduplicated():
    # carbone_annuel est manquant pour 2 raisons -> ne doit apparaître qu'une fois.
    frames = [m["frame"] for m in _project_with_problems().detect_missing_frames()]
    assert frames.count("global.carbone_annuel") == 1


def test_auto_correct_activates_and_retests():
    engine = _project_with_problems()
    res = engine.auto_correct()
    assert any(f["frame"] == "systeme.fiabilite" for f in res["applied"])
    assert engine.frames["systeme.fiabilite"].active is True   # activé
    assert engine.frames["systeme.reactivite"].active is True  # créé
    assert "state" in res


def test_run_from_json_includes_analysis():
    out = run_from_json(_project_with_problems(), {"frames": {}, "deltas": {}}, auto_adjust=False)
    assert "analysis" in out and out["analysis"]["issues"]
    assert out["correction"] is None   # pas de correction sans demande


def test_run_from_json_auto_correct_flag():
    out = run_from_json(_project_with_problems(), {"frames": {}, "deltas": {}},
                        auto_adjust=False, auto_correct=True)
    assert out["correction"] is not None
    assert out["correction"]["applied"]


def test_translator_detects_complexity():
    p = tr.translate_idea("système complexe avec multiples pompes")
    assert p["frames"]["systeme.complexite"]["value"] == 0.85
