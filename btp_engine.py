"""Moteur BTP v2 — propagation cascade + scoring + scénarios + suggestions +
mémoire multi-tour + bridge ZORAN + stress test.

Module autonome (aucune dépendance LLM ni ZORAN). Noms de cadres en notation
pointée « element.frame » (ex. ``mur.isolation``, ``global.carbone``).

Corrections apportées par rapport au brouillon v2 :

1. ``compute_score`` : le ``gap`` compare désormais des scores *normalisés*
   (le brouillon mélangeait sommes brutes et moyennes pondérées).
2. ``apply_delta`` : la propagation accumule les contributions de **tous** les
   chemins acycliques (le BFS à ``visited`` global perdait les chemins en
   diamant A→B→D / A→C→D). Reste anti-cycle.
3. ``run_scenario`` : restaure l'état **complet** (valeurs *et* activation),
   pas seulement les valeurs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

_EPS = 1e-9


# --------------------------------------------------------------------------
# Modèles
# --------------------------------------------------------------------------
@dataclass
class Frame:
    value: float
    active: bool = True
    weight: float = 1.0  # poids dans le scoring pondéré


@dataclass
class Dependency:
    source: str
    target: str
    weight: float


@dataclass
class Scenario:
    name: str
    description: str
    adjustments: Dict[str, float]
    target_score: Optional[float] = None


# --------------------------------------------------------------------------
# Moteur
# --------------------------------------------------------------------------
class Engine:
    def __init__(self, frames: Dict[str, Frame], deps: List[Dependency],
                 constraints: Optional[Dict[str, Dict[str, float]]] = None,
                 gamma: float = 1.0, horizon: float = 30.0,
                 baseline_annual: float = 0.5):
        self.frames = frames
        self.deps = deps
        self.constraints = constraints or {}
        # gamma = exposant de la réponse de propagation.
        #   gamma = 1.0 -> linéaire (effet = poids * delta), comportement par défaut.
        #   gamma > 1.0 -> réponse progressive : comme les deltas sont dans [0, 1],
        #     les petits ajustements pèsent moins (0.3**2 = 0.09), les grands
        #     dominent. C'est volontairement *atténuant*, pas explosif.
        self.gamma = gamma
        # --- dimension TEMPS (cycle de vie) -------------------------------
        # horizon = durée d'évaluation en ANNÉES (pas un cadre [0,1] : c'est un
        #   paramètre du cadre temporel, pas une variable physique normalisée).
        # baseline_annual = intensité carbone annuelle d'un bâtiment de référence
        #   (conventionnel) servant à calculer le temps de retour carbone.
        self.horizon = float(horizon)
        self.carbone_baseline_annuel = float(baseline_annual)
        self.history: List[Dict[str, Any]] = []
        self.sessions: List[Dict[str, Any]] = []
        self.experiences: List[Dict[str, Any]] = []
        self._build_graph()

    def _build_graph(self) -> None:
        """Indexe le graphe (et son inverse) pour la propagation."""
        self.graph: Dict[str, List[Tuple[str, float]]] = {}
        self.reverse_graph: Dict[str, List[Tuple[str, float]]] = {}
        for dep in self.deps:
            self.graph.setdefault(dep.source, []).append((dep.target, dep.weight))
            self.reverse_graph.setdefault(dep.target, []).append((dep.source, dep.weight))

    # -- propagation ----------------------------------------------------
    def _clamp(self, name: str) -> None:
        self.frames[name].value = max(0.0, min(1.0, self.frames[name].value))

    def _response(self, d: float) -> float:
        """Réponse (non-)linéaire d'une arête à un delta entrant ``d``.

        gamma = 1.0 -> identité (linéaire). gamma != 1.0 -> ``signe(d)·|d|**gamma``.
        """
        if self.gamma == 1.0:
            return d
        return (1.0 if d >= 0 else -1.0) * (abs(d) ** self.gamma)

    def _propagate(self, source: str, delta: float) -> Dict[str, float]:
        """Cumul des impacts sur tous les chemins acycliques depuis ``source``.

        ``delta_cible = poids * réponse(delta_source)``, composé le long des
        chemins. Anti-cycle : un cadre déjà sur le chemin courant n'est pas réétendu.
        """
        impacts: Dict[str, float] = {}

        def walk(node: str, d: float, path: frozenset) -> None:
            for target, weight in self.graph.get(node, []):
                if target in path:
                    continue  # anti-cycle
                contribution = weight * self._response(d)
                if abs(contribution) < _EPS:
                    continue
                impacts[target] = impacts.get(target, 0.0) + contribution
                walk(target, contribution, path | {target})

        walk(source, delta, frozenset({source}))
        return impacts

    def apply_delta(self, name: str, delta: float, propagate: bool = True) -> None:
        """Applique un delta à ``name`` et propage la cascade complète."""
        if name not in self.frames:
            return
        self.history.append({
            "action": "delta", "frame": name, "delta": delta,
            "before": {k: v.value for k, v in self.frames.items()},
        })
        impacts = self._propagate(name, delta) if propagate else {}
        self.frames[name].value += delta
        self._clamp(name)
        for target, contribution in impacts.items():
            self.frames[target].value += contribution
            self._clamp(target)

    # -- contraintes ----------------------------------------------------
    def check_constraints(self) -> List[Tuple[str, float, float, str]]:
        """Renvoie ``(cadre, valeur, limite, message)`` pour chaque violation."""
        violations: List[Tuple[str, float, float, str]] = []
        for key, rule in self.constraints.items():
            if key not in self.frames:
                continue
            value = self.frames[key].value
            if "max" in rule and value > rule["max"] + _EPS:
                violations.append((key, value, rule["max"],
                                   f"⚠️ {key} = {value:.2f} (max: {rule['max']})"))
            if "min" in rule and value < rule["min"] - _EPS:
                violations.append((key, value, rule["min"],
                                   f"⚠️ {key} = {value:.2f} (min: {rule['min']})"))
        return violations

    # -- cycle de vie (dimension temps) ---------------------------------
    def lifecycle_carbon(self, horizon: Optional[float] = None,
                         baseline_annual: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Bilan carbone sur la durée de vie (corrige le biais « instantané ».

        Le moteur, par défaut, ne voit que le carbone de **construction**
        (``global.carbone``, alimenté par l'épaisseur/les matériaux). Un système
        à forte inertie est *lourd à construire mais quasi passif à l'usage* :
        évalué à t=0 il est rejeté à tort. On ajoute donc le temps.

        Indicateurs (tous dans l'échelle normalisée des cadres) :

        * ``cumulative``  = carbone_initial + carbone_annuel × horizon
        * ``per_year``    = (initial + annuel × H) / (H + 1)  — intensité amortie,
          bornée dans [0,1] : vaut l'initial à H=0, tend vers l'annuel quand H↑
          (exactement l'amortissement RE2020 du carbone construction).
        * ``payback_years`` = horizon à partir duquel le surcoût carbone de
          construction est remboursé par les économies d'usage face à un
          bâtiment de référence (``baseline_annual``).
        * ``favorable``   = verdict AU cadre temporel courant (cumulé < référence).

        Renvoie ``None`` si le modèle n'a pas la dimension carbone annuelle.
        """
        if "global.carbone" not in self.frames or "global.carbone_annuel" not in self.frames:
            return None
        h = self.horizon if horizon is None else float(horizon)
        base = self.carbone_baseline_annuel if baseline_annual is None else float(baseline_annual)
        initial = self.frames["global.carbone"].value
        annual = self.frames["global.carbone_annuel"].value
        cumulative = initial + annual * h
        per_year = cumulative / (h + 1.0)
        out: Dict[str, Any] = {
            "initial": round(initial, 3),
            "annual": round(annual, 3),
            "horizon": h,
            "baseline_annual": round(base, 3),
            "cumulative": round(cumulative, 3),
            "cumulative_baseline": round(base * h, 3),
            "per_year": round(per_year, 3),
        }
        # Temps de retour : ne se calcule que si l'usage est plus sobre que la réf.
        if base - annual > _EPS:
            out["payback_years"] = round(initial / (base - annual), 1)
        else:
            out["payback_years"] = None  # pas d'économie d'usage -> jamais remboursé
        out["favorable"] = cumulative < base * h - _EPS
        out["verdict"] = ("favorable sur cet horizon" if out["favorable"]
                          else "défavorable sur cet horizon")
        return out

    # -- scoring (pondéré, normalisé) -----------------------------------
    def compute_score(self) -> Dict[str, float]:
        """Scores pondérés normalisés. ``gap`` = total - actif (comparables)."""
        active_sum = active_w = total_sum = total_w = 0.0
        for frame in self.frames.values():
            weighted = frame.value * frame.weight
            total_sum += weighted
            total_w += frame.weight
            if frame.active:
                active_sum += weighted
                active_w += frame.weight
        active_score = active_sum / active_w if active_w else 0.0
        total_score = total_sum / total_w if total_w else 0.0
        return {
            "active_score": round(active_score, 4),
            "total_score": round(total_score, 4),
            # Correction : on compare deux moyennes normalisées (pas des sommes
            # brutes). Positif => les cadres ignorés tirent la moyenne vers le haut.
            "gap": round(total_score - active_score, 4),
        }

    # -- explication ----------------------------------------------------
    def explain(self) -> Dict[str, Any]:
        active: Dict[str, Dict[str, float]] = {}
        ignored: Dict[str, Dict[str, float]] = {}
        impacts: Dict[str, float] = {}
        for name, frame in self.frames.items():
            entry = {"value": round(frame.value, 3), "weight": frame.weight}
            (active if frame.active else ignored)[name] = entry
            # « Pression » reçue des sources actives (indicateur pour le guidage).
            pressure = 0.0
            for src, weight in self.reverse_graph.get(name, []):
                if self.frames[src].active:
                    pressure += self.frames[src].value * weight
            impacts[name] = round(pressure, 3)
        result = {
            "active": active, "ignored": ignored, "impacts": impacts,
            "score": self.compute_score(), "violations": self.check_constraints(),
        }
        lifecycle = self.lifecycle_carbon()
        if lifecycle is not None:
            result["lifecycle"] = lifecycle
        return result

    # -- scénarios ------------------------------------------------------
    def _snapshot_full(self) -> Dict[str, Tuple[float, bool]]:
        return {k: (v.value, v.active) for k, v in self.frames.items()}

    def _restore_full(self, state: Dict[str, Tuple[float, bool]]) -> None:
        for k, (value, active) in state.items():
            self.frames[k].value = value
            self.frames[k].active = active

    def run_scenario(self, scenario: Scenario) -> Dict[str, Any]:
        """Exécute un scénario sur une copie d'état (restaurée ensuite)."""
        saved = self._snapshot_full()
        for frame, delta in scenario.adjustments.items():
            self.apply_delta(frame, delta)
        result = self.explain()
        result["scenario"] = scenario.name
        result["description"] = scenario.description
        self._restore_full(saved)  # correction : restaure valeurs ET activation
        return result

    # -- suggestions intelligentes --------------------------------------
    def suggest_actions(self) -> List[Dict[str, Any]]:
        """Propose des actions priorisées (violations > impacts > optim)."""
        suggestions: List[Dict[str, Any]] = []
        state = self.explain()

        for key, value, limit, _ in self.check_constraints():
            delta = -0.1 if value > limit else 0.1
            suggestions.append({
                "type": "constraint_fix", "priority": 1,
                "message": f"Corriger {key} (actuel {value:.2f} / limite {limit})",
                "action": (key, delta),
            })

        for name, impact in state["impacts"].items():
            if name in state["ignored"] and abs(impact) > 0.25:
                suggestions.append({
                    "type": "reactivate", "priority": 2,
                    "message": f"Activer {name} (impact fort ignoré : {impact:+.2f})",
                    "action": ("activate", name),
                })

        if state["score"]["active_score"] < 0.6:
            suggestions.append({
                "type": "optimize", "priority": 3,
                "message": "Améliorer le score global (énergie/coût)",
                "action": ("systeme.energie", -0.1),
            })

        return sorted(suggestions, key=lambda s: s["priority"])

    def simulate_suggestion(self, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """Simule une suggestion sur un moteur jetable et renvoie l'état projeté."""
        temp = {k: Frame(v.value, v.active, v.weight) for k, v in self.frames.items()}
        test = Engine(temp, self.deps, self.constraints)
        action = suggestion["action"]
        if action[0] == "activate":
            test.frames[action[1]].active = True
        else:
            test.apply_delta(*action)
        return test.explain()

    # -- mémoire multi-tour ---------------------------------------------
    def snapshot(self, label: str) -> None:
        self.sessions.append({"label": label, "state": self._snapshot_full()})

    def apply_decision(self, name: str, delta: float, label: str) -> None:
        """Applique un delta puis enregistre un instantané étiqueté."""
        self.apply_delta(name, delta)
        self.snapshot(label)

    def compare(self, i: int, j: int) -> Dict[str, float]:
        """Δ des valeurs entre deux sessions enregistrées."""
        a, b = self.sessions[i]["state"], self.sessions[j]["state"]
        diff = {}
        for name in a:
            change = b[name][0] - a[name][0]
            if abs(change) > _EPS:
                diff[name] = round(change, 3)
        return diff

    # -- apprentissage des dépendances ----------------------------------
    def record_experience(self, label: str = "") -> None:
        """Mémorise un état observé (projet réel) pour l'apprentissage."""
        self.experiences.append({
            "label": label,
            "frames": {k: v.value for k, v in self.frames.items()},
        })

    def suggest_dependency_updates(self, *, threshold: float = 0.02,
                                   rate: float = 0.3) -> List[Dict[str, Any]]:
        """Propose des ajustements de poids à partir des expériences observées.

        Pour chaque dépendance, on mesure la **covariance** source/cible sur les
        états enregistrés. Si le signe observé contredit le poids actuel, ou si
        la corrélation est forte, on suggère un poids corrigé (déplacé de
        ``rate`` vers la direction observée). Heuristique v1, transparente :
        aucune mise à jour automatique, ce sont des *suggestions*.
        """
        if len(self.experiences) < 2:
            return []
        suggestions: List[Dict[str, Any]] = []
        for dep in self.deps:
            xs = [e["frames"][dep.source] for e in self.experiences
                  if dep.source in e["frames"]]
            ys = [e["frames"][dep.target] for e in self.experiences
                  if dep.target in e["frames"]]
            if len(xs) != len(ys) or len(xs) < 2:
                continue
            mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
            cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)
            if abs(cov) < threshold:
                continue
            observed_sign = 1.0 if cov > 0 else -1.0
            # Si le signe observé contredit le poids, on tire vers l'observé.
            if observed_sign != (1.0 if dep.weight >= 0 else -1.0):
                suggested = round(dep.weight + rate * (observed_sign - dep.weight), 3)
                suggestions.append({
                    "dependency": f"{dep.source}→{dep.target}",
                    "current_weight": dep.weight,
                    "observed_covariance": round(cov, 4),
                    "suggested_weight": suggested,
                    "reason": "signe observé opposé au poids actuel",
                })
        return suggestions

    # -- auto-optimisation (réparation de faisabilité) ------------------
    def total_violation(self) -> float:
        """Somme des dépassements de contraintes (0 = solution faisable)."""
        tv = 0.0
        for key, rule in self.constraints.items():
            if key not in self.frames:
                continue
            v = self.frames[key].value
            if "max" in rule:
                tv += max(0.0, v - rule["max"])
            if "min" in rule:
                tv += max(0.0, rule["min"] - v)
        return tv

    def auto_adjust(self, *, step: float = 0.05, max_iter: int = 200) -> Dict[str, Any]:
        """Ajuste les leviers pilotables pour ramener la solution dans les bornes.

        Recherche gloutonne (hill-climbing) : à chaque itération on teste un petit
        pas ± sur chaque cadre actif disposant de dépendances sortantes (un
        *levier*), et on garde le mouvement qui réduit le plus la violation
        totale. On s'arrête dès que la solution est faisable, qu'aucun mouvement
        n'améliore plus (optimum local), ou après ``max_iter`` itérations.

        ⚠️ Honnêteté : ce n'est PAS une maximisation d'un score global (volontaire
        — on n'écrase pas les compromis). C'est uniquement de la **faisabilité** :
        respecter les contraintes. Les arbitrages restants restent visibles.
        """
        # Un *levier* = cadre actif qui a des dépendances sortantes mais AUCUNE
        # entrante (une racine du graphe). On évite ainsi d'ajuster directement
        # un résultat (ex. l'énergie, qui dépend de l'isolation) : seuls les
        # vrais leviers d'entrée sont déplacés.
        candidates = [n for n, f in self.frames.items()
                      if f.active and n in self.graph and n not in self.reverse_graph]
        moves: List[Dict[str, Any]] = []
        cur = self.total_violation()
        iters = 0
        while cur > _EPS and iters < max_iter:
            best = None  # (violation, name, delta)
            for name in candidates:
                for d in (step, -step):
                    saved = self._snapshot_full()
                    hlen = len(self.history)
                    self.apply_delta(name, d)
                    nv = self.total_violation()
                    self._restore_full(saved)
                    del self.history[hlen:]
                    if best is None or nv < best[0]:
                        best = (nv, name, d)
            if best is None or best[0] >= cur - _EPS:
                break  # plus d'amélioration possible
            self.apply_delta(best[1], best[2])
            moves.append({"frame": best[1], "delta": best[2]})
            cur = best[0]
            iters += 1
        return {"iterations": iters, "violation": round(cur, 4),
                "feasible": cur <= _EPS, "moves": moves}

    # -- export ---------------------------------------------------------
    def to_json(self) -> str:
        return json.dumps({
            "frames": {k: {"value": round(v.value, 3), "active": v.active,
                           "weight": v.weight} for k, v in self.frames.items()},
            "dependencies": [{"from": d.source, "to": d.target, "weight": d.weight}
                             for d in self.deps],
            "constraints": self.constraints,
            "explain": self.explain(),
        }, indent=2, ensure_ascii=False)


