"""Moteur de décision par cadres et curseurs (module autonome).

Module indépendant de raisonnement sous contraintes :

* **cadres**      = dimensions (curseurs) ;
* **contraintes** = bornes + dépendances ;
* **solution**    = compromis calculé, exposé par dimension.

Conçu pour être compréhensible, sans dépendance LLM obligatoire, et branchable
plus tard dans ZORAN sans rien casser.

Exemple minimal
---------------
>>> from decision_engine import DecisionEngine
>>> from decision_engine.examples.moteur import build_system
>>> engine = DecisionEngine(build_system())
>>> result = engine.decide()
>>> sorted(result["scores"])  # un score par dimension
['bruit', 'cout', 'energie', 'taille']
"""

from .engine import DecisionEngine
from .models import Dependency, Frame, System, MAXIMIZE, MINIMIZE
from . import propagation, scoring

__all__ = [
    "DecisionEngine",
    "Frame",
    "Dependency",
    "System",
    "MAXIMIZE",
    "MINIMIZE",
    "propagation",
    "scoring",
]

__version__ = "0.1.0"
