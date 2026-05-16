# RUNTIME_NOISE_MODEL — Spec

**Mission** : `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/NOISE_MINIMIZATION_ENGINE.md`
**Spec liées** : `audit/DEPENDENCY_PROPAGATION_MODEL.md`, `audit/PROPAGATION_COST_FILTER.md`
**Rapport** : `audit/NOISE_CONTRIBUTION_REPORT.json`

## Formule canonique

```
noise_contribution(L) = clip₀₋₁(
      0.40 · propagation_cost(L)
    + 0.30 · implicit_constraint_count(L) / 20
    + 0.20 · dependency_load(L)
    − 0.30 · runtime_impact_score(L)
    + 0.30
)
```

- **+0.30** : offset constant garantissant que le bruit reste positif
  même quand l'utilité runtime est élevée — toute loi a un coût
  irréductible d'évaluation.
- **−0.30·util** : la seule composante soustractive ; l'utilité
  runtime démontrée *réduit* le bruit attribué, mais ne le supprime
  jamais.
- Coefficients `(0.40 / 0.30 / 0.20)` : la propagation domine, parce
  qu'elle se cascade. Les contraintes implicites et les dépendances
  pèsent moins individuellement mais s'additionnent rapidement sur les
  lois fondatrices.

## Pourquoi GHUC-001 trône au sommet (`nc = 0.665`)

GHUC-001 est une loi **fondatrice** au sens topologique : un grand
nombre de lois descendantes en dépendent. Cela se traduit par :

| Composante              | Valeur typique GHUC-001 |
|-------------------------|-------------------------|
| `propagation_cost`      | très élevé (loi-racine, cascade sur tout le graphe) |
| `implicit_constraint`   | élevé (contraintes héritées par les enfants) |
| `dependency_load`       | élevé (charge propagée massivement) |
| `runtime_impact_score`  | modéré (utilité runtime brute pas spectaculaire) |
| → `runtime_gain`        | **−0.105** (négatif !) |
| → `signal_to_noise`     | **0.000** |

Conséquence : `noise_contribution = 0.665` et `keep_runtime = false`.
La loi est conservée dans le graphe **structurel** mais écartée du
sous-graphe runtime, car sa charge propagationnelle dépasse son gain
runtime mesurable.

Même profil pour `DVE-001` (nc = 0.614), `WP12-001` (nc = 0.585),
`ULG-001` (nc = 0.561), `UDE-001` (nc = 0.552) — toutes des têtes
de famille foundatrices.

## Bruit ≠ complexité

Une loi peut être :
- **complexe et utile** (haute `precision_gain`, haute `S_local`,
  `runtime_gain > 0`) → S/N élevé → **conservée**.
- **complexe et bruyante** (haute propagation, faible `runtime_impact`)
  → S/N faible → **rejetée**.
- **simple et utile** (cas idéal frugal — cf. UDE-030, SDE-028) → S/N
  excellent (0.84+) → conservée.
- **simple et bruyante** (rare : peu de coût mais sans utilité) →
  encore rejetée par `runtime_gain ≤ 0`.

Le bruit mesure donc un **déséquilibre coût/utilité**, pas une
complexité intrinsèque. Une loi fondatrice complexe peut être
parfaitement légitime structurellement (`structural_usefulness > 0.5`)
tout en étant runtime-bruyante. Le moteur les distingue : seul le
verdict `keep_runtime` est trinaire (passe / ne passe pas).
