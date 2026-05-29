"""Bloc 1 — traducteur « idée libre -> JSON structuré » pour le moteur.

Règle d'or du système : **LLM = structure, MOTEUR = vérité**. Le traducteur ne
fait QUE produire une structure ; il n'arbitre rien, n'invente pas de lois
physiques. Le moteur (``btp_engine.run_from_json``) reste la source de vérité et
peut invalider la proposition.

Deux modes :

* :func:`translate_idea` — traducteur **déterministe** par règles (mots-clés).
  Aucune dépendance LLM : testable immédiatement, reproductible.
* :func:`translate_idea_llm` — branche un LLM via un callable, en utilisant
  :data:`TRANSLATOR_PROMPT`. Optionnel.

Sortie (format obligatoire) ::

    {
      "frames":  {"systeme.energie": {"value": .5, "active": true, "weight": 2.0}},
      "deltas":  {"systeme.energie": -0.2},
      "context": {"idea": "...", "type": "optimisation", "confidence": 0.7}
    }
"""

from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List, Tuple

# --- prompt pour un usage LLM (optionnel) ----------------------------------
TRANSLATOR_PROMPT = """\
Tu es un traducteur d'idées d'ingénierie en modèle structuré.

Entrée : une idée libre (bâtiment, énergie, système technique).
Sortie : un JSON STRICT avec :
- frames (valeurs dans [0,1] + active + weight)
- deltas (modifications proposées dans [-1,1])
- context (idea, type ∈ {innovation, optimisation}, confidence ∈ [0,1])

Contraintes :
- utiliser uniquement des concepts physiques réalistes
- ne pas inventer de variables absurdes
- rester cohérent avec un projet BTP
- sortie = JSON uniquement (aucun texte)
"""

# --- base de cadres connus (valeurs/poids par défaut, alignés BTP) ----------
# (frame, valeur_défaut, poids_défaut, "minimize"|"maximize")
_FRAME_DEFAULTS: Dict[str, Tuple[float, float, str]] = {
    "systeme.energie": (0.5, 2.0, "minimize"),
    "systeme.cout": (0.5, 1.2, "minimize"),
    "systeme.maintenance": (0.5, 0.9, "minimize"),
    "systeme.inertie": (0.6, 1.5, "maximize"),
    "global.carbone": (0.6, 1.8, "minimize"),
    "global.surface": (0.7, 1.0, "maximize"),
    "mur.isolation": (0.6, 1.5, "maximize"),
    "toiture.isolation": (0.7, 1.4, "maximize"),
    "mur.reparabilite": (0.6, 0.7, "maximize"),
}

# mots-clés -> cadre
_KEYWORDS: List[Tuple[str, str]] = [
    (r"énergie|energie|consommation|conso|chauffage|électr|electr", "systeme.energie"),
    (r"co[uû]t|budget|prix|dépense|depense|euro", "systeme.cout"),
    (r"maintenance|entretien|exploitation", "systeme.maintenance"),
    (r"inertie|stockage thermique|thermique|tampon|eau|hydraulique|masse", "systeme.inertie"),
    (r"carbone|co2|empreinte|émission|emission", "global.carbone"),
    (r"surface|espace|m2|mètres carrés|metres carres", "global.surface"),
    (r"isolation|isoler|isolant", "mur.isolation"),
    (r"toiture|toit|couverture", "toiture.isolation"),
    (r"réparab|reparab|démontable|demontable|recycl", "mur.reparabilite"),
]

_REDUCE = r"rédui|redui|baiss|diminu|minimis|moins|limit|économis|economis|abaiss"
_INCREASE = r"augment|maximis|amélior|amelior|renforc|booster|accro[iî]tre|plus de|davantage"
_INNOVATION = r"innov|nouveau|nouvelle|concept|prototype|inédit|inedit|breveté|brevete|idée|idee"

_DELTA = 0.2


def _detect_frames(text: str) -> List[str]:
    found: List[str] = []
    for pattern, frame in _KEYWORDS:
        if re.search(pattern, text) and frame not in found:
            found.append(frame)
    return found


