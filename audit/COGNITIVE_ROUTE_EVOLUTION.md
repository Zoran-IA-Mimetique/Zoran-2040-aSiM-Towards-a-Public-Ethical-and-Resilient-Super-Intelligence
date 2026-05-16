# COGNITIVE_ROUTE_EVOLUTION

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `PATH_SELECTION_AND_ELIMINATION.md`, `PATH_SURVIVAL_ANALYSIS.md`,
  `AUTO_REFERENCE_PREVENTION.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py::ROUTE_STRATEGIES`,
  `app/src/chat.js::STRATEGIES`

## 1. The starting set is not a closed taxonomy

The current 6 strategies (`frugale`, `anti_hallucination`, `propagation_forte`,
`temporal_survival`, `structurelle`, `runtime_rapide`) cover the score axes
ZORAN already exposes on its law graph. They are intentionally simple : each
one is a one-axis rank function with a topic-relevance kicker. This is the
**v0** of an evolving population; we do not claim the set is complete or
final.

## 2. Three evolution paths

### 2.1 Combination of survivors

The Oracle output already tells us which strategies survive on every demo
query (`temporal_survival`, `structurelle`, `anti_hallucination`,
`runtime_rapide`). A next iteration can build a **composite strategy** with
a weighted sum of two surviving rank functions, e.g.

```
rank_composite(n, q) = 0.5·rank_temporal_survival(n, q)
                     + 0.5·rank_runtime_rapide(n, q)
```

It would compete in the same arena, under the same Oracle, against the
originals.

### 2.2 Weight tuning

Each rank function holds 2–4 hand-picked weights. A simple sweep that
re-runs `compete()` over a held-out query set and keeps the weight vector
that maximises mean `selection_score` (or, better, mean
`real_world_alignment` once it is grounded) is feasible without changing
the architecture.

### 2.3 New strategies

Strategies driven by signals we do not yet exploit :

- `coverage_max`     — maximise frame diversity in the 10-law slice.
- `dependency_safe`  — penalise laws with high `dependency_load` *and* high
  `drift_risk` together.
- `chronology`       — prefer laws with most recent `update_timestamp`.
- `user_history`     — bias toward laws clicked in previous sessions
  (requires persistence, currently out of scope).

## 3. What would stop the engine from evolving

- The Oracle thresholds are static. If a new strategy is dominant on every
  query, it gets stamped as winner, and the diversity of routes (the point
  of the system) collapses. See `AUTO_REFERENCE_PREVENTION.md`.
- The arena rewards a single `selection_score` ordering. Multi-objective
  selection (Pareto front instead of scalar maximum) is a natural next step
  but not implemented.
- The current data does not track strategy provenance over time — there is
  no history file, so a learning loop has no memory.

## 4. Honest assessment

What works today : the 6-strategy slate produces visibly different law
selections per query (e.g. `frugale` always returns the same `GHUC-002-*`
cluster, `temporal_survival` returns the `WP11-001 / GHUC-001 / WP12-001`
core), which proves the strategies are doing distinct things.

What does not work today : there is no automated mechanism that
adds/removes/retunes strategies between runs. Every change is a code edit.
Calling this an "evolving" system is therefore an architectural intent, not
a runtime property — yet.
