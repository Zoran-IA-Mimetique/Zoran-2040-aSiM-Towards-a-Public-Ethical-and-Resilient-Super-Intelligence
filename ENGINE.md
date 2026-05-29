# Moteur de décision « cadres & curseurs » — vue d'ensemble

Moteur **autonome** de raisonnement sous contraintes (aucune dépendance LLM ni
ZORAN), conçu pour rendre **visibles les compromis** d'une décision :

- **cadres** = dimensions (curseurs) ;
- **contraintes** = bornes + dépendances + seuils bloquants (type RE2020) ;
- **décision** = propagation des effets, exposée **par dimension**.

> On ne donne pas une réponse : on montre les **conséquences** des choix.

## Couches du dépôt

Le moteur existe en trois niveaux complémentaires — du plus simple au plus complet.

| Couche | Fichier(s) | Quand l'utiliser |
|---|---|---|
| **Jouet pédagogique** | `decision_engine_min.py` | comprendre le principe en 30 s (curseurs, propagation 1 niveau, actifs/passifs) |
| **Cas métier RE2020** | `re2020.py` | démo concrète à 4 curseurs (énergie/coût/surface/carbone) + contrainte bloquante |
| **Moteur BTP v2** | `btp_engine.py` | moteur complet : cascade, scoring, scénarios, suggestions, mémoire, non-linéaire, apprentissage |
| **Noyau réutilisable** | `decision_engine/` (package) | API stable : propagation chaînée, scoring par cadre, alternatives, FastAPI |
| **Traducteur idée→JSON** | `translator.py` | idée libre → structure JSON (déterministe ; prompt LLM optionnel) |
| **Pipeline JSON→sim** | `btp_engine.run_from_json` | injecte, applique, **auto-optimise (faisabilité)**, diagnostique |
| **Dataset + apprentissage** | `data/projects.jsonl` + `dataset.py` | 10 projets BTP → ajustement des dépendances |
| **Bridge ZORAN** | `zoran_bridge.py` | fusion mémoire ↔ moteur (couplage faible) |
| **UI à curseurs + idée** | `webapp.py`, `serve.py`, `ui/` | piloter par curseurs OU par idée libre |

### Pipeline « idée → décision » (LLM = structure, moteur = vérité)

```
idée libre ──translator──▶ JSON {frames, deltas, context} ──run_from_json──▶ diagnostic
                (structure)                                   (arbitre : propage,
                                                               auto-optimise, valide)
```

`python translator.py` exécute l'exemple complet. L'**auto-optimisation**
(`Engine.auto_adjust`) ne maximise PAS un score global (volontaire) : elle
ajuste les *leviers d'entrée* (racines du graphe) pour ramener la solution dans
les contraintes (faisabilité RE2020), et dit si elle y parvient.

### Dimension TEMPS — carbone sur cycle de vie

Le carbone de construction (`global.carbone`, instantané) reste une contrainte
RE2020 dure. Par-dessus, `Engine.lifecycle_carbon(horizon)` ajoute le temps :

* `global.carbone_annuel` = carbone d'**usage** par an (suit l'énergie).
* `horizon` = cadre temporel en **années** (paramètre du moteur, pas un cadre `[0,1]`).
* `per_year = (initial + annuel × H) / (H + 1)` — intensité amortie, bornée [0,1]
  (amortissement RE2020 du carbone construction).
* `payback_years` = temps de retour carbone face à un bâtiment de référence.
* `favorable` = verdict **au cadre temporel courant**.

Un système lourd à construire mais passif à l'usage est *défavorable en court
terme, favorable en long terme* : **changer l'horizon change la décision** — la
philosophie des cadres appliquée au temps. Curseur « Horizon » dans l'UI.

### Dimension ÉCONOMIQUE — coût total & ROI

Miroir économique du carbone. `Engine.lifecycle_cost(horizon, discount_rate)` :