def _detect_delta(text: str, frame: str) -> float:
    """Direction du delta selon les verbes ET la nature du cadre.

    Heuristique conservatrice (limite assumée d'une traduction par règles) :
    « réduire/baisser » vise un cadre **à minimiser** (énergie, coût, carbone) ;
    « augmenter/améliorer » vise un cadre **à maximiser** (isolation, inertie).
    On n'applique donc un delta que si le verbe est cohérent avec la nature du
    cadre — pour éviter de pousser l'inertie vers le bas sous prétexte que le
    texte dit « réduire l'énergie ».
    """
    reduce_ = re.search(_REDUCE, text) is not None
    increase = re.search(_INCREASE, text) is not None
    kind = _FRAME_DEFAULTS.get(frame, (0.5, 1.0, "minimize"))[2]
    if kind == "minimize":
        if reduce_:
            return -_DELTA
        if increase:
            return +_DELTA
    else:  # maximize
        if increase:
            return +_DELTA
    return 0.0


def translate_idea(idea: str) -> Dict[str, Any]:
    """Traduit une idée libre en JSON structuré (déterministe, sans LLM)."""
    text = idea.lower()
    frames_found = _detect_frames(text)

    frames: Dict[str, Any] = {}
    deltas: Dict[str, float] = {}
    for frame in frames_found:
        value, weight, _ = _FRAME_DEFAULTS[frame]
        frames[frame] = {"value": value, "active": True, "weight": weight}
        delta = _detect_delta(text, frame)
        if delta:
            deltas[frame] = round(delta, 3)

    # Repli : si rien n'est reconnu, on cible l'énergie (cadre par défaut).
    if not frames:
        value, weight, _ = _FRAME_DEFAULTS["systeme.energie"]
        frames["systeme.energie"] = {"value": value, "active": True, "weight": weight}

    idea_type = "innovation" if re.search(_INNOVATION, text) else "optimisation"
    # confiance : croît avec le nombre de cadres reconnus, plafonnée.
    confidence = round(min(0.9, 0.4 + 0.15 * len(frames_found)), 2)

    return {
        "frames": frames,
        "deltas": deltas,
        "context": {
            "idea": idea.strip()[:160],
            "type": idea_type,
            "confidence": confidence,
        },
    }


def translate_idea_llm(idea: str, call_llm: Callable[[str, str], str]) -> Dict[str, Any]:
    """Variante LLM : ``call_llm(system_prompt, user_text) -> str(JSON)``.

    Le JSON renvoyé par le LLM est parsé ; en cas d'échec on retombe sur le
    traducteur déterministe (le moteur reste de toute façon l'arbitre).
    """
    try:
        raw = call_llm(TRANSLATOR_PROMPT, idea)
        payload = json.loads(raw)
        payload.setdefault("frames", {})
        payload.setdefault("deltas", {})
        payload.setdefault("context", {"idea": idea[:160], "type": "optimisation",
                                       "confidence": 0.5})
        return payload
    except Exception:
        return translate_idea(idea)


# --------------------------------------------------------------------------
# Pipeline complet : idée -> JSON -> simulation
# --------------------------------------------------------------------------
def pipeline(idea: str, *, auto_adjust: bool = True) -> Dict[str, Any]:
    """Idée libre -> structure -> simulation par le moteur (arbitre)."""
    from btp_engine import create_btp_engine, run_from_json

    payload = translate_idea(idea)
    engine = create_btp_engine()
    result = run_from_json(engine, payload, auto_adjust=auto_adjust)
    return {"payload": payload, "result": result}


if __name__ == "__main__":
    demo_idea = ("poche d'eau autour d'un bâtiment avec circulation lente et "
                 "stockage thermique pour réduire l'énergie")
    out = pipeline(demo_idea)
    print("IDÉE :", demo_idea)
    print("\nJSON (traducteur) :")
    print(json.dumps(out["payload"], indent=2, ensure_ascii=False))
    print("\nDIAGNOSTIC (moteur arbitre) :")
    r = out["result"]
    print("  actifs     :", {k: v["value"] for k, v in r["active"].items()})
    print("  violations :", r["violations"] or "aucune")
    print("  auto_adjust:", r["auto_adjust"])
    print("  suggestions:", r["suggestions"] or "aucune")
