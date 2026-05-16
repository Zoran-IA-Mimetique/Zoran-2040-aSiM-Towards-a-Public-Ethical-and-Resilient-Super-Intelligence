# PATH_SELECTION_AND_ELIMINATION

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `PATH_SURVIVAL_ANALYSIS.md`, `COGNITIVE_ROUTE_EVOLUTION.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py::oracle_eliminate`,
  `app/src/chat.js::oracleEliminate`,
  `audit/PATH_COMPETITION_REPORT.json`

## 1. Oracle thresholds

A route is **eliminated** as soon as one of these thresholds is breached:

| Test                            | Threshold      | Failure tag                |
|---------------------------------|----------------|----------------------------|
| `hallucination_risk` > 0.55     | upper bound    | `hallucination_excessive`  |
| `noise_generated`    > 0.55     | upper bound    | `bruit_excessif`           |
| `runtime_cost`       > 0.80     | upper bound    | `coût_runtime_excessif`    |
| `runtime_path_efficiency` < 0.20| lower bound    | `gain_runtime_insuffisant` |
| `temporal_stability` < 0.40     | lower bound    | `instabilité_temporelle`   |

Thresholds are deliberately permissive: a route is killed only when one
dimension is clearly broken. Multiple failures stack in
`elimination_reasons` so the UI explains why a card is greyed out.

## 2. Promotion (winner) rule

```
survivors = [r for r in routes if not r.eliminated]
survivors.sort(key=-selection_score)
winner    = survivors[0]   # None if all eliminated
```

`selection_score` is :

```
0.25·runtime_path_efficiency
+ 0.20·hallucination_resistance
+ 0.20·noise_efficiency
+ 0.15·cognitive_cost_ratio
+ 0.10·temporal_stability
+ 0.10·real_world_alignment
```

There is no tie-breaker beyond float ordering. Ties are possible in
principle but did not appear in the 5 demo queries.

## 3. Observed elimination pattern (5 demos, 30 routes)

| Strategy             | Eliminated / 5 | Dominant reason                                |
|----------------------|----------------|------------------------------------------------|
| `frugale`            | 5 / 5          | `instabilité_temporelle` (temp_stab 0.395)     |
| `propagation_forte`  | 5 / 5          | `bruit_excessif` (noise 0.558)                 |
| `anti_hallucination` | 0 / 5          | survives, but sel ≈ 0.659                      |
| `temporal_survival`  | 0 / 5          | survives, sel ≈ 0.656                          |
| `structurelle`       | 0 / 5          | survives, sel ≈ 0.679–0.711                    |
| `runtime_rapide`     | 0 / 5          | **winner**, sel = 0.773                        |

Total : **10 / 30 eliminated = 33 %**. This is the published elimination
rate.

## 4. Limits and caveats

- Thresholds were picked by inspection of the law graph score
  distributions, not by calibration against an external oracle. They will
  move once we wire real-world feedback (see
  `REAL_WORLD_ALIGNMENT_TESTS.md`).
- The strategies that always fail (`frugale`, `propagation_forte`) do so
  because they optimise a single axis; the Oracle penalises that
  imbalance. This is by design but it also means the elimination rate is
  *structural*, not adaptive. If thresholds were `hallu > 0.70` and
  `noise > 0.70`, the rate would collapse to ~0 %.
- If a future strategy set is uniformly balanced, the elimination rate
  will drop toward 0 % and the Oracle stops doing useful work. The
  thresholds will then need to tighten.
