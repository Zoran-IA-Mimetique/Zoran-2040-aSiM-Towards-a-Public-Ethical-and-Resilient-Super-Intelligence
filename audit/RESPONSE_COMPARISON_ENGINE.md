# RESPONSE_COMPARISON_ENGINE

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `QUESTION_REFORMULATION_SYSTEM.md`, `RUNTIME_SUPERIORITY_ENGINE.md`,
  `LLM_VS_ZORAN_BENCHMARKS.md`, `SEMANTIC_DELTA_ANALYSIS.md`.
- Sources    : `app/src/superiority.js::runSuperiorityComparison`
  (Phase 2 + Phase 3), `app/src/llm.js::synthesizeRoute`,
  `judgeResponses`.

## 1. Phase 2 — answer each reformulation

After Phase 1 produces three reformulations, Phase 2 dispatches three
`synthesizeRoute` calls **in parallel** via `Promise.allSettled`. Each
task pulls `reformByLabel.get(s.stratName) || question` and feeds it as
the `question` argument to `synthesizeRoute`, alongside the route's
10-law context.

Two design points :

- `synthesizeRoute` receives the **reformulation as its `question`
  argument**, not the original user text. Each ZORAN strategy is
  therefore answering *its own framing* of the problem.
- If reformulation failed in Phase 1, the route falls back to the
  original question. The pipeline degrades gracefully.

The baseline (`synthesizeBaseline(question)`) runs **concurrently** with
the reformulation phase — it does not depend on a reformulation and
must receive the unmodified question to remain a fair control.

## 2. Phase 3 — judge with reformulations in context

`judgeResponses` is invoked once with both reformulations and
responses :

```js
const reformulationsList = responses.map(r => r.reformulation || null);
const judgeResult = await judgeResponses({
  question, responses, reformulations: reformulationsList,
});
```

For each candidate the judge sees a block of the form :

```
[CANDIDAT i — <label>]
REFORMULATION : <one sentence or "(absente)">
RÉPONSE       : <full prose>
```

This is what lets the judge compute two distinct global scores
(`reformulation_divergence` vs `response_divergence`) and a per-card
`semantic_delta` — without that paired view, the judge could not
attribute divergence to the framing layer versus the answer layer.

The judge call is capped at `maxTokens = 1600`. JSON is extracted with
the tolerant regex `r.text.match(/\{[\s\S]*\}/)` and `JSON.parse`. On
failure the whole comparison is marked not-ok and the UI shows
"⚠ Benchmark échoué (judge_unparsable)".

## 3. Aggregation and safety nets

The responses array is built defensively : the baseline is pushed if
`ok`, then the route results are filtered through
`settled.filter(r => r.status === 'fulfilled' && r.value.ok)`. If fewer
than 2 valid responses survive, the engine returns
`{ ok: false, reason: 'too_few_responses' }` and the UI shows a clear
failure banner.

`Promise.allSettled` (rather than `Promise.all`) guarantees that a
single rate-limited route does not abort the whole benchmark.

Deltas are then computed candidate-by-candidate against the baseline
score (`responses[0]`), and a final pass derives `winner_delta` as
`top_runtime_superiority − this_runtime_superiority` (always ≥ 0).

## 4. Honest limits

- **Order matters slightly for the judge.** Candidates are presented
  in array order (baseline first, then routes in `SUPERIORITY_ROUTES`
  order). Position bias of LLM judges is a known artefact ; we do not
  yet shuffle.
- **Truncation risk.** With 4 candidates × (~25-word reformulation +
  ~250-word response) the judge prompt is comfortable, but adding a
  5th route would put the 1600-token cap under pressure.
- **No retries.** If `judgeResponses` returns unparseable JSON, the
  whole panel reads as failed even though we have 4 valid responses
  in hand. A v2 should fall back to a no-judge raw display.
- The fallback "reformulation absent → use original question" silently
  reduces cognitive divergence ; the judge will still score the
  candidate but the framing premise has effectively collapsed.
