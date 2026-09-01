# COGNITIVE_PATH_EFFECTIVENESS

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `RUNTIME_DELTA_ANALYSIS.md`,
  `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `COGNITIVE_SELECTION_ENGINE.md`
- Sources    : `app/src/superiority.js` (`SUPERIORITY_ROUTES`,
  `runSuperiorityComparison`), `app/src/llm.js::synthesizeRoute`
  (system prompt per-strategy), `tools/runtime_cognitive_path_competition_engine.py`
  for the upstream `laws_used` list.

## 1. Which ZORAN strategies actually win the LLM benchmark ?

The competition arena produces 6 strategies. Only 3 reach the
LLM-as-judge stage today, hard-coded in `SUPERIORITY_ROUTES =
['frugale', 'anti_hallucination', 'structurelle']`. This file analyses
*which of those three* tends to walk away with the `★ WINNER` tag in
the chat UI.

## 2. Hypothesis to test (axis-specific)

Each strategy injects a distinct top-10 law set into `synthesizeRoute`.
The expected effect on judge axes :

| Strategy              | precision_delta | hallucination_delta | noise_delta | coherence_delta |
|-----------------------|-----------------|---------------------|-------------|-----------------|
| `frugale`             | ~0              | ~0                  | **−** (win) | ~0 / slight −   |
| `anti_hallucination`  | **+** (win)     | **−** (win)         | ~0 / slight +| ~0             |
| `structurelle`        | ~0              | ~0                  | ~0 / slight +| **+** (win)    |

Rationale :

- `frugale` minimises the number of laws and prefers short
  descriptions, so the LLM has less context to over-elaborate on →
  lower `noise`.
- `anti_hallucination` favours laws with high `stability` /
  `factual_anchor` scores, so the system prompt biases the model
  toward conservative phrasing → higher `precision`, lower
  `hallucination`.
- `structurelle` favours laws connected via the hierarchy
  (parent-child frames), so the model is given an explicit scaffold
  to chain → higher `coherence`.

## 3. What we cannot yet claim

- **No statistics**. The engine is per-query, in-browser, with no
  persistent log. A single user click yields a single verdict ; we
  have no `N`, no variance, no p-value.
- **Question dependence**. A BTP-flavoured question is likely to
  benefit `structurelle` ; a yes/no factual is likely to benefit
  `anti_hallucination` ; a chatty open question may favour any. The
  3 strategies have not been measured across a balanced question
  taxonomy.
- **Judge bias**. The same Claude judges the same Claude (see
  `REAL_WORLD_VALIDATION_PHASE.md`). The judge may systematically
  prefer one prompt style.
- **Strategy-context coupling**. The `laws_used` for each strategy is
  itself an output of the upstream `compete()` ; if `compete()` is
  miscalibrated, the LLM stage inherits that error and the deltas
  measure *the compound system*, not the strategy alone.

## 4. Path to a real effectiveness study (v2)

The minimal protocol that would replace the current hypothesis with
evidence :

1. Build the curated set `tools/validation_set.json` described in
   `REAL_WORLD_VALIDATION_PHASE.md` (30–100 tagged questions).
2. For each question, run all 6 strategies (not just the 3 budgeted
   ones) plus baseline, judged by the multi-judge ensemble.
3. Aggregate per-strategy per-axis means and 95 % CIs.
4. Export to `audit/COGNITIVE_PATH_EFFECTIVENESS_REPORT.json` with
   columns `strategy, axis, mean_delta, ci_low, ci_high, n_wins`.
5. Plot a 4-axis radar per strategy in the report doc.

Until then, the win-rate counts visible in the chat UI are **anecdotes,
not evidence** — they are useful to spot obvious failures, not to
declare a strategy "the best".

## 5. Side effect : strategy fairness audit

A second, simpler use of this file : verify that no strategy is
*structurally* prevented from winning. The current pipeline guarantees
fairness on three points :

- Same Claude model, same `max_tokens = 600`, same temperature
  defaults — see `callLLM`.
- Same parallel-launch via `Promise.allSettled` ; no first-mover effect.
- Same judge rubric for all 4 responses, fed in the same order
  (baseline always at index 0 — see §6 below).

The only structural asymmetry is **baseline-always-first**. The judge
sees baseline before any ZORAN route. If judge has a primacy bias, it
helps the baseline, not ZORAN. That asymmetry is conservative for our
claim (any ZORAN win is in spite of the disadvantage) and therefore
left in place for v1.
