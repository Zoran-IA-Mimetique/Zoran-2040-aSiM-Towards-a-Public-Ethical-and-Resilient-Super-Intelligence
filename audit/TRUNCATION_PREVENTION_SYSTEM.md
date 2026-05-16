# TRUNCATION_PREVENTION_SYSTEM

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RESPONSE_COMPLETION_ENGINE.md`,
  `ROUTE_SPECIALIZATION_ENGINE.md`,
  `FIELD_ACTIONABILITY_SCORING.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeBaseline` (`maxTokens: 900`),
  `app/src/llm.js::synthesizeRoute` (`maxTokens: 900` + instruction
  *TERMINE TA RÉPONSE*), `app/src/completion.js::detectTruncation`,
  `app/src/completion.js::truncationPenalty`,
  `app/src/superiority.js::renderComparison` (`sup-trunc-warn`).

## 1. Why this mission exists

`RESPONSE_COMPLETION_ENGINE` DÉTECTE les troncatures et les PÉNALISE,
mais la pénalité ne corrige pas le problème de fond : le user a quand
même reçu une réponse coupée. Ce moteur complémentaire décrit la couche
PRÉVENTIVE : élargir le budget tokens, instruire le modèle à conclure
proprement, structurer les prompts pour minimiser le risque que
`max_tokens` soit atteint avant la conclusion.

## 2. Élargissement `maxTokens` 600 → 900

Avant cette mission : `callLLM` par défaut avec `maxTokens = 600`,
appliqué partout. Observation : avec un system-prompt riche (lois
silencieuses + interdictions + exemple BTP), Claude consommait
fréquemment 580-600 tokens en sortie → coupure systématique sur les
réponses denses 4-5 phrases techniques.

Modifications :
- `synthesizeBaseline(question)` : `maxTokens: 900`
- `synthesizeRoute({question, laws, strategyLabel})` : `maxTokens: 900`
- `callLLM` par défaut : inchangé à 600 (utilisé par `reformulateQuestion`
  qui demande 1 phrase de 12-25 mots, et par `synthesizeAnswer` du
  pipeline single-law historique).

Gain : ≈ +50% de marge tokens, suffisant pour clôturer proprement même
sur des questions multi-aspects (BTP + juridique + assurance).

## 3. Instruction prompt anti-troncature

Deux fonctions injectent une instruction explicite de complétude dans
le system prompt :

**`synthesizeBaseline`** (Claude brut, sans contexte ZORAN) :
```
Tu es un assistant. Réponds à la question en 4-6 phrases denses en
français, sans markdown. TERMINE TA RÉPONSE COMPLÈTEMENT — pas de
phrase coupée.
```

**`synthesizeRoute`** (Claude avec lois ZORAN silencieuses) — bloc
final du system prompt :
```
═══ TERMINE TA RÉPONSE — pas de phrase coupée, conclusion claire ═══
```

Couplé au budget 900 tokens, cette injection réduit la fréquence
empirique des troncatures observées. Quand elle se produit néanmoins,
`detectTruncation` la repère et `truncationPenalty` la soustrait du
`runtime_superiority` (cf. `RESPONSE_COMPLETION_ENGINE.md` §3).

## 4. Boucle complète détection + prévention + limites

```
PRÉVENTION (llm.js)            DÉTECTION (completion.js)     SCORING (superiority.js)
─────────────────────          ──────────────────────────    ───────────────────────────
maxTokens 900             ──►  detectTruncation              runtime_superiority
+ "TERMINE TA RÉPONSE"         ├─ 6 signaux pondérés        − truncation_penalty
                               ├─ confidence ≥ 0.35          (0.20 + conf·0.30, cap 0.50)
                               └─ reasons[]
                                                              UI : sup-trunc-warn badge
                                                              sur winnerCardXL
```

**Honest limits :**

- **Heuristiques faux-positivables** : une réponse listée légitime
  finissant sur `etc.` ou un dernier item court peut déclencher
  `vague_ending` + `truncated_list_item` et basculer en `truncated`
  alors qu'elle est complète.
- **Faux-négatifs réels** : Claude peut produire une réponse qui
  *sonne* finie (point final, ton conclusif) mais qui a oublié la moitié
  des points demandés — aucun signal côté `detectTruncation` ne le
  capte. La détection est syntaxique, pas sémantique.
- **`maxTokens 900` augmente coût** : ≈ +50% de coût par appel sur les
  routes ZORAN. Sur 3 routes + baseline + juge (2500 tk), une session
  superiority complète passe de ≈ 4900 → ≈ 6700 tokens output.
- **Aucun retry automatique** : si troncature détectée, on pénalise mais
  on NE RELANCE PAS la requête avec un budget plus grand. V2 attendue.
- **L'instruction prompt repose sur la compliance** du modèle — Haiku
  l'ignore plus souvent qu'Opus.
