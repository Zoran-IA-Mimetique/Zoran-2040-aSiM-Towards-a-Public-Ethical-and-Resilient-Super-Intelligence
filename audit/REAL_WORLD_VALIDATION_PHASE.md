# REAL_WORLD_VALIDATION_PHASE

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `LLM_VS_ZORAN_BENCHMARKS.md`, `REAL_WORLD_ALIGNMENT_TESTS.md`,
  `BASELINE_ENGINE.md`
- Source     : `app/src/llm.js::judgeResponses`,
  `app/src/superiority.js::runSuperiorityComparison`.

## 1. The honest gap

As of 2026-05-16 the runtime superiority engine has **zero real-world
validation**. What we have :

- A judge that is itself Claude (`judgeResponses` calls `callLLM` with a
  4-axis scoring rubric). The judge model **could be the same Sonnet
  version** as the candidate models. That is by design cheap and by design
  biased.
- No curated dataset of (question, ground-truth answer) pairs.
- No domain-specific BTP / construction cases — the original `aSiM`
  motivation explicitly targets technical-engineering domains, none of
  which are covered.
- No human spot-checks recorded.
- No replication : a single API call decides each score on each axis.

Anyone reading the green `superiority +0.12` badge in the chat UI should
read it as *"a Claude jury agreed with itself once, today"* — not as
empirical truth.

## 2. Specific known biases of LLM-as-judge

1. **Self-preference** — judges built on the same family tend to score
   answers from the same family higher. We cannot rule this out for any
   of the 4 candidates (baseline + 3 routes) since all 4 *are* Claude.
2. **Length bias** — judges tend to reward longer responses on
   `coherence`. ZORAN routes inject context, which can leak into longer
   outputs. The `noise` axis partly counterbalances this, partly only.
3. **Format bias** — strict "no markdown, 3-5 sentences" reduces but does
   not eliminate stylistic preference.
4. **Single-shot variance** — running the same judge twice on the same
   inputs can flip the verdict on close calls.

## 3. Path forward (v2 plan, not yet implemented)

Three stacked layers, in increasing order of cost :

1. **Curated test set** — 30 to 100 hand-written (question, expected_axes)
   tuples covering general reasoning, BTP-specific questions, and known
   trap questions (off-topic, ambiguous, false premise). Stored in
   `tools/validation_set.json`. Run offline.
2. **Multi-judge ensemble** — replace the single Claude judge with a
   committee : Claude + GPT + Gemini, majority vote on the verdict, mean
   on the 4 axes. Reduces self-preference, raises cost by 3×.
3. **Human spot-checks** — for the top 10 % most extreme `runtime_superiority`
   deltas (positive or negative), pull a human reviewer to confirm or
   contradict the verdict. Tracked in `audit/HUMAN_SPOT_CHECKS.md` (to
   be created).

## 4. What the current engine is therefore allowed to claim

It is allowed to claim :

- "ZORAN's runtime can produce answers stylistically distinct from the
  baseline" — directly observable.
- "An LLM judge prefers ZORAN answers `X %` of the time on this small
  set of arbitrary questions" — observable, weak signal.

It is **not** allowed to claim :

- "ZORAN is more accurate than Claude alone" — no ground truth.
- "ZORAN hallucinates less" — no factual benchmark.
- "ZORAN works on real BTP problems" — no dataset exists yet.

This honesty bar should be preserved in any public communication of
benchmark numbers until phase 3 lands.
