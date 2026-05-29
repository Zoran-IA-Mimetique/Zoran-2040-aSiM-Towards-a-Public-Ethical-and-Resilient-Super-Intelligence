# Moteur de décision — cadres & curseurs

Module **autonome** de raisonnement sous contraintes. Aucune dépendance à
ZORAN ni à un LLM : il tourne seul et sera branchable plus tard dans ZORAN sans
rien casser.

## Idée

- **cadres** = dimensions (curseurs) ;
- **contraintes** = bornes + dépendances ;
- **solution** = compromis calculé, exposé **par dimension** (jamais un score
  global unique).

## Architecture

```
decision_engine/
├── models.py        # Frame, Dependency, System (dataclasses sérialisables)
├── propagation.py   # propagation des effets dans le graphe de dépendances
├── scoring.py       # score par cadre + avertissements de monitoring
├── engine.py        # DecisionEngine : activation, propagation, exploration
├── api.py           # API FastAPI optionnelle (POST /simulate)
└── examples/
    └── moteur.py    # cas de test minimal : « construire un moteur »
```

## Concepts

**Cadre (Frame)**

```json
{ "name": "energie", "type": "minimize", "active": true,
  "priority": 0.8, "value": 0.5, "bounds": [0, 1] }
```

**Dépendance (Dependency)** — coefficient *signé* :
`delta_target = effect * delta_source`.

```json
{ "from": "energie", "to": "taille", "effect": -0.4 }
```

Un effet **négatif** modélise un compromis (énergie ↓ → taille ↑) ; un effet
**positif** un couplage qui évolue dans le même sens.

## Utilisation

```python
from decision_engine import DecisionEngine
from decision_engine.examples.moteur import build_system

engine = DecisionEngine(build_system())

# Objectif : « peu d'énergie et peu de coût » ; taille/bruit surveillés.
engine.apply_objectives({"energie": 0.2, "cout": 0.3,
                         "taille": "ignored", "bruit": "ignored"})

# Conséquences d'un déplacement de curseur (sans muter l'état).
print(engine.propagate_delta("energie", -0.3))

# Décision complète : decision / scores / impacts / ignored_impacts /
# warnings / alternatives.
print(engine.decide())
```

## CLI

```bash
python run_engine.py                  # scénario de démo
python run_engine.py --system sys.json
python run_engine.py --no-alternatives
```

## API (optionnelle)

```bash
pip install fastapi uvicorn
uvicorn decision_engine.api:app --reload
# POST /simulate  { "system": {...}, "objectives": {...} }
```

## Tests

```bash
python -m pytest tests/ -q
```

## Principes de conception

- visible ≠ actif : un cadre inactif reste calculé (monitoring) mais ne bloque
  pas la décision ;
- pas de score global unique : on expose les tensions, on ne les masque pas ;
- code simple et lisible, aucune optimisation prématurée.
