"""Cas réel : maison RE2020 simplifiée (énergie / coût / surface / carbone).

But : montrer le passage **calcul → décision**.

* on pilote l'énergie (curseur actif) ;
* on observe les conséquences (coût, surface, carbone) ;
* surface / carbone sont *surveillés mais ignorés* tant qu'ils sont inactifs ;
* dès que le carbone devient **actif** ET dépasse le seuil RE2020,
  la solution est déclarée **BLOQUÉE** (non conforme).

Convention de signe (cf. ``decision_engine_min``) : ``delta_cible = poids * delta_source``.
Les poids ci-dessous sont choisis pour refléter la réalité métier :

    énergie ↓ -> coût ↑      (mieux isoler coûte plus cher)        -> poids -0.3
    énergie ↓ -> surface ↓   (isolation plus épaisse = moins de surface) -> poids +0.3
    énergie ↓ -> carbone ↑   (matériaux performants plus carbonés) -> poids -0.2
"""

from typing import Dict

from decision_engine_min import DecisionEngine, Dependency, Frame

# Seuils RE2020-like : au-delà, une solution est non conforme.
RE2020_LIMITS: Dict[str, float] = {
    "carbone": 0.6,   # plafond carbone
    "energie": 0.45,  # plafond consommation
}


def build(carbone_active: bool = False):
    """Construit le système RE2020 (frames + dépendances)."""
    frames = {
        "energie": Frame("energie", 0.5, True),
        "cout": Frame("cout", 0.5, True),
        "surface": Frame("surface", 0.7, False),
        "carbone": Frame("carbone", 0.6, carbone_active),
    }
    deps = [
        Dependency("energie", "cout", -0.3),     # énergie ↓ -> coût ↑
        Dependency("energie", "surface", 0.3),   # énergie ↓ -> surface ↓
        Dependency("energie", "carbone", -0.2),  # énergie ↓ -> carbone ↑
    ]
    return frames, deps


def evaluate(frames, initial, limits=RE2020_LIMITS):
    """Analyse l'état courant : actifs / ignorés / blocages / validité."""
    active, ignored, blocking = {}, {}, []
    for name, frame in frames.items():
        base = initial[name]
        delta = frame.value - base
        pct = round(delta / base * 100) if base else 0
        info = {"value": round(frame.value, 3), "delta": round(delta, 3), "pct": pct}
        (active if frame.active else ignored)[name] = info
        # Un cadre actif qui dépasse sa limite rend la solution non conforme.
        if frame.active and name in limits and frame.value > limits[name] + 1e-9:
            blocking.append(name)
    return {"active": active, "ignored": ignored, "blocking": blocking,
            "valid": not blocking}


def _fmt(info):
    sign = "+" if info["pct"] >= 0 else ""
    return f"{info['value']} ({sign}{info['pct']}%)"


def report(title, frames, initial):
    """Affiche un rapport lisible d'un scénario."""
    res = evaluate(frames, initial)
    print(f"\n=== {title} ===")
    print("Décision (cadres actifs) :")
    for name, info in res["active"].items():
        flag = "❌" if name in res["blocking"] else "✔"
        print(f"  {flag} {name:8} : {_fmt(info)}")
    print("Impacts ignorés (surveillés, non bloquants) :")
    for name, info in res["ignored"].items():
        print(f"  ⚠ {name:8} : {_fmt(info)}")
    if res["valid"]:
        print("➡️  Solution VALIDE (compromis accepté).")
    else:
        for name in res["blocking"]:
            limit = RE2020_LIMITS[name]
            print(f"➡️  ❌ NON CONFORME RE2020 : {name} = "
                  f"{round(frames[name].value, 3)} > seuil {limit} (bloquant).")
    return res


def scenario_a():
    """Énergie minimale, carbone surveillé (inactif) : on voit les compromis."""
    frames, deps = build(carbone_active=False)
    initial = {k: f.value for k, f in frames.items()}
    DecisionEngine(frames, deps).apply_delta("energie", -0.4)
    return report("Scénario A — réduire l'énergie (carbone surveillé)", frames, initial)


def scenario_b():
    """Même action, mais carbone ACTIF : la contrainte devient bloquante."""
    frames, deps = build(carbone_active=True)
    initial = {k: f.value for k, f in frames.items()}
    DecisionEngine(frames, deps).apply_delta("energie", -0.4)
    return report("Scénario B — carbone activé (contrainte RE2020)", frames, initial)


if __name__ == "__main__":
    scenario_a()
    scenario_b()
