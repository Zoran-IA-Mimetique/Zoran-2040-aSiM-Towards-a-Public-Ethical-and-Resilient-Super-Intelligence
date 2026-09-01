# QUESTION_REFORMULATION_SYSTEM

- Mission ID : `ZORAN_MULTI_WINNER_REFORMULATION_AND_DELTA_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `LLM_VS_ZORAN_BENCHMARKS.md`,
  `SEMANTIC_DELTA_ANALYSIS.md`,
  `COGNITIVE_PATH_EFFECTIVENESS.md`
- Sources    : `app/src/llm.js::reformulateQuestion`,
  `app/src/superiority.js::runSuperiorityComparison` (Phase 1 block).

## 1. Purpose — cognitive lens, not paraphrase

`reformulateQuestion()` is the entry point of the new pipeline. Each of
the three ZORAN strategies (frugale, anti_hallucination, structurelle)
calls it in parallel before any answer is generated. The function
returns a single dense sentence that **reframes** the user's question
through the strategy's cognitive priors.

The cognitive lens is materialised by injecting the strategy's top 6
laws into the system prompt :

```js
const lawsCtx = (laws || []).slice(0, 6).map(l =>
  `• ${l.id} — ${l.title}`).join('\n');
```

These 6 ids come from `route.laws_used` — the same head of the list
used downstream for synthesis, kept short here to bias the
reformulation without flooding it with description text.

## 2. System prompt rules (verbatim contract)

The system prompt enforces five hard rules :

1. The reformulation must **reveal HOW the strategy thinks the
   problem**, not restate its surface.
2. **No superficial paraphrase.** Reformulation = change of cognitive
   framing.
3. **One sentence**, 12–25 words maximum.
4. French, dense, no markdown.
5. **No final question mark** — formulate as a problematic assertion.

Three in-prompt examples seed the contrast on a canonical question
("comment réduire l'hallucination ?") :

- *Frugale* — "minimiser la surface d'erreur en compressant les
  sources actives au strict nécessaire"
- *Anti-hallu* — "garantir que chaque assertion runtime soit
  traçable à une loi vérifiable"
- *Structurelle* — "articuler les cadres local-intermédiaire-global
  pour borner l'espace d'inférence"

These three examples set the tonal envelope for any future user
question — the model generalises from them rather than receiving a
per-strategy rubric.

## 3. Token budget and call signature

```js
return await callLLM({
  system,                   // ~250 tokens
  user: question,           // ~30 tokens
  maxTokens: 120,           // hard cap on reformulation length
});
```

The `maxTokens: 120` cap is deliberate — it prevents a runaway
reformulation that would dominate the response budget downstream. With
12–25 French words expected, 120 tokens leaves headroom for
punctuation and a stop without truncating mid-clause.

The function inherits the standard `callLLM` envelope : returns
`{ ok, text, model, usage }` on success, `{ ok: false, reason }` on
network/auth failure. A failed reformulation does **not** abort the
pipeline ; the downstream phase falls back to the original question
(`reformByLabel.get(s.stratName) || question`).

## 4. Honest limits

- The "no paraphrase" rule is enforced by prompt, not by a similarity
  check. A lazy reformulation that swaps two synonyms will still pass
  through and pollute the divergence score.
- The 6-law lens is a head-slice — strategies whose discriminating
  laws sit at rank 7+ will reformulate identically to a sibling.
- The three seed examples are themselves opinionated ; they push
  reformulations into a *certain* prose register and may bias the
  judge into preferring that register.
- No embedding-based divergence check exists yet — see
  `SEMANTIC_DELTA_ANALYSIS.md` §4 for the v2 plan.
- The function is silently disabled without an API key.
