# RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_ROUTE_RUNTIME_SYSTEM.md`, `PATH_SELECTION_AND_ELIMINATION.md`,
  `BASELINE_ENGINE.md`, `REAL_WORLD_ALIGNMENT_TESTS.md`, `PATH_SURVIVAL_ANALYSIS.md`,
  `COGNITIVE_SELECTION_ENGINE.md`, `COGNITIVE_VELOCITY_ENGINE.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py`,
  `app/src/chat.js`, `audit/PATH_COMPETITION_REPORT.json`,
  `app/data/routes.json`

## 1. Why this exists

This mission is the direct answer to the prior internal critique that ZORAN
was self-referential and exposed no real task. A user now types a question
in the chat bar; the engine runs **6 cognitive routes in parallel** plus
**2 baselines**, scores every output, eliminates routes that fail Oracle
thresholds, and declares a winner. The work is observable, comparable, and
the baselines make the comparison honest.

## 2. The 6 strategies

Each strategy picks `K=10` laws via a different rank function over the law
graph (`app/data/laws.json`).

| Strategy            | Rank signal (dominant terms)                                     |
|---------------------|------------------------------------------------------------------|
| `frugale`           | `+frugality_score - 0.5·propagation_cost + 0.30·topic`           |
| `anti_hallucination`| `+anti_hallucination_score - 0.20·drift_risk + 0.30·topic`       |
| `propagation_forte` | `+dependency_load + 0.30·propagation_cost + 0.30·topic`          |
| `temporal_survival` | `+temporal_resilience_score - 0.20·collapse_probability + 0.30·topic` |
| `structurelle`      | `+(|child_laws|+|parent_laws|) + 0.30·S_local + 0.50·topic`      |
| `runtime_rapide`    | `+velocity_score - 0.30·propagation_cost + 0.30·topic`           |

## 3. Pipeline

```
Question Q
   │
   ▼
SubjectBoundary (tokens + topic_relevance per node)
   │
   ▼
6 routes  ─────┐                       2 baselines (naive, random)
   │           │                              │
   ▼           ▼                              ▼
12 + 6 score metrics per route ──── score_route() identical for baselines
   │
   ▼
Oracle elimination (5 thresholds)
   │
   ▼
Survivors sorted by selection_score → winner
```

## 4. Per-route score vector

12 raw scores : `runtime_cost, precision_score, hallucination_risk,
propagation_weight, temporal_stability, noise_generated` plus the 6 mission
scores : `runtime_path_efficiency, hallucination_resistance, noise_efficiency,
cognitive_cost_ratio, real_world_alignment, path_survival_score`. A weighted
`selection_score` aggregates them (25 % efficiency, 20 % hallu_r, 20 %
noise_eff, 15 % cost_ratio, 10 % temporal, 10 % rwa).

## 5. Runtime numbers (5 demo queries)

- 30 routes generated total, 10 eliminated by Oracle → 33 % elimination
  rate.
- Winner is `ROUTE-runtime_rapide` on **every** demo query (sel = 0.773).
- `BASELINE-naive_selection_priority` lands at sel ≈ 0.765–0.773; the gap
  with the winner is at most 0.008. This is documented honestly in
  `BASELINE_ENGINE.md`: the system narrowly beats the naive baseline. The
  random baseline sits at sel = 0.729.
- `runtime_rapide` does not win because it is "smarter"; it wins because
  its score profile lines up with the weights chosen for `selection_score`.