def run_from_json(engine: "Engine", payload: Dict[str, Any], *,
                  auto_adjust: bool = True, step: float = 0.05) -> Dict[str, Any]:
    """Pipeline JSON -> simulation : injecte, applique les deltas, optimise, diagnostique.

    ``payload`` = sortie du traducteur ::

        {"frames": {name: {value, active, weight}}, "deltas": {name: delta},
         "context": {...}}

    Comportement : (1) injection des cadres (création si absent), (2) application
    des deltas avec propagation, (3) auto-optimisation de faisabilité (optionnelle),
    (4) diagnostic ``active/ignored/score/violations`` + suggestions.
    """
    for name, spec in (payload.get("frames") or {}).items():
        if name in engine.frames:
            frame = engine.frames[name]
            if "value" in spec:
                frame.value = max(0.0, min(1.0, float(spec["value"])))
            if "active" in spec:
                frame.active = bool(spec["active"])
            if "weight" in spec:
                frame.weight = float(spec["weight"])
        else:
            engine.frames[name] = Frame(
                value=max(0.0, min(1.0, float(spec.get("value", 0.5)))),
                active=bool(spec.get("active", True)),
                weight=float(spec.get("weight", 1.0)),
            )
    engine._build_graph()

    # cadre temporel : horizon en années (payload ou context), pour le cycle de vie
    context = payload.get("context") or {}
    horizon = payload.get("horizon", context.get("horizon"))
    if horizon is not None:
        engine.horizon = float(horizon)

    for name, delta in (payload.get("deltas") or {}).items():
        engine.apply_delta(name, float(delta))

    adjust = engine.auto_adjust(step=step) if auto_adjust else None
    state = engine.explain()
    return {
        "active": state["active"],
        "ignored": state["ignored"],
        "score": state["score"],
        "violations": [m for *_, m in state["violations"]],
        "lifecycle": state.get("lifecycle"),
        "suggestions": [s["message"] for s in engine.suggest_actions()],
        "auto_adjust": adjust,
        "context": context,
    }


