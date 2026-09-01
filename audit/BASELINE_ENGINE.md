# BASELINE_ENGINE

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `PATH_SELECTION_AND_ELIMINATION.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py::baseline_naive`,
  `::baseline_random`, `app/src/chat.js` baselines block

## 1. Why baselines

The whole point of the competition arena is to know whether ZORAN's
strategies do anything useful. Two baselines are scored on **exactly** the
same `score_route()` pipeline as the 6 strategies and shown next to them in
the UI. No favouritism.

## 2. The two baselines

### 2.1 `BASELINE-naive_selection_priority`

```
rank(n, q) = -((n.selection_priority ?? 0) + 0.30·topic_score(n, q))
top10 = sort(nodes).slice(0, 10)
```

Picks the top 10 nodes by the existing `selection_priority` field (already
present in `laws.json`, computed by `cognitive_selection_engine`) with a
small topic kicker.

### 2.2 `BASELINE-random`

```
seed = 42 (Python) / Math.random (JS, per-call)
top10 = sample(nodes, 10)
```

Uniform sample without replacement. In Python, the seed is fixed so the
report is reproducible; in JS, each click is a fresh sample, which means
the random baseline number in the UI varies between submits.

## 3. Real numbers (5 demo queries, from `PATH_COMPETITION_REPORT.json`)

| Query                                     | Winner sel | Naive sel | Random sel | Gap (winner − naive) |
|-------------------------------------------|------------|-----------|------------|----------------------|
| comment réduire la propagation runtime ?  | 0.773      | 0.771     | 0.729      | **+0.002**           |
| loi supérieure qui réduit l'hallucination?| 0.773      | 0.773     | 0.729      | **0.000**            |
| frugalité cognitive et bornage temporel   | 0.773      | 0.773     | 0.729      | **0.000**            |
| comment gérer la cohérence multi-cadres ? | 0.773      | 0.765     | 0.729      | **+0.008**           |
| détecter une dérive en runtime            | 0.773      | 0.770     | 0.729      | **+0.003**           |

## 4. Honest read of those numbers

- ZORAN's best route beats the **random** baseline by a comfortable
  ~0.044 every time. That is reassuring : the system is doing something
  better than "pull 10 laws at random".
- ZORAN's best route **barely** beats the **naive** baseline. The mean gap
  is ≈ +0.003. On 2 of 5 queries it is a tie.
- The added value of the 6-route arena over a single pre-computed
  `selection_priority` ranking is, as of 2026-05-16, **marginal**.
  We do not pretend otherwise.

## 5. What this implies

- The result is not surprising : `selection_priority` was itself derived
  from many of the same node fields the strategies consume, so the naive
  baseline inherits most of the signal.
- The honest claim is therefore **process**, not **score**: the arena
  exposes 6 distinct reasoning paths and tells the user *why* each one
  survives or fails — the naive baseline cannot do that. Whether the
  winner's law list is better than the naive list needs external testing
  (see `REAL_WORLD_ALIGNMENT_TESTS.md`); the current numbers do not
  prove superiority.
- Next steps to grow the gap : harder queries where the naive ranking is
  off-topic, strategy combinations (see `COGNITIVE_ROUTE_EVOLUTION.md`),
  and ground-truth labels from real users.
