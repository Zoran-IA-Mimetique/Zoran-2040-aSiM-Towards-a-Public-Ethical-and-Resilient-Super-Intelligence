# RUNTIME_DELTA_ANALYSIS

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `LLM_VS_ZORAN_BENCHMARKS.md`, `BASELINE_COMPARISON_SYSTEM.md`,
  `REAL_WORLD_VALIDATION_PHASE.md`
- Sources    : `app/src/superiority.js::runSuperiorityComparison`
  (`deltas[]` block), `app/src/llm.js::judgeResponses`,
  `app/src/superiority.js::renderComparison` (badge colours).

## 1. Reading a delta — sign conventions

Each ZORAN route produces four raw deltas against the baseline LLM. They
do **not** all read the same way ; one must internalise the sign
convention before drawing any conclusion.

| Delta                  | What positive means         | What negative means         | Good direction |
|------------------------|------------------------------|------------------------------|----------------|
| `precision_delta`      | ZORAN more accurate          | ZORAN less accurate          | **positive**   |
| `hallucination_delta`  | ZORAN invents more           | ZORAN invents less           | **negative**   |
| `noise_delta`          | ZORAN more verbose           | ZORAN denser                 | **negative**   |
| `coherence_delta`      | ZORAN better structured      | ZORAN less coherent          | **positive**   |

`renderComparison` colours each badge accordingly :
- green when the delta points in its *good* direction,
- red when it points in its *bad* direction,
- neutral when exactly zero.

This is why a green `hallu −0.12` and a green `prec +0.08` both read as
ZORAN winning that axis even though their signs are opposite.

## 2. Composite — `runtime_superiority`

The composite re-orients every term to the "positive = ZORAN better"
convention before summing :

```
runtime_superiority =
    0.30 · precision_delta
  + 0.30 · (−hallucination_delta)
  + 0.20 · (−noise_delta)
  + 0.20 · coherence_delta
```

A positive composite means the route beat the baseline on the weighted
sum of the four axes. The badge `superiority +0.NN` is rendered green
in that case, red otherwise. The threshold is exactly zero ; no
significance test is performed (single-shot judge call, no replication
yet — see `REAL_WORLD_VALIDATION_PHASE.md`).

## 3. What deltas are realistic to expect

The baseline is **strong**. Claude Sonnet alone, asked a 3–5 sentence
factual question, will already produce a coherent, low-hallucination
answer. The realistic prior is therefore :

- Most absolute deltas in `[−0.15, +0.15]`.
- Most composite scores in `[−0.05, +0.10]`.
- Verdict ties are not uncommon : the judge often reports the same
  number for two responses and picks one as `verdict` arbitrarily.
- A green badge of `+0.20` or above on an arbitrary user query is more
  likely a judge variance artefact than a real signal — replicate
  before celebrating.
- Negative composites are *expected* on questions outside the domain
  of the loaded laws (the ZORAN route injects irrelevant context that
  the judge penalises on `noise`).

## 4. Mapping deltas back to ZORAN strategies

Per the hypothesis recorded in `COGNITIVE_PATH_EFFECTIVENESS.md`, each
strategy is expected to push different axes :

| Route                 | Expected to win    | Expected to lose / be neutral |
|-----------------------|--------------------|---------------------------------|
| `frugale`             | `noise_delta` (−)  | `coherence_delta` (less context to structure) |
| `anti_hallucination`  | `precision_delta` (+), `hallucination_delta` (−) | `noise_delta` (defensive verbosity) |
| `structurelle`        | `coherence_delta` (+) | `noise_delta` (longer frame articulation) |

These are *predictions to test*, not observed facts. The composite
score being positive on a strategy does not yet confirm its expected
axis — the judge could be rewarding the wrong reason. A real
attribution study needs the v2 multi-judge ensemble and a per-axis
significance test, neither of which exist today.

## 5. UI signal — what the user sees

- Per-card row 1 : raw scores `prec / hallu / noise / coh` on `[0..1]`.
- Per-card row 2 (ZORAN only) : `Δ vs baseline` with colour signs.
- Bold final badge : `superiority ±X.XXX` with green/red colour.
- Top banner : `Verdict juge : <label>` plus latency in ms.

Anything not green-bold-positive is, honestly, indeterminate.
