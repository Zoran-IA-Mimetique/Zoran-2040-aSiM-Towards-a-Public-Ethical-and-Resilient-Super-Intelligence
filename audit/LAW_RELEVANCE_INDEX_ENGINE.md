# LAW_RELEVANCE_INDEX_ENGINE — Spec

**Mission**: `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Implémentation**: `tools/law_relevance_index_engine.py`
**Rapport runtime**: `audit/LAW_RELEVANCE_INDEX_REPORT.json`
**Cross-refs**: `LAW_RETENTION_THRESHOLDS.md`, `CANONICAL_SELECTION_SYSTEM.md`

## Principe

Quantifier la **pertinence réelle** de chaque loi via 8 scores
indépendants puis composer un index unique `law_relevance_index ∈ [0,1]`,
agrégé en `keep_probability` qui détermine le destin de la loi
(canonical, runtime_candidate, sandbox, archive, purge_candidate).

## Les 8 scores

| Score                       | Formule sommaire                                              |
|-----------------------------|---------------------------------------------------------------|
| `structural_uniqueness`     | `1 − (taille_famille − 1) / 50`, clamp [0,1]                  |
| `cross_domain_relevance`    | step : 1d→0.45, 2d→0.65, ≥3d→0.85                             |
| `anti_hallucination_value`  | base + `+0.20` si kind ∈ {boundary, contradicts}              |
| `propagation_efficiency_v2` | `(impact / propag_cost) / 4 + 0.10`, clamp [0,1]              |
| `runtime_usefulness`        | `0.35·velocity + 0.25·prop_v2 + 0.20·anti_hallu + 0.20·frug`  |
| `temporal_survival`         | repris du moteur temporel, fallback 0.5                       |
| `law_relevance_index`       | composite (voir ci-dessous)                                   |
| `keep_probability`          | `LRI + bonus − malus`, clamp [0,1]                            |

## Formule LRI

```
law_relevance_index =
    0.25 · runtime_usefulness
  + 0.20 · propagation_efficiency_v2
  + 0.15 · temporal_survival
  + 0.15 · cross_domain_relevance
  + 0.10 · anti_hallucination_value
  + 0.10 · structural_uniqueness
  + 0.05 · llm_relevance_score
```

Poids prioritaires : utilité runtime (25 %) et efficacité de propagation
(20 %) — une loi doit servir et ne pas coûter cher.

## Formule keep_probability

```
keep_probability = LRI
                 + 0.10 si superior_law_candidate
                 + 0.15 si attractor_tier == "fondateur"
                 − 0.20 si experimental_classes == ["toxique_propagationnelle"]
```

Le bonus fondateur protège l'ossature historique. Le bonus superior
protège les lois reconnues structurellement supérieures. Le malus
toxique sanctionne les lois qui propagent du bruit.

## Résultats runtime (run 2026-05-16)

| Métrique                       | Valeur  |
|--------------------------------|---------|
| Lois scorées                   | 241     |
| Avg `law_relevance_index`      | 0.576   |
| Avg `keep_probability`         | 0.588   |
| canonical (≥ 0.80)             | 0       |
| runtime_candidate (0.60–0.80)  | 121     |
| sandbox (0.40–0.60)            | 120     |
| archive (0.20–0.40)            | 0       |
| purge_candidate (< 0.20)       | 0       |

Pour la distribution détaillée et la stratégie de seuils voir
`LAW_RETENTION_THRESHOLDS.md`.

## Garde-fous

- Clamp `[0, 1]` strict sur tous les scores
- Fallbacks `0.4 / 0.5` sur scores manquants (jamais `None` propagé)
- Bonus / malus bornés (jamais > +0.25 ni < −0.20 cumulés)
- Aucun score n'écrase un autre : LRI reste composite

## SIGNATURE

```
MISSION_ID:    ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516
SCORES:        8 par loi
AVG_LRI:       0.576
AVG_KP:        0.588
DISTRIBUTION:  0 / 121 / 120 / 0 / 0
```
