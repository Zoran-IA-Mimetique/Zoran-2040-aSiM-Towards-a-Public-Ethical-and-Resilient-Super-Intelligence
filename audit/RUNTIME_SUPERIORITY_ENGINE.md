# RUNTIME_SUPERIORITY_ENGINE

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `BASELINE_COMPARISON_SYSTEM.md`, `LLM_VS_ZORAN_BENCHMARKS.md`,
  `RUNTIME_DELTA_ANALYSIS.md`, `COGNITIVE_SELECTION_ENGINE.md`,
  `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`
- Sources    : `app/src/superiority.js::runSuperiorityComparison`,
  `app/src/llm.js::synthesizeBaseline`, `synthesizeRoute`, `judgeResponses`,
  `callLLM`, `app/src/chat.js::runSynthesis` (branch `getBenchmarkEnabled()`).

## 1. Goal

Answer one question honestly : *does feeding Claude a top-K ZORAN law context
produce a measurably better answer than calling Claude with no context at
all ?* The engine runs a controlled 5-call experiment per user query, scored
by an LLM-as-judge, and surfaces deltas in the chat UI.

## 2. Pipeline (1 baseline + 3 routes + 1 judge)

```
question
  ├── synthesizeBaseline(question)                    # Claude, no ZORAN
  ├── synthesizeRoute(question, laws=frugale)         # Claude + 10 laws
  ├── synthesizeRoute(question, laws=anti_halluc)     # Claude + 10 laws
  ├── synthesizeRoute(question, laws=structurelle)    # Claude + 10 laws
  │      (all 4 launched via Promise.allSettled in parallel)
  └── judgeResponses(question, [r0..r3])              # Claude as judge
            ↓
       parse JSON → 4-axis scores → delta vs baseline → composite
```

The three competing strategies are hard-coded in `SUPERIORITY_ROUTES =
['frugale', 'anti_hallucination', 'structurelle']`. Laws are pulled from
`routeResults.routes[*].laws_used` (top 10 of each strategy, produced
upstream by the cognitive path competition engine).

## 3. The 7 runtime scores

| Score | Sign convention | Source |
|-------|-----------------|--------|
| `precision_delta`        | `+` = ZORAN more accurate than baseline | `judge.scores[i].precision − baseline.precision` |
| `hallucination_delta`    | `−` = ZORAN hallucinates less           | `judge.scores[i].hallucination − baseline.hallucination` |
| `noise_delta`            | `−` = ZORAN less verbose                | `judge.scores[i].noise − baseline.noise` |
| `coherence_delta`        | `+` = ZORAN more coherent               | `judge.scores[i].coherence − baseline.coherence` |
| `compression_delta`      | derived, `−` = denser (proxy = noise_delta) | LLM-as-judge axis `noise` |
| `runtime_superiority`    | composite, `+` = ZORAN wins             | see formula §4 |
| `real_world_score`       | placeholder until human eval lands      | currently = `runtime_superiority` |
| `baseline_delta`         | scalar shortcut = `runtime_superiority` | for downstream reports |

## 4. Composite formula

```
runtime_superiority =
    0.30 · (precision_zoran − precision_baseline)
  + 0.30 · (hallucination_baseline − hallucination_zoran)
  + 0.20 · (noise_baseline − noise_zoran)
  + 0.20 · (coherence_zoran − coherence_baseline)
```

All four terms are oriented so that *positive contributes to ZORAN winning*.
The 30/30/20/20 weighting prioritises factual axes over stylistic ones.

## 5. Cost per question

5 Claude calls (Sonnet 4.6 default) per submitted question :

| Call             | Tokens in/out (typical) | Approx cost USD |
|------------------|-------------------------|-----------------|
| baseline         | 30 / 250                | $0.003          |
| route × 3        | 350 / 250 each          | $0.015 total    |
| judge            | 1400 / 600              | $0.012          |
| **Total**        |                         | **$0.02–0.05**  |

## 6. Honest limits

- The judge is itself Claude — auto-evaluation bias is real (see
  `REAL_WORLD_VALIDATION_PHASE.md`).
- No human ground truth, no BTP-specific dataset, no statistical replication.
- Without an API key the entire engine is disabled — UI shows a clear
  "clé API non configurée" message via `runSynthesis`.
