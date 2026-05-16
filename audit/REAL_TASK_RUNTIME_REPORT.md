# REAL_TASK_RUNTIME_REPORT

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `RUNTIME_DELTA_ANALYSIS.md`, `COGNITIVE_PATH_EFFECTIVENESS.md`,
  `REAL_WORLD_VALIDATION_PHASE.md`,
  `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`
- Status     : **template only — no run executed yet**. The browser-side
  benchmark (`runSuperiorityComparison` in `app/src/superiority.js`)
  emits scores per-click but does not persist them. The offline
  multi-question runner is reserved for v2.

## 1. Purpose of this document

To define, in advance, the **shape** of the report that the offline
benchmark tool will produce once it exists. Defining the schema before
the runs prevents post-hoc cherry-picking of axes and freezes the
contract between the runner and downstream analysis (plots,
publication, audit trail).

## 2. JSON schema (one entry per question)

The offline runner will write `audit/REAL_TASK_RUNTIME_REPORT.json` :

```json
{
  "mission_id": "ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516",
  "run_date": "YYYY-MM-DDTHH:MM:SSZ",
  "model_candidate": "claude-sonnet-4-6",
  "model_judge": "claude-sonnet-4-6",
  "n_questions": 0,
  "results": [
    {
      "question_id": "Q001",
      "question": "...",
      "tag": "general | btp | trap | off_topic",
      "responses": [
        { "label": "BASELINE LLM brut",     "text": "...", "tokens_out": 0 },
        { "label": "ZORAN frugale",          "text": "...", "strategy": "frugale",          "laws_used": ["..."] },
        { "label": "ZORAN anti_hallucination","text": "...", "strategy": "anti_hallucination","laws_used": ["..."] },
        { "label": "ZORAN structurelle",     "text": "...", "strategy": "structurelle",     "laws_used": ["..."] }
      ],
      "judge": {
        "verdict": "ZORAN anti_hallucination",
        "scores": [ { "label": "...", "precision": 0.0, "hallucination": 0.0, "noise": 0.0, "coherence": 0.0, "comment": "..." } ]
      },
      "deltas": [
        { "label": "ZORAN frugale",          "precision_delta": 0.0, "hallucination_delta": 0.0, "noise_delta": 0.0, "coherence_delta": 0.0, "runtime_superiority": 0.0 }
      ],
      "latency_ms": 0,
      "cost_usd_est": 0.0
    }
  ],
  "summary": {
    "per_strategy": {
      "frugale":             { "n_wins": 0, "mean_runtime_superiority": 0.0 },
      "anti_hallucination":  { "n_wins": 0, "mean_runtime_superiority": 0.0 },
      "structurelle":        { "n_wins": 0, "mean_runtime_superiority": 0.0 }
    },
    "total_cost_usd_est": 0.0
  }
}
```

The browser-side `runSuperiorityComparison` already returns enough
information to populate one such entry per click ; the offline tool
just batches it.

## 3. CSV export (one row per (question, candidate))

Sister file `audit/REAL_TASK_RUNTIME_REPORT.csv` :

```
question_id,tag,strategy,precision,hallucination,noise,coherence,
precision_delta,hallucination_delta,noise_delta,coherence_delta,
runtime_superiority,is_winner,latency_ms
```

Strategy `BASELINE` rows have empty deltas. This format is
spreadsheet-friendly for quick win-rate pivots without touching the
JSON tree.

## 4. Suggested plots

Once the report has `n_questions ≥ 30`, the following plots become
informative :

1. **Radar chart per strategy** : 4 axes (precision, 1-hallucination,
   1-noise, coherence) ; one polygon per strategy + baseline.
2. **Histogram of `runtime_superiority`** : one per strategy, with the
   zero line marked. Asymmetry around zero is the headline finding.
3. **Stacked bar — wins per question tag** : `general / btp / trap /
   off_topic` × `4 candidates` ; reveals where each strategy actually
   helps.
4. **Cost-vs-gain scatter** : x = `cost_usd_est`, y =
   `runtime_superiority`. Anchors the honesty discussion : if a +0.05
   delta costs $0.05, is it worth it ?

These plots are deliberately left to a downstream notebook ; the
audit corpus stores only the raw report.

## 5. Honest status

- The runs have **not been executed**. This file exists so the v2
  tool has a fixed target.
- The browser-side engine works and is sufficient for ad-hoc demos —
  it is **not** sufficient for a published result.
- The offline runner, the curated `validation_set.json`, and the
  multi-judge ensemble are all preconditions ; see
  `REAL_WORLD_VALIDATION_PHASE.md` §3 for the dependency chain.
- Publishing any number from this report without those three pieces
  in place violates the mission's honesty contract.