* `global.cout_initial` = investissement (CAPEX), `global.cout_annuel` = exploitation/an (OPEX, suit l'énergie).
* `total = CAPEX + OPEX × facteur d'annuité`, **actualisé** si `discount_rate`>0
  (valeur temps de l'argent ; 0 = coût total brut).
* `payback_years` (retour sur investissement) + `roi` (économies / investissement).
* `favorable` = moins cher que le bâtiment de référence, à cet horizon.

Comme le carbone : *non rentable en court terme, rentable en long terme*.
Sélecteur de **taux d'actualisation** dans l'UI.

### Dimension FIABILITÉ — sensibilité à l'exécution

Les calculs cycle de vie ci-dessus sont le scénario **optimiste** (le système
délivre 100 % de sa performance 30 ans). `Engine.robustness()` confronte cet
optimisme à la réalité via `systeme.fiabilite` :

```
usage_réel/an = fiabilité × idéal + (1 − fiabilité) × (conventionnel + maintenance)
```

Un système en panne retombe au niveau conventionnel **plus** une pénalité de
maintenance — il peut devenir *pire* qu'un bâtiment simple. `robustness()` donne :

* `optimiste_favorable` vs `realiste_favorable` (carbone **et** coût) ;
* `break_even_reliability` = **fiabilité de seuil** sous laquelle l'avantage
  disparaît ;
* `robuste` = l'avantage tient-il au niveau de fiabilité réel ?

Verdict honnête : *« bonne idée d'ingénierie tant que la fiabilité reste > seuil »*
— pas une boîte noire qui dit juste « c'est bon ». Curseur « Fiabilité » dans l'UI.

## Architecture (ZORAN full merge)

```
   utilisateur / intention
            │
            ▼
   ┌─────────────────┐      mémoire (list[dict])      ┌──────────────────┐
   │      ZORAN       │ ───────────────────────────▶  │   zoran_bridge   │
   │ mémoire+contexte │ ◀───────  trace décision  ───  │   (traducteur)   │
   └─────────────────┘                                 └────────┬─────────┘
                                                                │ active les cadres
                                                                ▼
                                                       ┌──────────────────┐
                                                       │   btp_engine     │
                                                       │ propagation +     │
                                                       │ contraintes +     │
                                                       │ scoring + suggest │
                                                       └──────────────────┘
```

Principe clé : **ZORAN ne modifie jamais le moteur directement**. Le bridge
traduit l'intention en activation de cadres, exécute le moteur, et réinjecte une
trace de décision dans la mémoire.

## Concepts transverses

- **visible ≠ actif** : un cadre désactivé reste *calculé* (monitoring) mais ne
  bloque pas la décision ; ses impacts sont rangés en `ignored_impacts`.
- **propagation** : `delta_cible = poids · réponse(delta_source)`, composée le
  long des chemins. Réponse linéaire par défaut (`gamma=1`), non-linéaire
  optionnelle (`gamma>1`, *atténuante* dans `[0,1]`). Cascade multi-niveau,
  anti-cycle, chemins multiples additionnés.
- **contraintes bloquantes** : un cadre actif qui dépasse son seuil rend la
  solution **non conforme** (ex. carbone > 0.65 → rejet RE2020).
- **scoring** : le package `decision_engine/` expose un score **par cadre**
  (pas de score global, pour ne pas masquer les tensions) ; `btp_engine` ajoute
  un score global pondéré **en complément** (le détail par cadre reste exposé).

## Démarrage rapide

```bash
# 1. version jouet
python decision_engine_min.py

# 2. cas RE2020 (scénario valide + scénario bloquant)
python re2020.py

# 3. moteur BTP v2 complet (cascade, scénarios, suggestions, bridge, stress test)
python btp_engine.py

# 4. bridge ZORAN
python zoran_bridge.py

# 5. noyau réutilisable (CLI)
python run_engine.py
```

### UI à curseurs (optionnelle — nécessite FastAPI)

```bash
pip install fastapi uvicorn
uvicorn webapp:app --reload
# ouvrir http://127.0.0.1:8000/
```

## Tests

```bash
python -m pytest tests/ -q     # 42 tests
```

| Fichier de test | Couvre |
|---|---|
| `tests/test_engine.py` | noyau `decision_engine/` (modèles, propagation, scoring) |
| `tests/test_re2020.py` | cas RE2020 (valide / bloquant) |
| `tests/test_btp_engine.py` | moteur v2 (cascade, diamant, anti-cycle, scénarios) |
| `tests/test_advanced.py` | non-linéaire, apprentissage, bridge ZORAN, UI |

## Conception

- code simple et lisible, **aucune optimisation prématurée** ;
- aucune dépendance obligatoire (FastAPI seulement pour l'UI) ;
- chaque couche est branchable indépendamment dans ZORAN.
