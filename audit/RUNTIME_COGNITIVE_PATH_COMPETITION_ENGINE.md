# RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE — Spec

**Mission**: `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
**Implémentation**: `tools/runtime_cognitive_path_competition_engine.py`
**Port navigateur**: `app/src/chat.js`
**Rapport runtime**: `audit/PATH_COMPETITION_REPORT.json`
**Données UI**: `app/data/routes.json`
**Cross-refs**: `COGNITIVE_SELECTION_ENGINE.md`, `MULTI_ROUTE_RUNTIME_SYSTEM.md`,
`PATH_SELECTION_AND_ELIMINATION.md`

## Principe

> Pour une question Q, le moteur ne produit pas UNE sélection mais **6 routes
> cognitives concurrentes**, chacune utilisant une stratégie différente de
> ranking. L'Oracle élimine ensuite les routes échouant un critère, et le
> survivant au meilleur `selection_score` est désigné gagnant.

C'est la réponse directe à la critique d'auto-référence : il existe maintenant
une **vraie tâche externe** (la question utilisateur) et un **vrai mécanisme
de discrimination** (Oracle + scoring multi-métriques).

## Pipeline

```
Question utilisateur (chat bar)
  ↓ tokens(Q) — bag of words
  ↓ topic_score(node, q_tokens) par loi
  ↓ 6 stratégies en parallèle → 6 × top-K (K=10)
  ↓ score_route(laws) → 14 métriques par route
  ↓ oracle_eliminate(scores) → liste failures
  ↓ baselines (naive + random) calculées en parallèle
  ↓ tri survivants par selection_score
  ↓ winner = top
```

## Les 6 stratégies

| Strategy | Rank function (résumée) |
|----------|--------------------------|
| `frugale` | `+frugality −0.5·propag_cost +0.30·topic` |
| `anti_hallucination` | `+anti_hallu +0.30·topic −0.20·drift_risk` |
| `propagation_forte` | `+dependency_load +0.30·propag_cost +0.30·topic` |
| `temporal_survival` | `+temporal_resilience +0.30·topic −0.20·collapse_prob` |
| `structurelle` | `+(child+parent) +0.50·topic +0.30·S_local` |
| `runtime_rapide` | `+velocity +0.30·topic −0.30·propag_cost` |

Chaque stratégie sélectionne `K=10` lois par tri descendant.

## Les 14 scores par route

**6 scores bruts** (moyennes sur les 10 lois) :
`runtime_cost`, `precision_score`, `hallucination_risk`, `propagation_weight`,
`temporal_stability`, `noise_generated`.

**6 scores mission** :
`runtime_path_efficiency = clip(prec − cost + 0.30)`,
`hallucination_resistance = 1 − hallu`,
`noise_efficiency = 1 − noise`,
`cognitive_cost_ratio = clip(prec/cost/2)`,
`real_world_alignment = 0.40·hallu_r + 0.30·temp + 0.30·frug`,
`path_survival_score = 0.40·rt_eff + 0.30·hallu_r + 0.30·temp`.

**2 scores composites** :
`selection_score = 0.25·rt_eff + 0.20·hallu_r + 0.20·noise_eff + 0.15·cc_ratio + 0.10·temp + 0.10·rwa`
et `survival_probability` (= `path_survival_score`).

## Résultats runtime — 5 questions démo

| Q | Survivants | Winner | sel winner |
|---|-----------|--------|-----------|
| « réduire propagation runtime » | 4/6 | `ROUTE-runtime_rapide` | 0.773 |
| « loi qui réduit hallucination » | 4/6 | `ROUTE-runtime_rapide` | 0.773 |
| « frugalité + bornage temporel » | 4/6 | `ROUTE-runtime_rapide` | 0.773 |
| « cohérence multi-cadres » | 4/6 | `ROUTE-runtime_rapide` | 0.773 |
| « détecter dérive runtime » | 4/6 | `ROUTE-runtime_rapide` | 0.773 |

**30 routes générées, 10 éliminées (33 %)**, winner constant.

## Honnêteté

`ROUTE-runtime_rapide` gagne non parce qu'elle est « plus intelligente »
mais parce qu'elle marque correctement sur les 6 dimensions de
`selection_score` simultanément (faible coût + faible bruit + bon `cc_ratio`).
Le gap avec `BASELINE-naive_selection_priority` (sel ≈ 0.77) est **marginal**
— voir `BASELINE_ENGINE.md`.
