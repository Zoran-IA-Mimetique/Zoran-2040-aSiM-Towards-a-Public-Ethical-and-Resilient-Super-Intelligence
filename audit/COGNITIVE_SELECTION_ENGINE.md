# COGNITIVE_SELECTION_ENGINE — Spec

**Mission**: `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Implémentation**: `tools/cognitive_selection_engine.py`
**Rapport runtime**: `audit/COGNITIVE_SELECTION_REPORT.json`

## Principe fondamental

> Un bon runtime n'utilise PAS toutes les lois disponibles, mais le
> **PLUS PETIT SOUS-GRAPHE SUFFISANT** pour atteindre une précision
> cohérente admissible.

Le moteur maximise :
```
Gain_Cognitif
─────────────────────────────────
Coût_Propagation + Charge_Runtime
```

## Pipeline runtime (obligatoire)

```
Sujet utilisateur
  ↓ SubjectBoundaryEngine     ← filtre sujet (déjà existant)
  ↓ Law Relevance Ranking     ← topic_relevance
  ↓ Frame Relevance Ranking   ← frame_dependency_cost
  ↓ Propagation Cost Estimation
  ↓ Runtime Budget Estimation
  ↓ Threshold Filtering       ← PRECISION_THRESHOLD_ENGINE
  ↓ Optimal Cognitive Set     ← arrêt sur gain marginal < ε
  ↓ Oracle Validation
  ↓ Runtime ZenRuntime
```

## 12 scores injectés par loi

| Score                            | Formule sommaire |
|----------------------------------|------------------|
| `topic_relevance`                | intersection lexicale sujet ∩ (title+desc+tags+domains) |
| `information_gain`               | `0.40·impact + 0.40·llm − 0.20·implicit + 0.10` |
| `frame_dependency_cost`          | `dependency_load` normalisé |
| `cognitive_efficiency`           | `IG / (propag_cost + frame_cost) / 3` |
| `minimum_precision_contribution` | bonus si attractor / superior / S_local élevé |
| `runtime_priority`               | composite pondéré priorité |
| `runtime_precision_gain`         | gain de précision attendu |
| `runtime_cost_ratio`             | `0.50·propag + 0.50·frame_cost` |
| `propagation_efficiency`         | gain − 0.50·coût + offset |
| `marginal_information_gain`      | IG × `1/(1+0.05·n_selected)` (décroît) |
| `threshold_admissibility`        | booléen — `selection_priority ≥ 0.45` |
| `selection_priority`             | score final composite (35% prio + 25% propag + 20% sujet + 20% précis) |

## PRECISION_THRESHOLD_ENGINE

Fonction `select_cognitive_set(topic, budget, precision_floor)` :

1. Calcule `selection_priority` pour chaque loi
2. Trie descendant
3. Ajoute lois une par une jusqu'à :
   - `marginal_information_gain < 0.05` ET `len(selected) ≥ 5` → **STOP**
   - `len(selected) >= budget` → **STOP**

## Résultats runtime — 5 sujets testés

| Sujet                              | Sélectionnées / Total | Précision cumulée |
|------------------------------------|------------------------|-------------------|
| `propagation runtime`              | 20 / 241               | 1.00              |
| `boundary subject contextualisation` | 20 / 241             | 1.00              |
| `frugalité cognitive runtime`      | 20 / 241               | 1.00              |
| `cohérence temporelle`             | 20 / 241               | 1.00              |
| `loi supérieure attracteur`        | 20 / 241               | 1.00              |

**241 lois disponibles** → seules **20 nécessaires** par sujet. Réduction
**91.7 %** du sous-graphe runtime tout en atteignant la précision plancher.

## Statistiques globales

| Métrique                          | Valeur          |
|------------------------------------|-----------------|
| Avg `selection_priority`           | 0.440           |
| Avg `cognitive_efficiency`         | 0.502           |
| Admissibles seuil 0.45             | 101 / 241 (42 %) |
| Rejetés sous seuil                 | 140 / 241 (58 %) |

## Affichage UI

Bloc `panel.js#selectionBlock` :
- Priorité sélection (haute priorité / admissible / marginal / rejeté seuil) coloré
- Sujet pertinence + gain info
- Cognitive efficiency + contribution précision
- Coût runtime + propag. efficiency