# --------------------------------------------------------------------------
# Modèle BTP réaliste
# --------------------------------------------------------------------------
def create_btp_engine() -> Engine:
    frames = {
        "mur.isolation": Frame(0.6, True, 1.5),
        "mur.epaisseur": Frame(0.5, False, 0.8),
        "mur.reparabilite": Frame(0.6, False, 0.7),
        "toiture.isolation": Frame(0.7, True, 1.4),
        "toiture.cout": Frame(0.6, True, 1.0),
        "systeme.energie": Frame(0.5, True, 2.0),
        "systeme.cout": Frame(0.5, True, 1.2),
        "systeme.maintenance": Frame(0.5, False, 0.9),
        "global.surface": Frame(0.7, False, 1.0),
        "global.carbone": Frame(0.6, False, 1.8),      # carbone de CONSTRUCTION (embodied)
        "global.carbone_annuel": Frame(0.3, False, 1.0),  # carbone d'USAGE / an
    }
    deps = [
        Dependency("mur.isolation", "systeme.energie", -0.5),
        Dependency("toiture.isolation", "systeme.energie", -0.4),
        Dependency("mur.isolation", "mur.epaisseur", 0.4),
        Dependency("mur.epaisseur", "global.surface", -0.3),
        Dependency("systeme.energie", "systeme.cout", 0.3),
        Dependency("mur.reparabilite", "systeme.maintenance", -0.5),
        Dependency("mur.epaisseur", "global.carbone", 0.2),
        Dependency("toiture.isolation", "toiture.cout", 0.3),
        Dependency("systeme.cout", "global.surface", -0.1),
        Dependency("systeme.energie", "global.carbone", 0.25),
        # le carbone d'USAGE suit la consommation d'énergie (réalité métier)
        Dependency("systeme.energie", "global.carbone_annuel", 0.5),
    ]
    constraints = {
        "global.carbone": {"max": 0.65},
        "systeme.energie": {"max": 0.4},
        "toiture.cout": {"max": 0.8},
    }
    return Engine(frames, deps, constraints)


