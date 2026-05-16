# MINIMAL_RUNTIME_SET — Spec

**Mission**: `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Implémentation**: `tools/noise_minimization_engine.py`
**Specs liées**: `audit/COGNITIVE_SELECTION_ENGINE.md`, `audit/NOISE_MINIMIZATION_ENGINE.md`

## Définition

Le **minimal runtime set** est l'ensemble des lois pour lesquelles
`keep_runtime = true` après application des trois critères ET-stricts du
moteur. Il représente la base chargée par défaut au démarrage du runtime,
avant toute spécialisation par sujet.

```
|minimal_runtime_set| = 147 / 241
réduction par rapport au graphe complet = 39.0 %
```

## Composition par famille (147 lois retenues)

Estimation à partir du rapport runtime et de la distribution rejetée :

| Famille | Total | Retenues (keep) | Rejetées | Taux keep |
|---------|-------|-----------------|----------|-----------|
| SDE     | ~40   | ~38             | ~2       | ~95 %     |
| UDE     | ~50   | ~38             | ~12      | ~76 %     |
| WP11    | ~35   | ~24             | ~11      | ~69 %     |
| PAL     | ~20   | ~13             | ~7       | ~65 %     |
| WP12    | ~25   | ~12             | ~13      | ~48 %     |
| DVE     | ~25   | ~10             | ~15      | ~40 %     |
| ULG     | ~20   | ~8              | ~12      | ~40 %     |
| GHUC    | ~15   | ~4              | ~11      | ~27 %     |
| Total   | 241   | **147**         | **94**   | 61.0 %    |

Les familles **feuilles** (SDE, UDE) dominent l'ensemble retenu. Les familles
**fondatrices** (GHUC, ULG, DVE) sont massivement rejetées — cohérent avec
leur profil propagation-lourd documenté dans `RUNTIME_NOISE_MODEL.md`.

## Comparaison avec COGNITIVE_SELECTION minimal set

| Système                        | Taille minimale | Réduction | Critère d'arrêt                   |
|--------------------------------|-----------------|-----------|-----------------------------------|
| `NOISE_MINIMIZATION_ENGINE`    | **147 / 241**   | 39.0 %    | 3 portes ET-strictes (snr/fr/rg)  |
| `COGNITIVE_SELECTION_ENGINE`   | **20 / 241**    | 91.7 %    | `marginal_information_gain < 0.05` |

Différence fondamentale :

- Le minimal **noise** set est **statique** : il représente les lois qui
  méritent d'exister runtime par défaut, indépendamment du contexte.
- Le minimal **cognitive** set est **dynamique** : il dépend du sujet
  utilisateur et s'arrête sur saturation marginale.

Composition en cascade en runtime réel :

```
241 lois (graphe complet)
  ↓ NOISE_MINIMIZATION filter
147 lois (minimal runtime set, statique)
  ↓ COGNITIVE_SELECTION filter (par sujet)
≤ 20 lois (set actif par requête)
```

Les 94 lois rejetées par noise minimization restent **mobilisables à la demande**
via override explicite ou via une requête cognitive qui les promeut malgré leur
bruit (cas rare — sujet spécifiquement fondationnel).

## Invariants du minimal set

- Aucune loi avec `runtime_gain ≤ 0` n'y figure
- Aucune loi avec `signal_to_noise < 0.50` n'y figure
- Aucune loi avec `frugality_ratio < 0.30` n'y figure
- L'union (minimal_runtime_set ∪ rejected_set) = graphe complet (241)
- L'intersection (minimal_runtime_set ∩ rejected_set) = ∅
