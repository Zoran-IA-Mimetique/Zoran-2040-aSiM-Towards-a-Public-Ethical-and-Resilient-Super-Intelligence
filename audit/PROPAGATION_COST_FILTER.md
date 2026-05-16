# PROPAGATION_COST_FILTER — Spec

**Mission** : `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/NOISE_MINIMIZATION_ENGINE.md`
**Spec liées** : `audit/DEPENDENCY_PROPAGATION_MODEL.md`, `audit/PROPAGATION_COST_RANKING.md`
**Rapport** : `audit/NOISE_CONTRIBUTION_REPORT.json`

## Rôle de la propagation comme coût primaire

Dans la formule `noise_contribution`, `propagation_cost` est pondéré
à **0.40** — le coefficient le plus élevé. Raison : c'est la seule
composante du coût qui **se cascade** sur d'autres lois. Un coût
implicite est local ; une dépendance est statique ; une propagation
multiplie la charge runtime à chaque évaluation descendante.

```
contribution_propag = 0.40 · propagation_cost(L)
contribution_implic = 0.30 · implicit_constraint_count(L) / 20
contribution_depend = 0.20 · dependency_load(L)
```

Pour une loi avec `propagation_cost = 0.90`, la propagation contribue
seule **0.36** au bruit, soit déjà plus que le seuil `S/N = 0.50`
ne tolère.

## Filtrage par seuil — la propagation passe AVANT le S/N

Le moteur ne pré-filtre pas explicitement par `propagation_cost > θ`,
mais le critère composite `keep_runtime` y aboutit indirectement :

1. `noise_contribution` ≥ 0.40 → `S/N < 0.50` quasi-garanti même pour
   `runtime_gain` modéré.
2. `frugality_ratio = gain / (propag + noise) + 0.10` → décroît avec
   `propag`. Pour `propag = 0.90` et `gain = 0.30`, fr ≈ 0.30 — à
   peine le seuil.
3. Si l'une des deux conditions tombe sous le seuil, `keep_runtime`
   tombe à `false` automatiquement.

Effet observé : **chaque loi du top 10 contributeurs de bruit a
`keep_runtime = false`**. Aucune exception.

## Rejet S_local élevée mais propagation rédhibitoire

Cas typique : `WP12-001`.

| Score                | Valeur |
|----------------------|--------|
| `precision_gain`     | 0.902  (excellent — top corpus) |
| `S_local` (implicite)| élevée (loi-racine WP12) |
| `runtime_gain`       | +0.007 (positif mais nul) |
| `noise_contribution` | 0.585  |
| `signal_to_noise`    | 0.013  |
| `frugality_ratio`    | 0.106  |
| → `keep_runtime`     | **false** |

WP12-001 est intrinsèquement précise (`precision_gain = 0.902`) mais
sa propagation la rend runtime-inefficiente : le gain net est presque
nul, le S/N s'effondre, et le filtre la rejette malgré son potentiel
local. C'est le comportement souhaité : **précision locale élevée
ne suffit pas**. Seul le ratio précision / coût propagé compte —
mesuré explicitement par `precision_per_cost`.

## Conséquence : 39 % de réduction sans perte de précision

| Métrique                                       | Avant filtre | Après filtre |
|------------------------------------------------|--------------|--------------|
| Nb lois                                        | 241          | 147 (−39 %)  |
| Avg `propagation_cost` du sous-ensemble retenu | mixte        | nettement réduit |
| Précision plancher cumulée (cf. PRECISION_THRESHOLD) | 1.00      | 1.00 (inchangée) |

Le filtre propagation joue donc le rôle d'**enveloppe budgétaire
implicite** : les lois cascadant beaucoup pour peu de gain sortent
du runtime ; leur précision locale est récupérée via les
descendantes (instances de famille — WP12-009 → WP12-036, etc.)
qui héritent du potentiel sans payer le coût racine.