def define_scenarios() -> List[Scenario]:
    return [
        Scenario("performance_max", "Maximiser la performance énergétique",
                 {"mur.isolation": 0.3, "toiture.isolation": 0.2, "systeme.energie": -0.3}),
        Scenario("budget_min", "Minimiser les coûts",
                 {"mur.isolation": -0.2, "toiture.isolation": -0.3, "systeme.cout": -0.3}),
        Scenario("equilibre", "Équilibre performance/coût",
                 {"mur.isolation": 0.1, "toiture.isolation": 0.1, "systeme.cout": -0.1}),
        Scenario("re2020", "Conformité RE2020",
                 {"mur.isolation": 0.25, "systeme.energie": -0.35, "global.carbone": -0.1}),
    ]


# --------------------------------------------------------------------------
# Bridge ZORAN (traduction intention -> activation de cadres)
# --------------------------------------------------------------------------
def zoran_decision_bridge(user_input: str, engine: Engine) -> Dict[str, Any]:
    """ZORAN -> intention -> activation des cadres du moteur, puis explication."""
    mapping = {
        "energie": "systeme.energie",
        "énergie": "systeme.energie",
        "cout": "systeme.cout",
        "coût": "systeme.cout",
        "surface": "global.surface",
        "carbone": "global.carbone",
    }
    for frame in engine.frames.values():
        frame.active = False
    text = user_input.lower()
    for word, frame_name in mapping.items():
        if word in text and frame_name in engine.frames:
            engine.frames[frame_name].active = True
    if not any(f.active for f in engine.frames.values()):
        engine.frames["systeme.energie"].active = True  # repli
    return engine.explain()


