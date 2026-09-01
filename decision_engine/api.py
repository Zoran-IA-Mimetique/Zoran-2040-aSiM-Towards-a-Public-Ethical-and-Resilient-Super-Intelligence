"""API HTTP optionnelle (FastAPI).

Endpoint :
    POST /simulate   -- charge un système, applique des objectifs optionnels,
                        renvoie la décision complète.

FastAPI est une dépendance *facultative* : le moteur fonctionne sans. Ce module
n'est importé que si l'on veut exposer l'API.

Lancement :
    uvicorn decision_engine.api:app --reload
"""

from __future__ import annotations

from typing import Any, Dict, Optional

try:
    from fastapi import FastAPI
    from pydantic import BaseModel
except ImportError as exc:  # pragma: no cover - dépendance optionnelle
    raise ImportError(
        "FastAPI/pydantic requis pour l'API. "
        "Installez-les avec : pip install fastapi uvicorn"
    ) from exc

from .engine import DecisionEngine
from .models import System


class SimulateRequest(BaseModel):
    system: Dict[str, Any]
    objectives: Optional[Dict[str, Any]] = None
    with_alternatives: bool = True


app = FastAPI(title="Decision Engine — cadres & curseurs", version="0.1.0")


@app.post("/simulate")
def simulate(req: SimulateRequest) -> Dict[str, Any]:
    """Simule une décision à partir d'un système (et d'objectifs optionnels)."""
    engine = DecisionEngine(System.from_dict(req.system))
    if req.objectives:
        engine.apply_objectives(req.objectives)
    return engine.decide(with_alternatives=req.with_alternatives)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
