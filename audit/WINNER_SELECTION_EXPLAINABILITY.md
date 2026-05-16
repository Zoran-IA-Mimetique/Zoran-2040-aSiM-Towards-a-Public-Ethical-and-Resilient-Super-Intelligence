# WINNER_SELECTION_EXPLAINABILITY

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RUNTIME_DELTA_VISUALIZATION.md`, `RUNTIME_SUPERIORITY_ENGINE.md`,
  `RUNTIME_DELTA_ANALYSIS.md`, `SEMANTIC_DELTA_ANALYSIS.md`,
  `LLM_VS_ZORAN_BENCHMARKS.md`.
- Sources    : `app/src/superiority.js::runSuperiorityComparison`
  (`winner_delta` pass, `verdict` propagation), `renderComparison`
  (`is-rank-1`, `sup-winner-tag`, verdict banner).

## 1. Two independent winner signals

The pipeline produces two winner indications that the user can
cross-check :

1. **Judge `verdict`** — a single string the judge LLM emits in its
   JSON output, expected to match one of the candidate labels. Shown
   in the top banner : `★ Verdict juge : <label>`. Cards whose label
   contains the verdict string carry the `sup-winner-tag` `★ WINNER`.
2. **Composite rank #1** — the candidate with the highest
   `runtime_superiority`. Highlighted in the delta table via the
   `is-rank-1` row class (background tint + bold rank cell).

When these two agree, the user sees a single coherent winner. When
they disagree (judge picks A on free-text intuition but composite
ranks B higher on the weighted four-axis sum), **both signals are
shown** — we explicitly do not hide the disagreement. That
disagreement is itself useful diagnostic information.

## 2. Why the 9-column table makes the choice explainable

The composite that drives rank is :

```
runtime_superiority =
    0.30 · precision_delta
  + 0.30 · (−hallucination_delta)
  + 0.20 · (−noise_delta)
  + 0.20 · coherence_delta
```

Every term in this formula has a column in the table (cols 3–6), and
the result has its own column (8). A user can therefore read
left-to-right and **reconstruct** why the winner won :

- Column 3 (`prec`) and column 4 (`hallu`) carry 60 % of the weight ;
  these are where most rank decisions are made.
- Column 5 (`noise`) and column 6 (`coh`) act as tie-breakers (20 %
  each).
- Column 8 (`superiority`) shows the weighted sum, signed and coloured.
- Column 9 (`winner_Δ`) shows exactly **how much each loser misses by**
  on the composite scale.

There is no hidden ranking input. The judge sets the four raw axes,
the composite is deterministic from there, and `winner_delta` is
deterministic from the composite. Anyone who disagrees with the
ranking can point to the precise axis that flipped it.

## 3. The `winner_delta` semantics

```js
const top = sortedBySup[0].runtime_superiority;
for (const d of deltas) d.winner_delta = +(top - d.runtime_superiority).toFixed(3);
```

Properties :

- Always `≥ 0`.
- Exactly `0` for the rank-1 candidate.
- Reads as **"how much composite would this candidate need to gain to
  tie the winner"**.
- Independent of the baseline — it is the gap *between candidates*,
  not vs the baseline, which is what users actually care about when
  deciding which strategy to trust on this query.

A `winner_Δ` of `0.02` on rank 2 essentially means "indistinguishable
within judge noise" ; a `winner_Δ` of `0.20` means "clear
separation". We do **not** annotate this threshold in the UI — the
single-shot judge has no notion of significance.

## 4. Honest limits

- **The judge is Claude.** Both the per-axis scores and the free-text
  verdict come from the same LLM that wrote three of the candidates.
  Self-preference cannot be measured from inside this pipeline.
- **No significance test on `winner_delta`.** A 0.02 gap and a 0.20
  gap look visually similar in the table ; only the colour intensity
  of `superiority` hints at magnitude.
- **Verdict label matching is substring-based.**
  `r.label.includes(verdict)` in `renderComparison` will both
  false-positive (verdict `"ZORAN"` matches every route) and false-
  negative (judge emits a slight rephrase of the label). A v2 needs
  exact-label matching with a fallback to nearest-label.
- **No curated test set** means we have no measurement of how often
  the composite winner aligns with a human-judged winner. The
  explainability is structural, not empirical.
