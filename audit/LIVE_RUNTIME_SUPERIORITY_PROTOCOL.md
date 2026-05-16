# LIVE_RUNTIME_SUPERIORITY_PROTOCOL

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `RESPONSE_SURGERY_ENGINE.md`,
  `FAILURE_EXTRACTION_ENGINE.md`,
  `DOMAIN_DOMINANCE_MATRIX.md`,
  `ZORAN_AUTONOMY_STRESS_REPORT.md`,
  `BASELINE_COMPARISON_SYSTEM.md`
- Sources    : `app/src/superiority.js::runSuperiorityComparison`,
  `app/src/llm.js` (`callLLM`, `getModel`, `getApiKey`),
  `tools/run_superiority_benchmark.mjs` (à créer — V1 absent).

## 1. Architecture prête pour benchmark live

`runSuperiorityComparison(question, allNodes, routeResults)` est
câblé pour fonctionner live dès qu'une clé API Anthropic est en
`localStorage['zoran.anthropic.key']` (ou injectée par un harnais
Node). Il produit jusqu'à 8 candidats par prompt :

```
[0] CLAUDE brut         (synthesizeBaseline)
[1] ZORAN Orchestré     (synthesizeOrchestrated)        ← nouveau
[2] ZORAN Frugale       (synthesizeRoute)
[3] ZORAN Anti-hallu    (synthesizeRoute)
[4] ZORAN Structurelle  (synthesizeRoute)
+ surgery V1 sur chaque non-winner (si activée)
+ 1 juge (judgeResponses) → notes /20 + verdict
```

Le harnais Node manquant doit charger `prompts.json` (50 prompts
du stress report), exécuter `runSuperiorityComparison` par prompt,
dumper `benchmark_live_results.json`, puis agréger via
`aggregateFailurePatterns`.

## 2. Clé API, modèle, volume

- **Clé** : `ANTHROPIC_API_KEY` (env) ou `localStorage` browser.
- **Modèle défaut** : `claude-sonnet-4-6`
  (`DEFAULT_MODEL` dans `llm.js`). Harnais doit accepter
  `--model claude-haiku-4-5` pour runs explo.
- **Calls par prompt (sans surgery)** : 1 baseline + 1 orchestré +
  3 reformulations + 3 réponses + 1 juge = **9 calls**.
- **Avec surgery V1** sur ~4 non-winners : **+4 = 13 calls**.
- **Volume total cible** : 50 prompts × 9 calls = **~450 calls**
  (sans surgery), **~650** (avec), **~2800** pour comparatif
  modèle Haiku/Sonnet/Opus (3 × ~900).

## 3. Coût indicatif (mai 2026, à valider via `usage`)

| Modèle               | $ / Mtok in | $ / Mtok out | ~$ / prompt | 50 prompts |
|----------------------|-------------|--------------|-------------|------------|
| `claude-haiku-4-5`   | ~0.25       | ~1.25        | ~$0.005     | ~$0.25     |
| `claude-sonnet-4-6`  | ~3.00       | ~15.00       | ~$0.05      | ~$2.50     |
| `claude-opus-4-7`    | ~15.00      | ~75.00       | ~$0.25      | ~$12.50    |

Avec surgery (+30 % calls) → ×1.45. Comparatif 3-modèles total
≈ **$15** par run.

## 4. Éviter le cache LLM + variance multi-runs

`callLLM` n'utilise pas `cache_control` (aucun cache serveur).
Bonnes pratiques :

1. **Sel `--run-id 2026-05-16-T1`** collé en commentaire user pour
   disperser les empreintes hash.
2. **Mélanger l'ordre** des prompts entre runs (anti-warmup).
3. **N runs ≥ 3** par config → `σ(grade_20)`. Écart `< 2σ` =
   non-significatif.
4. **Logger `data.model`** (déjà fait via `r.model`) — vérifier que
   les réponses viennent bien du modèle demandé (alias backend
   possible).
5. **Spotcheck** : 5 prompts × 3 runs parallèles, vérifier que
   `verdict` change parfois — sinon suspicion cache implicite.

Le `ZORAN_AUTONOMY_STRESS_REPORT` actuel est offline / heuristique
Python : 0 calls, 0 variance. Le passage live est la condition sine
qua non d'une mesure de supériorité réelle.

## 5. Limites honnêtes

- **Harnais Node absent** : `tools/run_superiority_benchmark.mjs`
  n'existe pas.
- **Pas de comparatif modèle systématique** câblé.
- **Coûts estimés** : tarifs Anthropic indicatifs à re-vérifier.
- **Juge unique** : `judgeResponses` appelé une fois par prompt,
  variance juge non mesurée.
- **Cap `MAX_CORES=8`** (CLAUDE.md project standards) limite la
  parallélisation locale.
- **Surgery non câblée** dans le pipeline live ; à intégrer en
  phase 2.5 entre `respResults` et `judgeResult`.
- **Cible `wins ≥ 70 %` non atteinte** : baseline 34 % offline,
  target ≥ 70 % live — gap mesurable seulement une fois ce
  protocole exécuté.
