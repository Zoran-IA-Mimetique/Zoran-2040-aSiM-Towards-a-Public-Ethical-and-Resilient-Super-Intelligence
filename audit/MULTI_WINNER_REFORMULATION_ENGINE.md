# MULTI_WINNER_REFORMULATION_ENGINE

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `LLM_VS_ZORAN_BENCHMARKS.md`, `RUNTIME_DELTA_ANALYSIS.md`,
  `QUESTION_REFORMULATION_SYSTEM.md`, `RESPONSE_COMPARISON_ENGINE.md`,
  `SEMANTIC_DELTA_ANALYSIS.md`, `WINNER_SELECTION_EXPLAINABILITY.md`
- Sources    : `app/src/superiority.js::runSuperiorityComparison`,
  `app/src/llm.js::reformulateQuestion`, `synthesizeRoute`,
  `synthesizeBaseline`, `judgeResponses`,
  `app/src/chat.js::runSynthesis` (branch `getBenchmarkEnabled()`).

## 1. Goal — beyond direct answer comparison

`RUNTIME_SUPERIORITY_ENGINE.md` answered a narrow question : *with the
same prompt, does ZORAN context beat no-context ?* This mission extends
the experiment one level deeper : *each ZORAN strategy first
**reformulates** the question through its own cognitive lens, then
answers its own reformulation*. The judge then sees not just which
answer is better but **how differently each strategy framed the
problem**.

The deliverable is therefore a 3-phase pipeline plus a new global axis
(`reformulation_divergence`) on top of the existing 4 per-candidate
axes.

## 2. Three-phase pipeline

```
question
  │
  ├─ Phase 1 — REFORMULATION (parallel, Promise.allSettled)
  │     reformulateQuestion( question, lens = frugale_top6_laws )
  │     reformulateQuestion( question, lens = anti_hallu_top6_laws )
  │     reformulateQuestion( question, lens = structurelle_top6_laws )
  │     + synthesizeBaseline( question )                       # no lens
  │
  ├─ Phase 2 — RESPONSE (parallel)
  │     synthesizeRoute( reform_frugale,      laws = top10 )
  │     synthesizeRoute( reform_anti_hallu,   laws = top10 )
  │     synthesizeRoute( reform_structurelle, laws = top10 )
  │     (baseline already answered in Phase 1 directly)
  │
  └─ Phase 3 — JUDGEMENT (single call, maxTokens 1600)
        judgeResponses( question, responses, reformulations )
            → 4 axes per candidate + semantic_delta
            → 2 GLOBAL scores : reformulation_divergence, response_divergence
            → verdict (label of the winner)
```

Phase 1 reformulations are stored in `reformByLabel` and fed to Phase 2
as the *actual user prompt* — i.e. each strategy answers the question
*it saw*, not the original. This is the key change from the parent
mission.

## 3. Cognitive divergence (not lexical)

The system prompt of `reformulateQuestion` forbids surface paraphrase :
12–25 words, one sentence, no question mark (problematic-assertion
form), top 6 laws of the route as cognitive lens, three generic
in-prompt examples seeding the contrast for the three default routes.
This is enforced *behaviorally* by prompt, not *measurably* by
embeddings (see limits §5 and `QUESTION_REFORMULATION_SYSTEM.md`).

## 4. Cost envelope

7 Claude calls per benchmarked question (Sonnet 4.6 default) :

| Call               | Tokens in/out | Approx USD |
|--------------------|----------------|------------|
| baseline answer    | 30 / 250       | $0.003     |
| reformulate × 3    | 250 / 80 each  | $0.012     |
| respond × 3        | 350 / 250 each | $0.015     |
| judge              | 2200 / 900     | $0.018     |
| **Total**          |                | **$0.04–0.10** |

Without an API key the whole pipeline is disabled — `runSynthesis`
short-circuits and the UI displays a clear "clé API non configurée"
message.

## 5. Honest limits

- The judge is still Claude — same self-preference bias as the parent
  mission, now extended to a new global axis.
- `reformulation_divergence` is itself a judge opinion, not an
  embedding distance. A pair of reformulations could be deemed
  divergent by the judge while being near-identical in vector space.
- Phase 2 answers a *judge-influenced rewriting* of the question — a
  bad reformulation can poison its own response without the user
  seeing the chain of cause.
- No curated test set yet ; runs are anecdotal and non-replicated.
- 7 calls × judge cap 1600 tokens means a single bench can spike to
  ~$0.10 — bench mode is off by default.
