"""Bridge ZORAN ↔ moteur de décision.

Architecture (couplage faible, le verrou) :

    ZORAN   = mémoire + contexte (cerveau)
    MOTEUR  = décision + contraintes (btp_engine.Engine)
    BRIDGE  = traducteur entre les deux  ← ce module

ZORAN ne modifie JAMAIS le moteur directement : il fournit une « mémoire »
(liste de dicts) que le bridge traduit en état moteur, puis récupère une trace
de décision à réinjecter dans la mémoire. Aucune dépendance à ZORAN ici : la
mémoire est un simple ``list[dict]``, ce qui rend le bridge testable seul.

Format mémoire attendu (souple) ::

    [
      {"type": "constraint", "key": "global.carbone", "value": 0.6,
       "active": False, "weight": 1.8, "max": 0.65},
      {"type": "decision_trace", ...},   # ignoré à la reconstruction
    ]
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from btp_engine import (
    Dependency,
    Engine,
    Frame,
    create_btp_engine,
)

# Mapping intention utilisateur -> cadre moteur (accents gérés).
KEYWORD_MAP: Dict[str, str] = {
    "energie": "systeme.energie",
    "énergie": "systeme.energie",
    "cout": "systeme.cout",
    "coût": "systeme.cout",
    "cout systeme": "systeme.cout",
    "surface": "global.surface",
    "carbone": "global.carbone",
    "isolation": "mur.isolation",
    "maintenance": "systeme.maintenance",
}


def build_engine_from_zoran_memory(memory: List[Dict[str, Any]]) -> Engine:
    """Reconstruit un moteur à partir de la mémoire ZORAN.

    On part du modèle BTP de référence (dépendances + contraintes connues), puis
    on **surcharge** les cadres et contraintes décrits dans la mémoire. Ainsi le
    moteur reste cohérent même si la mémoire est partielle (correction du
    brouillon qui référençait ``deps``/``constraints`` non définis).
    """
    engine = create_btp_engine()
    for item in memory:
        if item.get("type") != "constraint":
            continue
        key = item["key"]
        if key in engine.frames:
            frame = engine.frames[key]
            frame.value = item.get("value", frame.value)
            frame.active = item.get("active", frame.active)
            frame.weight = item.get("weight", frame.weight)
        else:
            engine.frames[key] = Frame(
                value=item.get("value", 0.5),
                active=item.get("active", True),
                weight=item.get("weight", 1.0),
            )
        # Bornes / contraintes éventuelles portées par la mémoire.
        rule = {b: item[b] for b in ("max", "min") if b in item}
        if rule:
            engine.constraints[key] = rule
    return engine


def extract_context(user_input: str, memory: Optional[List[Dict[str, Any]]] = None) -> List[str]:
    """Identifie les cadres pertinents à activer à partir de l'intention."""
    text = user_input.lower()
    active: List[str] = []
    for word, frame_name in KEYWORD_MAP.items():
        if word in text and frame_name not in active:
            active.append(frame_name)
    return active


def run_decision(
    user_input: str,
    zoran_memory: List[Dict[str, Any]],
    *,
    delta_frame: str = "systeme.energie",
    delta: float = -0.2,
) -> Dict[str, Any]:
    """Pipeline complet : mémoire -> moteur -> activation -> décision."""
    engine = build_engine_from_zoran_memory(zoran_memory)

    # Activation pilotée par l'intention (repli si rien n'est reconnu).
    active = extract_context(user_input, zoran_memory)
    if not active:
        active = [delta_frame]
    for name, frame in engine.frames.items():
        frame.active = name in active

    if delta_frame in engine.frames:
        engine.apply_delta(delta_frame, delta)

    return {
        "intent": user_input,
        "activated": active,
        "result": engine.explain(),
        "suggestions": engine.suggest_actions(),
        "_engine": engine,  # pour un éventuel feed-back
    }


def feed_back_to_zoran(engine: Engine, memory: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Réinjecte une trace de décision dans la mémoire ZORAN."""
    state = engine.explain()
    memory.append({
        "type": "decision_trace",
        "score": state["score"],
        "violations": [m for *_, m in state["violations"]],
        "frames": {k: round(v.value, 3) for k, v in engine.frames.items()},
    })
    return memory


# --------------------------------------------------------------------------
# Démo
# --------------------------------------------------------------------------
def demo() -> Dict[str, Any]:
    memory: List[Dict[str, Any]] = [
        {"type": "constraint", "key": "global.carbone", "value": 0.6,
         "active": False, "weight": 1.8, "max": 0.65},
        {"type": "constraint", "key": "systeme.energie", "value": 0.5,
         "active": True, "weight": 2.0, "max": 0.4},
    ]
    out = run_decision("je veux réduire l'énergie sans exploser le coût", memory)
    feed_back_to_zoran(out["_engine"], memory)
    return {"decision": {k: out[k] for k in ("intent", "activated")},
            "memory_size": len(memory)}


if __name__ == "__main__":
    import json

    print(json.dumps(demo(), indent=2, ensure_ascii=False))
