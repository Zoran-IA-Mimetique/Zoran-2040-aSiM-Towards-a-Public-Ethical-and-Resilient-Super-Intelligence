"""UI + API pour piloter le moteur BTP avec des curseurs.

* ``simulate_payload(payload)`` : logique pure, **sans dépendance framework**
  (donc testable directement).
* App FastAPI optionnelle : sert ``ui/index.html`` et expose ``POST /simulate``.

Lancement (si FastAPI installé) ::

    pip install fastapi uvicorn
    uvicorn webapp:app --reload
    # puis ouvrir http://127.0.0.1:8000/
"""

from __future__ import annotations

import os
from typing import Any, Dict

from btp_engine import create_btp_engine, run_from_json

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(HERE, "ui", "index.html")


def simulate_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simule à partir d'un payload UI et renvoie l'analyse complète.

    Payload ::
        {
          "frames":  {"systeme.energie": {"value": 0.3, "active": true}, ...},
          "deltas":  {"mur.isolation": 0.2},   # optionnel
          "gamma":   1.0                         # optionnel (non-linéaire)
        }
    """
    engine = create_btp_engine()
    engine.gamma = float(payload.get("gamma", 1.0))

    for name, spec in (payload.get("frames") or {}).items():
        if name not in engine.frames:
            continue
        frame = engine.frames[name]
        if "value" in spec:
            frame.value = max(0.0, min(1.0, float(spec["value"])))
        if "active" in spec:
            frame.active = bool(spec["active"])

    for name, delta in (payload.get("deltas") or {}).items():
        engine.apply_delta(name, float(delta))

    result = engine.explain()
    return {
        "active": result["active"],
        "ignored": result["ignored"],
        "score": result["score"],
        "violations": [m for *_, m in result["violations"]],
        "suggestions": [s["message"] for s in engine.suggest_actions()],
    }


def idea_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    """Pipeline « idée libre -> JSON -> simulation » (LLM = structure, moteur = vérité).

    Body ::
        {"idea": "texte libre", "auto_adjust": true}
    """
    from translator import translate_idea

    idea = str(body.get("idea", "")).strip()
    payload = translate_idea(idea)
    engine = create_btp_engine()
    result = run_from_json(engine, payload,
                           auto_adjust=bool(body.get("auto_adjust", True)))
    return {"payload": payload, "result": result}


# --------------------------------------------------------------------------
# Wrapper FastAPI (optionnel)
# --------------------------------------------------------------------------
try:
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse, JSONResponse

    app = FastAPI(title="Moteur BTP — curseurs", version="0.1.0")

    @app.get("/", response_class=HTMLResponse)
    def index() -> Any:
        with open(INDEX_HTML, "r", encoding="utf-8") as handle:
            return handle.read()

    @app.post("/simulate")
    def simulate(payload: Dict[str, Any]) -> Any:
        return JSONResponse(simulate_payload(payload))

    @app.post("/idea")
    def idea(body: Dict[str, Any]) -> Any:
        return JSONResponse(idea_payload(body))

except ImportError:  # pragma: no cover - FastAPI non installé
    app = None
