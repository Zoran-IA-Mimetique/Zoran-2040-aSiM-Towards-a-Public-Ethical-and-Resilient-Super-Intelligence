# DISTRIBUTED_GENERATIVE_LAW_ENGINE — Spec

**Mission**: `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Implémentation**: `tools/distributed_generative_law_engine.py`
**Rapport runtime**: `audit/DISTRIBUTED_GENERATIVE_REPORT.json`

## Principe

Chaque loi cesse d'être passive et devient un **attracteur génératif
spécialisé** : elle peut explorer son voisinage topologique pour proposer
des lois filles. La génération est **strictement contrainte** par
`GenerationOracle` pour éviter l'explosion combinatoire.

## Structure générative injectée (par loi mère)

```json
{
  "generative_scope": ["WP11", "ULG", "ISO"],
  "allowed_domains": ["coherence", "propagation"],
  "child_generation_rules": [
    "voisinage_topologique_depth=1",
    "S_local >= 0.70",
    "S_global_proxy >= 0.65",
    "propagation_cost <= mère + 0.15"
  ],
  "forbidden_expansions": ["cosmologie_profonde", "DVE", "UDE", ...],
  "generation_depth_limit": 1,
  "oracle_constraints": [
    "pertinence_locale", "non_redondance", "anti_drift",
    "propagation_admissible", "runtime_admissibility", "temporal_stress"
  ],
  "runtime_admissibility": {
    "max_propagation_cost": 0.75,
    "max_implicit_constraints": 12,
    "min_temporal_survival": 0.55
  },
  "generation_cost": 0.42
}
```

## 6 scores génératifs (par mère)

| Score                          | Définition |
|--------------------------------|------------|
| `generative_relevance`         | Capacité à proposer des dérivées utiles |
| `child_stability_score`        | Stabilité moyenne des filles candidates |
| `local_exploration_quality`    | Qualité du voisinage exploré |
| `derivation_validity`          | Taux de filles passant l'Oracle |
| `generation_entropy`           | Entropie des familles filles (bas = focalisé) |
| `oracle_generation_confidence` | Confiance Oracle sur la génération |

## Pipeline (mission, obligatoire)

```
L_i
  ↓ local exploration (depth=1, voisinage topologique)
candidate child laws (n_max = 2 par mère)
  ↓ GenerationOracle (6 checks bloquants)
acceptés / rejetés
  ↓ DiscoverySandbox  ← AUCUN bypass vers laws.json
[propagation tests · temporal tests · composition tests]
  ↓ promotion manuelle
CanonicalCandidate
  ↓ validation finale
CanonicalGraph
```

## GenerationOracle — Checks bloquants

| Check                     | Critère                                  |
|---------------------------|------------------------------------------|
| Pertinence locale         | `estimated_S_local >= 0.70`              |
| Redondance ID             | `id ∉ existing_ids`                      |
| Propagation excessive     | `estimated_propagation_cost ≤ 0.85`      |
| Auto-référentialité       | `parent_id ≠ id`                         |
| Famille interdite         | `family ∉ forbidden_expansions`          |

## Résultats runtime (mesures réelles)

- **241 lois mères activées**
- **476 filles proposées** (2 par mère max)
- **365 acceptées par l'Oracle** (76.7 % taux d'acceptation)
- **Coupe anti-explosion** : 365 → **50** filles retenues en sandbox (top relevance)
- **111 rejets** : tous pour `pertinence_locale_insuffisante`
- **15 générateurs toxiques** détectés (`generative_relevance < 0.30`)
- **AUCUNE fille n'a touché laws.json** ✓ pipeline sandbox-only respecté

## Garde-fous anti-explosion

| Garde-fou                          | Valeur |
|------------------------------------|--------|
| `n_max` filles proposées par mère  | 2      |
| `generation_depth_limit`           | 1      |
| Cap global filles en sandbox       | 50     |
| Promotion auto vers canonical      | INTERDITE |
| Promotion auto vers ZenRuntime     | INTERDITE |

## Affichage UI

Bloc `panel.js#generativeBlock` :
- Profil génératif (attracteur / correct / faible / stérile) avec couleur
- Scope autorisé (badges familles)
- Profondeur limite + expansions interdites
- Validité dérivation + stabilité filles
- Entropie + qualité exploration
- Oracle confidence + coût génération
