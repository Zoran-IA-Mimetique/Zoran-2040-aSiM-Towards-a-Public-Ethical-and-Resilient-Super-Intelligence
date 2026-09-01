# SEMANTIC_DELTA_ANALYSIS

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RESPONSE_COMPARISON_ENGINE.md`, `RUNTIME_DELTA_VISUALIZATION.md`,
  `RUNTIME_DELTA_ANALYSIS.md`, `LLM_VS_ZORAN_BENCHMARKS.md`.
- Sources    : `app/src/llm.js::judgeResponses` (JSON schema),
  `app/src/superiority.js::runSuperiorityComparison`
  (`semantic_delta`, `reformulation_divergence`, `response_divergence`
  surfacing), `renderComparison` (badge + warning).

## 1. The three divergence numbers

The judge JSON returns three distinct quantities, all in `[0, 1]` :

| Field                       | Scope        | What it measures                                |
|-----------------------------|--------------|--------------------------------------------------|
| `semantic_delta` (per card) | per candidate | how far this candidate's response sits from the mean of the others |
| `reformulation_divergence`  | global       | how cognitively (not lexically) far the 3 reformulations are from each other |
| `response_divergence`       | global       | how semantically far the 3+1 final responses are from each other |

Per-candidate `semantic_delta` lives in column 7 of the delta table
(`sem.Δ`). The two global scores live in the top banner via
`divergenceBadge(v, label)`.

## 2. Mission target on `reformulation_divergence`

The premise of this mission is that three ZORAN strategies should
**frame** the same question differently. Operationally we encode that
as :

```
reformulation_divergence ≥ 0.30   →  premise satisfied (green badge)
0.15 ≤ value < 0.30               →  marginal (neutral badge)
value < 0.15                      →  premise violated (red badge)
```

When `reformulation_divergence < 0.30`, the UI appends the inline
warning :

```
⚠ reformulations trop proches
```

This is the **only** explicit failure signal the user sees when the
cognitive-lens layer collapses into paraphrase. Without it, a
high-precision baseline can superficially look like a ZORAN win while
the three "routes" are actually saying the same thing in three voices.

## 3. `response_divergence` — secondary signal

`response_divergence` follows the same colour ladder but carries no
inline warning. The reason : even with strong reformulation
divergence, responses can legitimately converge if the underlying
fact set is narrow. A converging response with a divergent
reformulation is acceptable ; the inverse is the failure mode worth
flagging.

A useful joint reading :

| `reform_div` | `resp_div` | Interpretation                                  |
|--------------|-----------|--------------------------------------------------|
| high         | high      | strong cognitive diversity, distinct answers     |
| high         | low       | strategies frame differently but converge on facts (OK) |
| low          | low       | premise failed — three near-identical runs       |
| low          | high      | answers diverge for reasons *not* tied to the framing — judge variance suspected |

## 4. Per-candidate `semantic_delta`

The judge is asked, per card, "how far does THIS candidate's response
sit from the average of the others ?" Rendered raw in column 7,
**without** colour because its direction-of-merit is ambiguous : a
high `sem.Δ` can mean a genuinely different angle (good) or an
off-topic / hallucinated frame (bad). It therefore does not feed into
`runtime_superiority`.

## 5. Honest limits

- **No embeddings.** All three divergence numbers are judge estimates,
  not cosine distances on a sentence-embedding model. We are asking
  the same LLM that wrote the candidates to estimate how different
  they are.
- **Single judge.** Replication would require an ensemble of distinct
  models, which is out of scope while only Claude is wired in.
- **Threshold 0.30 is a guess.** We have no curated set on which to
  validate that 0.30 actually correlates with humanly-perceptible
  cognitive divergence. It is a deliberate pessimistic prior — better
  to flag too often than to silently mislabel paraphrase as framing.
- **`semantic_delta` may correlate with response length.** Long
  responses provide more surface for the judge to spot differences.
  We do not normalise.
