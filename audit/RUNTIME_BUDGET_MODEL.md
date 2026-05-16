# RUNTIME_BUDGET_MODEL — Spec

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Implémentation** : `tools/cognitive_selection_engine.py`
**Rapport runtime** : `audit/COGNITIVE_SELECTION_REPORT.json`

## Principe

Le budget runtime est un **plafond dur** sur la taille du sous-graphe
chargé pour un sujet donné. Il est imposé **avant** la condition
`marginal_gain < 0.05`, garantissant un coût borné même sur des sujets
où le gain marginal reste artificiellement élevé (corpus saturé,
sujet ultra-large, exploits adverses).

Valeur par défaut : `budget = 20` lois pour un corpus de `241`.
Ratio runtime : `20/241 = 8.3 %` du graphe maximum chargé.

## Formule `runtime_cost_ratio`

```
runtime_cost_ratio(n) = 0.50·propagation_cost(n) + 0.50·frame_dependency_cost(n)
                      ∈ [0, 1]
```

Les deux termes ont **poids égal** : aucune des deux pressions
(propagation graphe vs cadres requis) ne domine l'autre. Un coût
runtime élevé indique :
- propagation longue (chaîne d'effets sur de nombreux voisins), OU
- charge de dépendance forte (cadres `frames.intermediate` lourds)

## Trade-off gain vs coût — courbe empirique

Pour le sujet `propagation runtime` (extrait du rapport) :

| Rang | Loi       | sel_prio | marginal_gain | cumulative |
|------|-----------|----------|---------------|------------|
| 1    | PAL-012   | 0.428    | 0.449         | 0.449      |
| 2    | PAL-008   | 0.399    | 0.432         | 0.881      |
| 3    | WP11-014  | 0.397    | 0.562         | 1.000      |
| 4    | WP12-021  | 0.386    | 0.537         | 1.000      |
| 10   | WP12-040  | 0.351    | 0.429         | 1.000      |
| 20   | SDE-021   | 0.330    | 0.309         | 1.000      |

La précision cumulée sature à `1.00` dès le rang 3. Les rangs 4→20
ajoutent **redondance positive** (résilience aux ablations) sans
augmenter la précision mesurée — d'où la nécessité du plafond budget
pour ne pas continuer à charger gratuitement.

## Trois régimes de budget

| Budget | Régime          | Usage                                  |
|--------|-----------------|----------------------------------------|
| 5      | Sprint          | démo, hot-path, latence < 10ms         |
| 20     | **Standard**    | Q&A runtime, exploration interactive    |
| 50     | Audit étendu    | review, validation croisée, batch nuit |

Au-delà de `50`, le ratio gain/coût chute sous le seuil de pertinence :
on revient au régime « charger tout » contre lequel la mission entière
a été conçue.

## Enforcement

Le plafond est appliqué dans la boucle de `select_cognitive_set()`
**avant** toute évaluation de gain marginal :

```python
if len(selected) >= budget:
    break
```

Cela garantit qu'aucune voie d'évaluation (sujet pathologique, scores
manipulés, corpus enflé) ne peut faire dépasser le coût runtime
imposé par le budget appelant.
