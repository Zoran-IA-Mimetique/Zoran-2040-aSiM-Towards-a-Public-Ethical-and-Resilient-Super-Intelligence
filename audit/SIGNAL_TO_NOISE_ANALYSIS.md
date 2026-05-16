# SIGNAL_TO_NOISE_ANALYSIS — Spec

**Mission** : `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/NOISE_MINIMIZATION_ENGINE.md`
**Rapport** : `audit/NOISE_CONTRIBUTION_REPORT.json`

## Définition

```
signal_to_noise(L) = signal / (signal + noise)
                   = max(0, runtime_gain) / max(0.05, max(0, runtime_gain) + noise_contribution)
```

Métrique standard. Borné `[0 ; 1]`. À 1.0 la loi est purement utile,
à 0.0 elle est purement coûteuse. Le seuil `keep_runtime` exige
`S/N ≥ 0.50` : le signal doit être au moins équivalent au bruit.

## Mesure système

| Niveau                  | S/N observé | Cible | Écart |
|-------------------------|-------------|-------|-------|
| `avg_signal_to_noise`   | 0.540       | ≥ 0.95 | −0.410 |
| `system_signal_to_noise`| **0.556**   | ≥ 0.95 | −0.394 |
| `global_noise_ratio`    | 0.798       | ≤ 0.05 | +0.748 |

Le système est **à mi-chemin** de l'objectif. La moitié inférieure
du corpus tire la moyenne vers le bas : 94 lois rejetées, dont les
21 plus bruyantes ont un S/N inférieur à 0.20. Atteindre ≥ 0.95
exigerait soit une refonte des lois fondatrices (réduction
`propagation_cost`), soit un durcissement du critère keep (qui
réduirait davantage le runtime — cf. trade-off `audit/RUNTIME_BUDGET_MODEL.md`).

## Visualisation UI — 5 barres

Le bloc `panel.js#noiseBlock` affiche une jauge à 5 segments :

| Bande      | Plage S/N    | Couleur UI    | Statut             |
|------------|--------------|---------------|--------------------|
| Excellent  | ≥ 0.80       | vert vif      | top frugal         |
| Bon        | 0.60 – 0.80  | vert pâle     | gardée confortable |
| Limite     | 0.50 – 0.60  | jaune         | gardée de justesse |
| Insuffisant| 0.20 – 0.50  | orange        | rejetée            |
| Critique   | < 0.20       | rouge         | top contributeur de bruit |

Le segment actif est mis en surbrillance ; les 4 autres restent
visibles pour donner le contexte. Une légende inline rappelle le
seuil `keep_runtime = 0.50`.

## Décomposition par famille

| Famille | n   | Avg S/N (estim.) | Notes |
|---------|-----|-------------------|-------|
| SDE     | ~40 | ~0.70             | top frugal (SDE-028, SDE-002-*) |
| UDE     | ~35 | ~0.65             | porte UDE-030 (S/N max = 0.848) |
| WP11    | ~50 | ~0.60             | WP11-002-* dans le top 10 |
| WP12    | ~45 | ~0.45             | tête WP12-001 très bruyante |
| ULG     | ~25 | ~0.40             | ULG-001 rejetée (S/N = 0) |
| DVE     | ~20 | ~0.35             | DVE-001 rejetée (S/N = 0) |
| GHUC    | ~15 | ~0.30             | GHUC-001 = top contributeur bruit |
| PAL     | ~10 | ~0.55             | comportement médian |

Les familles d'**accroches sémantiques** (SDE / UDE / WP11-instances)
dominent le S/N. Les **têtes de famille fondatrices** (GHUC / DVE /
ULG / WP12-001) plombent la moyenne. Ce n'est pas un défaut du
moteur : c'est la signature topologique attendue d'un graphe à
ossature fondatrice.
