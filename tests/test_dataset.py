"""Tests du dataset BTP et de l'apprentissage (dataset.py)."""

import dataset as ds
from btp_engine import Dependency, Engine, Frame, create_btp_engine


def test_load_projects_count():
    projects = ds.load_projects()
    assert len(projects) == 10
    assert all("inputs" in p and "outputs" in p for p in projects)


def test_project_frames_merges_inputs_outputs():
    p = {"inputs": {"mur.isolation": 0.9}, "outputs": {"systeme.energie": 0.15}}
    flat = ds.project_frames(p)
    assert flat == {"mur.isolation": 0.9, "systeme.energie": 0.15}


def test_feed_experiences_populates_engine():
    eng = create_btp_engine()
    ds.feed_experiences(eng, ds.load_projects())
    assert len(eng.experiences) == 10
    # chaque expérience contient bien les cadres du moteur
    assert "systeme.energie" in eng.experiences[0]["frames"]


def test_learn_from_dataset_report():
    report = ds.learn_from_dataset()
    assert report["projects"] == 10
    assert report["experiences"] == 10
    assert isinstance(report["suggestions"], list)
    # dataset cohérent => le modèle est confirmé (pas de conflit de signe).
    assert report["suggestions"] == []


def test_learning_fires_on_conflicting_dataset():
    # Dépendance positive, mais données où source/cible varient en sens OPPOSÉ.
    frames = {"a": Frame(0.5), "b": Frame(0.5)}
    eng = Engine(frames, [Dependency("a", "b", 0.5)])
    for av, bv in [(0.1, 0.9), (0.9, 0.1)]:
        eng.frames["a"].value, eng.frames["b"].value = av, bv
        eng.record_experience()
    sugg = eng.suggest_dependency_updates()
    assert sugg and sugg[0]["dependency"] == "a→b"
    assert sugg[0]["suggested_weight"] < 0.5  # tiré vers le négatif observé
