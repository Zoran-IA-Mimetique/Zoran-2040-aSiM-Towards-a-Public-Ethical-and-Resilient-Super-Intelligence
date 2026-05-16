# COGNITIVE_VELOCITY_ENGINE — Spec

**Mission**: `ZORAN_DYNAMIC_VELOCITY_HIERARCHY_GRAPH_20260516`
**Implémentation**: `tools/cognitive_velocity_engine.py`
**Rapport runtime**: `audit/COGNITIVE_VELOCITY_REPORT.json`

## Principe

La verticalité du graphe ne reflète plus le prestige structurel (rank
théorique, profondeur d'arbre), mais la **vélocité cognitive soutenable** :
combien de signal utile une loi délivre par unité de coût propagé.

`_fy_velocity` remplace `_fy_structural`. L'axe Y est désormais ordonné par
`velocity_score ∈ [0,1]`.

## Scores injectés (8 par nœud)

| Score                  | Formule                                                                |
|------------------------|------------------------------------------------------------------------|
| `runtime_efficiency`   | `impact / cost`, normalisé sur 8                                       |
| `propagation_weight`   | `1 − propagation_cost` (inverse : haut = léger)                        |
| `temporal_survival`    | `temporal_resilience_score` ou `survival_score` ou 0.5                 |
| `implicit_cost`        | `implicit_constraint_count / 20`                                       |
| `runtime_value`        | `0.40·rt_eff + 0.30·llm + 0.30·survie − 0.20·impl_cost + 0.20` (offset) |
| `velocity_score`       | `0.30·rt_eff + 0.25·frug + 0.20·survie + 0.10·prop_w − 0.10·impl − 0.05·collapse + 0.10` |
| `dynamic_rank_velocity`| rang descendant par `velocity_score`                                   |
| `_fy_velocity`         | `−200 + velocity_score · 400` (carte Y ∈ [−200, +200])                 |

## Comportement attendu (mission)

| Loi      | rank      | velocity | _fy     | Observation                                  |
|----------|-----------|----------|---------|----------------------------------------------|
| GHUC-001 | #235/241  | 0.321    | −72     | Lourde en propagation : descend dans l'arbre |
| WP11-008 | #50       | 0.671    | +68     | Soutenable + frugale : remonte au sommet     |
| WP12-009 | (rank var)| variable | variable| Marginale runtime                            |

L'hypothèse mission est confirmée : la hiérarchie **structurelle** et
la hiérarchie **vélocité** ne coïncident pas — certaines lois fondatrices
sont trop coûteuses pour rester au sommet à long terme.

## Garde-fous

- Offset `+0.10` sur `velocity_score` pour éviter une distribution écrasée vers 0
- Clamp `[0,1]` strict sur tous les scores
- `_fy_structural` préservé pour audit (`n._fy_structural`)
- Rétrocompatibilité : `topological_weight` non modifié, nouveau champ
  `topological_weight_velocity` ajouté à côté

## Vérification empirique

Smoke test `tools/smoke_test.mjs` : capture `app/preview-live.png` avec panneau
ouvert sur GHUC-001 — le rang vélocité est lisible dans le panneau via la
section *Soutenabilité runtime*.
