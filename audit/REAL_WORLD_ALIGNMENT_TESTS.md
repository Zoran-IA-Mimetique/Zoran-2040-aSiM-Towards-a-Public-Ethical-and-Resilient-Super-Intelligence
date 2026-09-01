# REAL_WORLD_ALIGNMENT_TESTS

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `BASELINE_ENGINE.md`, `ANTI_HALLUCINATION_IMPACT.md`,
  `COGNITIVE_VELOCITY_ENGINE.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py::score_route`
  (`rwa` block), `app/src/chat.js::scoreRoute`

## 1. What `real_world_alignment` is

```
real_world_alignment = 0.40 · hallucination_resistance
                     + 0.30 · temporal_stability
                     + 0.30 · frugality_score_avg
```

with `hallucination_resistance = 1 - drift_risk_avg` over the 10 selected
laws. The values for the 5 demo queries sit between **0.425** and **0.615**,
which the UI displays as the `rwa` bar on each route card.

## 2. What it is NOT

It is a **proxy**. None of its three components touches an external source
of truth:

- `hallucination_resistance` is derived from `drift_risk`, itself a
  pre-computed graph metric.
- `temporal_stability` is `temporal_resilience_score`, another internal
  field.
- `frugality_score` is a structural law property.

So `real_world_alignment` is an internal aggregate that *correlates with*
what we would want a real-world test to measure, but it is not a real-world
test. It cannot detect a route whose laws are technically "safe" but
factually wrong, irrelevant, or misleading.

## 3. Honest acknowledgment

As of 2026-05-16, ZORAN has run zero of the following against the
competition output:

| Test type                                  | Status        |
|--------------------------------------------|---------------|
| LLM-as-judge scoring on the 10-law answer  | not started   |
| Human relevance rating on a query corpus   | not started   |
| External knowledge-base agreement check    | not started   |
| Downstream task accuracy (QA / retrieval)  | not started   |
| Adversarial / out-of-distribution queries  | not started   |

Therefore, when a route shows `rwa = 0.615`, this number is meaningful only
**relative to other routes scored by the same formula in the same run**.
It does not certify that the route would produce a factually aligned answer
in the real world.

## 4. What we plan to add

Concrete next steps that would convert the proxy into an actual test:

1. A small held-out corpus of queries with hand-annotated "expected law set"
   labels. Compare each route's 10-law slice to the expected set
   (Jaccard / nDCG).
2. A second-stage LLM that, given (question, 10 laws, brief
   description of each law), returns a 0–1 grounding score. Compare across
   routes and against baselines.
3. Wire those external scores back into the strategy weight tuner described
   in `COGNITIVE_ROUTE_EVOLUTION.md`.

Until at least step 1 ships, `real_world_alignment` should be read as a
heuristic confidence indicator, **not** as evidence that the system is
aligned with reality.