# --------------------------------------------------------------------------
# Stress test multi-tour
# --------------------------------------------------------------------------
def stress_test(engine: Engine, verbose: bool = True) -> Dict[str, Any]:
    def log(*a):
        if verbose:
            print(*a)

    log("\n💣 STRESS TEST MULTI-TOUR")
    engine.snapshot("initial")
    engine.apply_decision("systeme.energie", -0.3, "optim energie")     # tour 1
    engine.apply_decision("systeme.cout", -0.2, "reduction cout")        # tour 2
    engine.frames["global.carbone"].active = True                        # tour 3
    engine.snapshot("carbone activé")
    engine.apply_decision("mur.isolation", 0.3, "boost isolation")       # tour 4
    engine.apply_decision("systeme.energie", 0.2, "corrige energie")     # tour 5

    state = engine.explain()
    log("\n📊 FINAL STATE")
    log("Score:", state["score"])
    log("Violations:", [m for *_, m in state["violations"]])
    log("\n🔄 EVOLUTION")
    for i, s in enumerate(engine.sessions):
        log(f"{i}: {s['label']}")
    log("\nΔ initial → final")
    log(engine.compare(0, len(engine.sessions) - 1))
    return state


# --------------------------------------------------------------------------
# Démo complète
# --------------------------------------------------------------------------
def run_full_test() -> Engine:
    print("=" * 60)
    print("🚀 MOTEUR BTP v2 — TEST COMPLET")
    print("=" * 60)

    engine = create_btp_engine()
    print("\n📊 ÉTAT INITIAL")
    s = engine.explain()["score"]
    print(f"  actif={s['active_score']}  total={s['total_score']}  gap={s['gap']}")

    print("\n🔧 PROPAGATION CASCADE : mur.isolation +0.3")
    engine.apply_delta("mur.isolation", 0.3)
    st = engine.explain()
    for name, data in st["active"].items():
        print(f"  ✔ {name}: {data['value']}")
    print("  Ignorés (impacts visibles) :")
    for name, data in st["ignored"].items():
        print(f"  ⚪ {name}: {data['value']} (pression: {st['impacts'][name]:+})")

    print("\n🎯 SCÉNARIOS")
    engine = create_btp_engine()
    for sc in define_scenarios():
        r = engine.run_scenario(sc)
        viol = [m for *_, m in r["violations"]]
        verdict = "✅ conforme" if not viol else " / ".join(viol)
        print(f"  • {sc.name:16} score={r['score']['active_score']:.3f}  {verdict}")

    print("\n💡 SUGGESTIONS")
    engine = create_btp_engine()
    engine.apply_delta("systeme.energie", 0.2)  # provoque une violation
    for sug in engine.suggest_actions():
        print(f"  👉 [{sug['priority']}] {sug['message']}")

    print("\n🔗 BRIDGE ZORAN : « je veux optimiser énergie et coût »")
    engine = create_btp_engine()
    bridged = zoran_decision_bridge("je veux optimiser énergie et coût", engine)
    print(f"  actifs : {list(bridged['active'])}")

    engine = create_btp_engine()
    stress_test(engine)
    return engine


if __name__ == "__main__":
    run_full_test()
