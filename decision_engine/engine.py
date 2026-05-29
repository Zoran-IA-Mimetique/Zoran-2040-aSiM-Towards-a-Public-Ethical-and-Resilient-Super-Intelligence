"""Moteur de décision : activation des cadres, propagation, exploration.

``DecisionEngine`` enveloppe un :class:`~decision_engine.models.System` et
expose les opérations de haut niveau de la mission :

* activer / désactiver un cadre, changer sa priorité ou sa valeur ;
* propager le déplacement d'un curseur et lire les conséquences ;
* appliquer des objectifs utilisateur (« peu d'énergie et peu de coût ») ;
* explorer l'espace des solutions et proposer des alternatives ;
* produire une décision complète au format de sortie attendu.

Le moteur est totalement autonome : aucune dépendance à ZORAN ni à un LLM.
Il pourra être branché plus tard dans ZORAN sans rien casser.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from . import propagation, scoring
from .models import Frame, System


class DecisionEngine:
    """Moteur de raisonnement sous contraintes par cadres et curseurs."""

    def __init__(self, system: System) -> None:
        self.system = system

    # ------------------------------------------------------------------
    # 3.1 — Activation des cadres (visible ≠ actif)
    # ------------------------------------------------------------------
    def activate(self, name: str) -> "DecisionEngine":
        self.system.get(name).active = True
        return self

    def deactivate(self, name: str) -> "DecisionEngine":
        self.system.get(name).active = False
        return self

    def set_priority(self, name: str, priority: float) -> "DecisionEngine":
        if not 0.0 <= priority <= 1.0:
            raise ValueError("la priorité doit être dans [0, 1]")
        self.system.get(name).priority = priority
        return self

    def set_value(self, name: str, value: float) -> "DecisionEngine":
        """Positionne directement un curseur (borné à ses ``bounds``)."""
        frame = self.system.get(name)
        frame.value = frame.clamp(value)
        return self

    # ------------------------------------------------------------------
    # 3.2 / 3.3 — Propagation des effets et calcul des conséquences
    # ------------------------------------------------------------------
    def propagate_delta(self, frame_name: str, delta: float) -> Dict[str, Any]:
        """Propage un ``delta`` et renvoie les impacts (actifs vs ignorés).

        N.B. : cette méthode *calcule* les conséquences sans modifier l'état du
        système. Pour appliquer réellement le mouvement, voir :meth:`move_cursor`.
        """
        impacts = propagation.propagate_delta(self.system, frame_name, delta)
        active, ignored = propagation.split_impacts(self.system, impacts)
        return {"impacts": active, "ignored_impacts": ignored}

    def move_cursor(self, frame_name: str, delta: float) -> Dict[str, Any]:
        """Applique un mouvement de curseur : déplace la source ET propage.

        Les valeurs des cadres atteints sont mises à jour (clampées) puis on
        renvoie les impacts calculés. C'est l'opération « écrivante » du moteur.
        """
        result = self.propagate_delta(frame_name, delta)

        # On bouge d'abord la source...
        source = self.system.get(frame_name)
        source.value = source.clamp(source.value + delta)
        # ... puis on applique chaque impact propagé.
        for name, impact in {**result["impacts"], **result["ignored_impacts"]}.items():
            frame = self.system.get(name)
            frame.value = frame.clamp(frame.value + impact)
        return result

    # ------------------------------------------------------------------
    # 4 — Gestion des objectifs utilisateur
    # ------------------------------------------------------------------
    def apply_objectives(self, objectives: Dict[str, Any]) -> "DecisionEngine":
        """Applique des objectifs ``{cadre: valeur_cible | 'ignored'}``.

        * une valeur numérique positionne le curseur et active le cadre ;
        * la chaîne ``"ignored"`` (ou ``None``) désactive le cadre : il devient
          passif (surveillé mais non bloquant) ;
        * les cadres absents du dictionnaire ne sont pas modifiés.
        """
        for name, target in objectives.items():
            frame = self.system.get(name)
            if target is None or target == "ignored":
                frame.active = False
                continue
            frame.active = True
            frame.value = frame.clamp(float(target))
        return self

    # ------------------------------------------------------------------
    # 5 — Scoring par cadre (jamais de score global unique)
    # ------------------------------------------------------------------
    def scores(self, *, include_passive: bool = True) -> Dict[str, float]:
        return scoring.score(self.system, include_passive=include_passive)

    def warnings(self, *, threshold: float = 0.25) -> Dict[str, float]:
        return scoring.warnings(self.system, threshold=threshold)

    # ------------------------------------------------------------------
    # 3.5 — Mode exploration / alternatives
    # ------------------------------------------------------------------
    def explore(self, frame_name: str, deltas: List[float]) -> List[Dict[str, Any]]:
        """Observe l'effet de plusieurs déplacements *sans* modifier l'état.

        Pour chaque ``delta`` proposé, renvoie le delta, les impacts et les
        scores par cadre simulés (la projection est faite sur une copie).
        """
        results: List[Dict[str, Any]] = []
        for delta in deltas:
            sandbox = DecisionEngine(System.from_dict(self.system.to_dict()))
            impacts = sandbox.move_cursor(frame_name, delta)
            results.append(
                {
                    "delta": delta,
                    "impacts": impacts["impacts"],
                    "ignored_impacts": impacts["ignored_impacts"],
                    "scores": sandbox.scores(),
                }
            )
        return results

    def alternatives(
        self,
        *,
        steps: Optional[List[float]] = None,
    ) -> List[Dict[str, Any]]:
        """Propose des alternatives en nudgeant chaque cadre actif.

        Pour chaque cadre actif, on simule un petit pas vers sa direction
        désirable et on renvoie la décision projetée. Utile pour montrer les
        compromis voisins sans engager l'état courant.
        """
        steps = steps or [0.1, -0.1]
        alts: List[Dict[str, Any]] = []
        for frame in self.system.active_frames():
            for step in steps:
                sandbox = DecisionEngine(System.from_dict(self.system.to_dict()))
                sandbox.move_cursor(frame.name, step)
                alts.append(
                    {
                        "move": {"frame": frame.name, "delta": step},
                        "scores": sandbox.scores(include_passive=False),
                        "values": {
                            f.name: f.value for f in sandbox.system.frames
                        },
                    }
                )
        return alts

    # ------------------------------------------------------------------
    # 7 — Format de sortie complet
    # ------------------------------------------------------------------
    def decide(self, *, with_alternatives: bool = True) -> Dict[str, Any]:
        """Produit la décision complète au format attendu par la mission.

        ::

            {
              "decision":        {cadre: valeur, ...},   # cadres actifs
              "scores":          {cadre: désirabilité},  # par dimension
              "impacts":         {cadre: valeur},        # actifs, surveillés
              "ignored_impacts": {cadre: valeur},        # passifs, non bloquants
              "warnings":        {cadre: désirabilité},  # alertes monitoring
              "alternatives":    [...],                  # compromis voisins
            }
        """
        decision = {f.name: f.value for f in self.system.active_frames()}
        monitored = {f.name: f.value for f in self.system.passive_frames()}
        out: Dict[str, Any] = {
            "decision": decision,
            "scores": self.scores(include_passive=False),
            "impacts": decision,
            "ignored_impacts": monitored,
            "warnings": self.warnings(),
        }
        if with_alternatives:
            out["alternatives"] = self.alternatives()
        return out

    # ------------------------------------------------------------------
    # Constructeurs pratiques
    # ------------------------------------------------------------------
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionEngine":
        return cls(System.from_dict(data))

    def to_dict(self) -> Dict[str, Any]:
        return self.system.to_dict()
