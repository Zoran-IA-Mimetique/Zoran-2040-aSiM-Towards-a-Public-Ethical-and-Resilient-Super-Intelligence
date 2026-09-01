# RUNTIME_DELTA_VISUALIZATION

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `RUNTIME_DELTA_ANALYSIS.md`,
  `WINNER_SELECTION_EXPLAINABILITY.md`, `LLM_VS_ZORAN_BENCHMARKS.md`.
- Sources    : `app/src/superiority.js::renderComparison`,
  helper `signed()`, CSS classes `sup-deltas-table`, `is-rank-1`,
  `good`, `bad`, `rank-1`, `rank-2`, `rank-3`, `baseline`.

## 1. Strict priority order (mission anti-inflation)

Reading order in the rendered container is fixed and intentional :

1. **Verdict + divergence banner** — compact, single row. Shows the
   judge `verdict`, candidate count, latency, and two coloured
   divergence badges. Highest visual priority.
2. **Delta table** — 9 columns, sorted by `runtime_superiority`
   descending. Always visible, no accordion.
3. **Reformulations accordion** — `<details open>`, 1–2 lines per
   candidate. Open by default because reformulations are short and
   carry the cognitive signal.
4. **Responses accordion** — `<details>` closed by default. Full prose
   is secondary ; the user must opt in to read it.

This ordering is the structural antidote to "wall of text" inflation
that the parent mission produced.

## 2. The nine columns

| # | Column         | Content                                            |
|---|----------------|-----------------------------------------------------|
| 1 | `#`            | rank by `runtime_superiority`, 1 = winner           |
| 2 | `Candidat`     | label (`BASELINE LLM brut`, `ZORAN frugale`, …)     |
| 3 | `prec`         | `precision` + signed subscript `precision_delta`    |
| 4 | `hallu`        | `hallucination` + signed subscript `hallu_delta`    |
| 5 | `noise`        | `noise` + signed subscript `noise_delta`            |
| 6 | `coh`          | `coherence` + signed subscript `coherence_delta`    |
| 7 | `sem.Δ`        | per-candidate `semantic_delta` (judge-assessed)     |
| 8 | `superiority`  | composite `runtime_superiority`, signed             |
| 9 | `winner_Δ`     | `top_superiority − this_superiority`, 0 for rank 1  |

Columns 3–6 carry two values in one cell : the raw score `0.00..1.00`
on the main line, and a coloured signed subscript with the delta vs
baseline (e.g. `0.84 +0.07`). The subscript is rendered via the
`signed()` helper, which omits the value when `|delta| < 0.005`.

## 3. Colour coding by *direction of merit*

Signs are coloured by what is *better* on each axis, not by sign alone :

- `precision_delta > 0` → green ; `< 0` → red.
- `hallucination_delta < 0` → green ; `> 0` → red.
- `noise_delta < 0` → green ; `> 0` → red.
- `coherence_delta > 0` → green ; `< 0` → red.
- `runtime_superiority > 0` → green ; `< 0` → red.

Row tinting in the reformulation/response blocks follows rank, not
merit :

- `#1` blue (canonical winner colour)
- `#2` cyan
- `#3` violet (palieronic)
- `baseline` violet (sits outside the ranked ladder)

The rank-1 row of the table carries the `is-rank-1` CSS class
(background highlight + bold rank cell), so the winner is identifiable
at a glance without parsing any number.

## 4. Divergence badges and warnings

The top banner renders two badges via `divergenceBadge(v, label)` :

| Value             | Class | Meaning                            |
|-------------------|-------|------------------------------------|
| `v ≥ 0.30`        | green | meets mission target               |
| `0.15 ≤ v < 0.30` | neutral | marginal                         |
| `v < 0.15`        | red   | reformulations / responses too close |

When `reformulation_divergence < 0.30`, an inline
`⚠ reformulations trop proches` badge is appended. This is the only
warning the user gets that the cognitive-diversity premise of the
mission failed for this query (see `SEMANTIC_DELTA_ANALYSIS.md`).

## 5. Honest limits

- Colour is the only quantitative signal in the table — no error bars,
  no confidence intervals (single-shot judge, no replication).
- The `is-rank-1` highlight tells you which candidate the composite
  *picked*, not whether the gap to rank 2 is statistically significant.
- `semantic_delta` is rendered raw (no colouring) because its
  direction-of-merit is ambiguous — a high value can mean
  *insightfully different* or *off-topic*.
- The accordion-closed default for responses is a deliberate UX bet :
  it reduces visual noise but also makes it easier for the user to
  trust the verdict without reading the prose. The full text is
  one click away — by design, but worth flagging.
