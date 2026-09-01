# PATH_SURVIVAL_ANALYSIS

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `PATH_SELECTION_AND_ELIMINATION.md`, `COGNITIVE_ROUTE_EVOLUTION.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py::score_route`
  (`survival` block), `audit/PATH_COMPETITION_REPORT.json`

## 1. Survival probability formula

```
path_survival_score = min(1.0,
      0.40 · runtime_path_efficiency
    + 0.30 · hallucination_resistance
    + 0.30 · temporal_stability
)
```

Stored under both `path_survival_score` and `survival_probability` (same
value, two names for compatibility with the UI / report consumers).

Reading guide :
- 0.40 weight on `runtime_path_efficiency` favours cheap, precise routes.
- 0.30 + 0.30 on resistance + stability is a brake against routes that
  win on cost but collapse under drift.

## 2. Top-3 surviving routes per demo query (by `path_survival_score`)

| Query                                       | #1 (survival)            | #2                       | #3                      |
|---------------------------------------------|--------------------------|--------------------------|-------------------------|
| comment réduire la propagation runtime ?    | temporal_survival 0.690  | structurelle 0.672       | runtime_rapide 0.669    |
| loi supérieure qui réduit l'hallucination ? | temporal_survival 0.690  | structurelle 0.690       | runtime_rapide 0.669    |
| frugalité cognitive et bornage temporel     | structurelle 0.690       | temporal_survival 0.690  | runtime_rapide 0.669    |
| comment gérer la cohérence multi-cadres ?   | temporal_survival 0.698  | structurelle 0.683       | runtime_rapide 0.669    |
| détecter une dérive en runtime              | temporal_survival 0.690  | structurelle 0.676       | runtime_rapide 0.669    |

Note the inversion : the route with the highest `path_survival_score`
(`temporal_survival` or `structurelle`) is **not** the route that wins the
arena. The winner is decided by `selection_score`, which weighs
`runtime_path_efficiency` more aggressively. Survival ranks who would last
longest; selection ranks who answers fastest.

## 3. Observed survival pattern

- `temporal_survival` and `structurelle` survive on **5/5** demo queries.
- `anti_hallucination` and `runtime_rapide` survive on **5/5** as well, but
  with lower survival scores (`anti_hallucination` ≈ 0.630,
  `runtime_rapide` ≈ 0.669).
- `frugale` is eliminated on **5/5** for `instabilité_temporelle`
  (temp_stab = 0.395, just below the 0.40 floor).
- `propagation_forte` is eliminated on **5/5** for `bruit_excessif`
  (noise = 0.558, just above the 0.55 ceiling).

Both eliminated strategies fail by tiny margins. They are not catastrophic;
they are *unbalanced*. The pattern : **routes that optimise a single
dimension fail the Oracle. Balanced routes survive.**

## 4. Honest read

The arena rewards balance, not intelligence. `runtime_rapide` wins every
selection round not because its law slice is the most relevant — its
`precision_score` (0.837) is actually below `temporal_survival` (0.943) —
but because its profile (low cost, high efficiency) maps best onto the
chosen `selection_score` weights. Change the weights and the winner
changes. This means the current ranking conveys *consistency with our
weighting choices*, not external truth. The survival numbers should be
re-evaluated once real-world grading lands (see
`REAL_WORLD_ALIGNMENT_TESTS.md`).
