# LLM_VS_ZORAN_BENCHMARKS

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `BASELINE_COMPARISON_SYSTEM.md`, `RUNTIME_DELTA_ANALYSIS.md`,
  `REAL_WORLD_VALIDATION_PHASE.md`
- Sources    : `app/src/llm.js::judgeResponses`,
  `app/src/superiority.js::runSuperiorityComparison`,
  `app/src/chat.js::runSynthesis` (benchmark branch).

## 1. Methodology in one diagram

```
   user question
        │
        ▼
 ┌──────────────┐    ┌──────────────────────┐
 │ baseline LLM │    │ 3 ZORAN routes        │
 │ (no context) │    │ (frugale, anti_hallu, │
 │              │    │  structurelle)        │
 └──────┬───────┘    └──────────┬───────────┘
        ▼                       ▼
        └──────────► JUDGE LLM ◄┘
                       │
                       ▼
        JSON { verdict, scores[ 4× {precision, hallucination,
                                    noise, coherence, comment} ] }
                       │
                       ▼
     deltas vs responses[0] (baseline) + composite
```

Trigger : `getBenchmarkEnabled() === true` (toggle in ⚙ chat settings,
stored in `localStorage` under `zoran.bench.enabled`).

## 2. The four scoring axes

The judge rubric is fixed text in `judgeResponses` :

| Axis            | Range   | Direction          | What it tries to capture |
|-----------------|---------|--------------------|---------------------------|
| `precision`     | 0..1    | higher = better    | apparent factual accuracy |
| `hallucination` | 0..1    | **lower = better** | risk that the answer invents |
| `noise`         | 0..1    | **lower = better** | verbosity / digression |
| `coherence`     | 0..1    | higher = better    | internal logic & structure |

A short free-text `comment` (one sentence) is also requested per response.

## 3. Strict JSON contract

The judge system prompt demands :

```
{"verdict":"<label gagnant>",
 "scores":[
   {"label":"<l1>","precision":0.0,"hallucination":0.0,
    "noise":0.0,"coherence":0.0,"comment":"<1 phrase>"},
   ...
 ]}
```

Parsing is tolerant : the engine extracts the first `{ ... }` block via
regex (`r.text.match(/\{[\s\S]*\}/)`) and `JSON.parse` it. On failure the
whole benchmark is marked not-ok and the UI displays
"⚠ Benchmark échoué (judge_unparsable)".

## 4. Delta computation

For each ZORAN response `r`, the engine matches it to a judge score by
label, then computes :

```js
precision_delta     = s.precision     − baselineScore.precision
hallucination_delta = s.hallucination − baselineScore.hallucination
noise_delta         = s.noise         − baselineScore.noise
coherence_delta     = s.coherence     − baselineScore.coherence
```

All four are rounded to 3 decimals (`+(x).toFixed(3)`).

## 5. Composite — runtime_superiority

```
runtime_superiority =
    0.30 · precision_delta
  + 0.30 · (−hallucination_delta)
  + 0.20 · (−noise_delta)
  + 0.20 · coherence_delta
```

Both `hallucination_delta` and `noise_delta` are negated so the composite
always reads "positive = ZORAN better".

Weighting rationale : 60 % on factual axes (precision + anti-hallucination),
40 % on stylistic axes (compression + structure). Not tuned, not learned —
a pragmatic default to be revisited once the curated set exists.

## 6. Limits this section will not hide

- Single-shot per axis : the judge sees each response exactly once.
- The judge IS Claude. Self-preference cannot be measured without an
  external model — out of scope for v1.
- Only 3 of the 6 ZORAN strategies are benchmarked (cost ceiling).
- Composite weights are arbitrary, not empirically derived.
