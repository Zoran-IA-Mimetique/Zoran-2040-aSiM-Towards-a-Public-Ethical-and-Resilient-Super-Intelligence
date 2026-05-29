"""Chargement d'un dataset de projets BTP et apprentissage des dépendances.

Format de ``data/projects.jsonl`` (un JSON par ligne) ::

    {
      "project": "maison_passive_A",
      "decision": "performance maximale",
      "inputs":  {"mur.isolation": 0.9, "toiture.isolation": 0.9, ...},
      "outputs": {"systeme.energie": 0.15, "global.carbone": 0.55, ...}
    }

``inputs`` = leviers décidés ; ``outputs`` = conséquences observées. Le loader
fusionne les deux en un instantané plat ``{cadre: valeur}`` que le moteur sait
mémoriser via :meth:`Engine.record_experience`, puis analyser via
:meth:`Engine.suggest_dependency_updates`.

⚠️ Honnêteté méthodologique : ``suggest_dependency_updates`` mesure des
**covariances observationnelles**. Sur des données réelles, elles mêlent effets
directs et indirects (un cadre peut bouger via plusieurs chemins). Ce sont donc
des *suggestions* d'ajustement, pas une vérité causale : aucune mise à jour
n'est appliquée automatiquement.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from btp_engine import Engine, create_btp_engine

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(HERE, "data", "projects.jsonl")


def load_projects(path: str = DEFAULT_DATASET) -> List[Dict[str, Any]]:
    """Charge les projets depuis un fichier JSONL (lignes vides ignorées)."""
    projects: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                projects.append(json.loads(line))
    return projects


def project_frames(project: Dict[str, Any]) -> Dict[str, float]:
    """Fusionne ``inputs`` + ``outputs`` en un instantané plat ``{cadre: valeur}``."""
    merged: Dict[str, float] = {}
    merged.update(project.get("inputs", {}))
    merged.update(project.get("outputs", {}))
    return merged


def feed_experiences(engine: Engine, projects: List[Dict[str, Any]]) -> Engine:
    """Injecte chaque projet comme une expérience apprise du moteur."""
    for project in projects:
        snapshot = project_frames(project)
        # On positionne les cadres connus du moteur sur les valeurs du projet,
        # puis on enregistre l'expérience (record_experience lit engine.frames).
        for name, value in snapshot.items():
            if name in engine.frames:
                engine.frames[name].value = max(0.0, min(1.0, float(value)))
        engine.record_experience(project.get("project", ""))
    return engine


def learn_from_dataset(path: str = DEFAULT_DATASET) -> Dict[str, Any]:
    """Charge le dataset, alimente un moteur, renvoie le rapport d'apprentissage."""
    projects = load_projects(path)
    engine = create_btp_engine()
    feed_experiences(engine, projects)
    suggestions = engine.suggest_dependency_updates()
    return {
        "projects": len(projects),
        "experiences": len(engine.experiences),
        "suggestions": suggestions,
        "decisions": sorted({p.get("decision", "") for p in projects}),
    }


if __name__ == "__main__":
    report = learn_from_dataset()
    print(f"Projets chargés      : {report['projects']}")
    print(f"Expériences apprises : {report['experiences']}")
    print(f"Types de décision    : {', '.join(report['decisions'])}")
    if report["suggestions"]:
        print("\nAjustements de dépendances suggérés (signe observé vs poids) :")
        for s in report["suggestions"]:
            print(f"  • {s['dependency']}: {s['current_weight']} -> "
                  f"{s['suggested_weight']}  (cov={s['observed_covariance']})")
    else:
        print("\nAucun conflit de signe : les données confirment le modèle. ✅")
