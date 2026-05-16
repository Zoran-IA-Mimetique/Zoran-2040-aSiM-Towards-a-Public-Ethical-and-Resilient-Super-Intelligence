# RESPONSE_COMPLETION_ENGINE

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `TRUNCATION_PREVENTION_SYSTEM.md`, `FIELD_ACTIONABILITY_SCORING.md`,
  `ROUTE_SPECIALIZATION_ENGINE.md`, `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/completion.js::detectTruncation`,
  `app/src/completion.js::completionIntegrity`,
  `app/src/completion.js::truncationPenalty`,
  `app/src/llm.js::synthesizeBaseline` (maxTokens 900),
  `app/src/llm.js::synthesizeRoute` (maxTokens 900 + instruction
  *TERMINE TA RÉPONSE*), `app/src/superiority.js::runSuperiorityComparison`
  (boucle métriques par réponse), `app/src/superiority.js::renderComparison`
  (`truncBadge` sur le winnerCardXL).

## 1. Why this mission exists

Plusieurs sessions terrain ont montré le winner ZORAN s'arrêter en
plein milieu d'une phrase ou sur un connecteur (`« et », « donc »,
« mais »`), parce que le modèle atteignait `max_tokens=600` sans avoir
fini sa pensée. Le user recevait une réponse coupée, le juge
notait quand même cette réponse comme **gagnante** (note /20 calculée
sur un texte tronqué), et la pénalité de troncature n'existait pas dans
le score composite. Cette mission corrige les trois maillons :
1) détection runtime des troncatures, 2) pénalité injectée dans
`runtime_superiority`, 3) prévention via élargissement `maxTokens 900`
+ instruction explicite de conclusion.

## 2. `detectTruncation` — 6 signaux pondérés

`detectTruncation(text, usage)` parcourt le texte et accumule
`confidence` selon 6 heuristiques :

| #  | Signal                           | Poids  | Condition                                              |
|----|----------------------------------|--------|--------------------------------------------------------|
| 1  | `no_final_punctuation`           | +0.40  | Dernier char ∉ `.!?…»")] `                             |
| 2  | `suspended_connector`            | +0.50  | Fin matchée par `SUSPENDED_CONNECTORS_RX` (et, mais, donc, car, parce que, ainsi…) |
| 3  | `truncated_list_item`            | +0.45  | Match `(\n\s*[-•*]\s+[^\n]{0,5})$` (puce vide en fin)  |
| 4  | `mid_clause_cut`                 | +0.30  | Fin par `,` ou tiret (`,–—-`)                          |
| 5  | `output_near_max`                | +0.20  | `usage.output_tokens ≥ 850` (sur cap 900)              |
| 6  | `vague_ending`                   | +0.15  | Fin par `etc.`, `...`, `…`                             |

Verdict : `truncated = (confidence ≥ 0.35)`. `confidence` est clampé
à 1.0. Le texte vide → `{truncated:true, reasons:['empty'], confidence:1.0}`.

Deux scores dérivés :
- `completionIntegrity(text, usage) = 1.0 - confidence` (1.0 = réponse propre)
- `truncationPenalty(text, usage) = truncated ? min(0.50, 0.20 + confidence*0.30) : 0`

## 3. Intégration dans le score `runtime_superiority`

Dans `runSuperiorityComparison`, après chaque réponse :

```js
const trunc = detectTruncation(r.text, r.usage);
r.truncated            = trunc.truncated;
r.truncation_reasons   = trunc.reasons;
r.completion_integrity = completionIntegrity(r.text, r.usage);
r.truncation_penalty   = truncationPenalty(r.text, r.usage);
```

Puis le score composite (per-candidate) soustrait directement la
pénalité :

```
runtime_superiority =
    0.22 · Δprecision
  + 0.22 · Δ(baseline.hallu - candidate.hallu)
  + 0.13 · Δ(baseline.noise - candidate.noise)
  + 0.13 · Δcoherence
  + 0.10 · Δconcrete_runtime_alignment
  + 0.10 · Δ(baseline.meta_noise - candidate.meta_noise)
  + 0.10 · Δterrain_alignment
  - truncation_penalty                  ← pénalité directe
```

Une réponse fortement tronquée peut donc perdre jusqu'à 0.50 points
sur le score composite, ce qui suffit en pratique à la déclasser même
si le juge lui avait attribué une bonne note.

## 4. UI + prévention — `maxTokens 900` + limites

**UI.** Dans `renderComparison`, le `winnerCardXL` affiche un badge
warning si `d.truncated === true` :

```html
<div class="sup-trunc-warn">
  ⚠ Réponse tronquée détectée (0.32 pénalité) — suspended_connector, no_final_punctuation
</div>
```

**Prévention LLM.** Deux modifications dans `app/src/llm.js` :
1. `synthesizeBaseline` et `synthesizeRoute` passent de
   `maxTokens 600` → `maxTokens 900` (50% d'oxygène en plus).
2. Le system-prompt de ces deux fonctions se termine par
   « *TERMINE TA RÉPONSE COMPLÈTEMENT — pas de phrase coupée* »
   (resp. « *═══ TERMINE TA RÉPONSE — pas de phrase coupée,
   conclusion claire ═══* » pour la route).

**Honest limits :**

- Les 6 signaux sont **heuristiques** — peuvent faux-positiver sur des
  réponses légitimement listées ou se terminant par `etc.` volontaire.
- Le seuil `0.35` est calibré à la main, pas appris.
- Détection NE LIT PAS `stop_reason` de l'API (mentionné dans le code :
  « *L'API Claude renvoie stop_reason dans la réponse principale, pas usage* »).
  Signal #5 est une inférence indirecte.
- Pénalité max 0.50 peut être insuffisante si le score brut du juge
  est très élevé sur un texte coupé court mais accrocheur.
