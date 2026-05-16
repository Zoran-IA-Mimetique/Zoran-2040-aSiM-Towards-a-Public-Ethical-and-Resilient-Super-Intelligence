# BASELINE_COMPARISON_SYSTEM

- Mission ID : `ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`, `BASELINE_ENGINE.md`,
  `COGNITIVE_SELECTION_ENGINE.md`,
  `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeBaseline`, `synthesizeRoute`,
  `app/src/superiority.js` (`SUPERIORITY_ROUTES` constant).

## 1. Four baselines, four roles

The benchmark contrasts four reference points. Only the first (LLM brut) is
called live during the in-browser superiority run ; the other three are
referenced for interpretation and live elsewhere in the audit corpus.

| # | Baseline               | What it represents                                  | Where it lives |
|---|------------------------|-----------------------------------------------------|----------------|
| 1 | **LLM brut**           | Claude with no ZORAN context — the ceiling we must beat | `synthesizeBaseline` (live) |
| 2 | **naive_selection**    | Top-10 by `selection_priority + 0.30·topic_score`       | `BASELINE-naive_selection_priority` (tools/) |
| 3 | **random route**       | Uniform sample of 10 laws                                | `BASELINE-random` (tools/) |
| 4 | **ZORAN routes**       | 3 competing strategies (frugale / anti_hallucination / structurelle) | `synthesizeRoute` × 3 |

## 2. Baseline 1 — LLM brut

`synthesizeBaseline(question)` sends a single user message to Claude with
the minimal system prompt :

```
Tu es un assistant. Réponds à la question en 3-5 phrases denses
en français, sans markdown.
```

No laws, no frames, no parents. This is the honest representation of "what
the user would get by just chatting with Claude without ZORAN in the
middle". `max_tokens = 600`. Cost ≈ $0.003 / call.

## 3. Baseline 4 — what ZORAN routes inject

`synthesizeRoute({ question, laws, strategyLabel })` builds a system
prompt that lists up to 10 laws as the *only allowed* cognitive frame :

```
Tu es ZORAN-<strategyLabel>, sélectionne uniquement parmi les lois
ci-dessous comme cadre cognitif.
Lois activées par la stratégie :
• <id1> — <title1> : <description tronquée 200 char>
• <id2> — <title2> : <description tronquée 200 char>
...
Réponds à la question en 3-5 phrases denses en français,
sans markdown, en t'appuyant uniquement sur ces lois.
```

The three strategies in `SUPERIORITY_ROUTES` are :

- **`frugale`** — minimises law count for the given budget, expected to
  reduce verbosity / noise.
- **`anti_hallucination`** — privileges high-`stability` /
  `factual_anchor` laws, expected to reduce hallucination.
- **`structurelle`** — privileges hierarchy / frame-coherent paths,
  expected to lift the coherence axis.

The laws actually passed are `route.laws_used` from the upstream
`compete()` result — *not* recomputed.

## 4. Baselines 2 & 3 — context only

`naive_selection` and `random` are not invoked during the in-browser run
(would inflate API cost). They are kept in the offline competition reports
(`audit/PATH_COMPETITION_REPORT.json`) so the **runtime_superiority**
deltas of §RUNTIME_SUPERIORITY_ENGINE can be cross-referenced against
the **structural** deltas of `BASELINE_ENGINE.md`. The two views measure
different things : structural quality of the law subgraph vs end-user
answer quality after LLM synthesis.

## 5. Why this matters / what it does not prove

- Beating LLM brut is necessary but not sufficient — see
  `REAL_WORLD_VALIDATION_PHASE.md` for what would constitute a real proof.
- The 3 ZORAN routes share the same Claude model, same temperature, same
  token budget : any delta is attributable to the injected law context.
- Strategies absent from `SUPERIORITY_ROUTES` (e.g. `exploratoire`,
  `adversariale`) are deliberately not benchmarked yet — cost ceiling.
