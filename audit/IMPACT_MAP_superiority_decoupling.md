# IMPACT_MAP — Découpage de superiority.js

- **mission_id** : ZORAN_CORE_OS_FOUNDATION_20260520 (ticket #011)
- **date** : 2026-05-20T18:10:00Z
- **agent** : CLAUDE (exec)
- **type** : refactor de lisibilité — déplacement de code pur, zéro changement de logique

## Cartographie préalable (ÉTAPE 1)

`superiority.js` analysé sur pièces. Diagnostic des analyses externes (Zoran,
Mistral, Grok) trié :

| Affirmation externe | Réalité du code |
|---|---|
| « god object de 5000 lignes » | FAUX — 431 lignes |
| « rendering mélangé au reste » | FAUX — déjà extrait dans `superiority_render.js` |
| « fonction monolithique » | VRAI — `runSuperiorityComparison` = 395 lignes, 8 blocs |
| « non testable isolément » | VRAI — aucun test runtime ne la couvrait |

## Modules touchés

| Fichier | Action |
|---|---|
| `app/src/superiority.js` | 431 → 278 lignes — blocs purs extraits, imports morts retirés |
| `app/src/superiority_metrics.js` | **créé** (80 l) — `annotateResponses()` |
| `app/src/superiority_deltas.js` | **créé** (119 l) — `computeDeltas()` |
| `tools/superiority_units_check.mjs` | **créé** — test de caractérisation (28 assertions) |

## Appels montants (qui dépend de superiority.js)

- `app/src/chat.js` (inbound=1) — importe `runSuperiorityComparison` + `renderComparison`.
  **Contrat public inchangé** : mêmes 2 exports, mêmes signatures, même valeur de
  retour. `chat.js` non modifié.

## Appels descendants

`superiority_metrics.js` importe 12 moteurs de mesure (jargon, completion,
systemic_coherence, anti_goodhart, fragility_detector, domain_leak,
seductive_complexity, overthink_detector, identity_gate, zoran_cta_engine,
btp_supremacy_engine, parsimony_detector). `superiority_deltas.js` importe
`completion.js` (fieldActionability). Aucun nouvel arc de dépendance créé —
ces imports ont juste migré depuis `superiority.js`.

## Imports morts retirés (cleanup adjacent vérifié)

`synthesizeRoute`, `reformulateQuestion`, `activationMatrix`, `isBTPQuestion`,
`detectLowIntrinsicDepth` — 1 occurrence chacun (import seul, jamais appelés,
routes individuelles désactivées depuis mission SINGLE_WINNER). Retirés.

## Risques évalués

| Risque | Sévérité | Mitigation |
|---|---|---|
| Variable de closure oubliée à l'extraction | HAUTE | Test caractérisation 28/28 PASS — exerce les 2 modules avec données synthétiques, détecte tout ReferenceError |
| Régression UI / boot | MOY | Smoke test 13/14 inchangé, 0 erreur console |
| Flux LLM end-to-end non couvert | MOY | **Limite assumée** — pas d'API key ; extraction = déplacement pur sans modif logique, risque résiduel faible |
| Contrat public cassé pour chat.js | HAUTE | Exports vérifiés identiques (`renderComparison`, `runSuperiorityComparison`) |

## Tests (ÉTAPE 5)

| Test | Avant | Après |
|---|---|---|
| `tools/superiority_units_check.mjs` | n'existait pas | **28/28 PASS** |
| `tools/smoke_test.mjs` | 13/14, 0 err | 13/14, 0 err (inchangé) |
| import `superiority.js` | OK | OK (exports identiques) |

## Rollback

`git revert <commit>` — restaure le fichier monolithique. Aucune migration de
données, aucun état persistant touché. Rollback trivial.

## Gain

- `runSuperiorityComparison` : 395 → ~240 lignes d'orchestration.
- ~190 lignes de logique PURE désormais isolées et **testées** (28 assertions)
  alors qu'elles étaient auparavant non falsifiables (enfouies dans une fonction
  à appels LLM).
- Le problème « non testable » pointé par les 3 analyses est **résolu** pour les
  blocs métriques et deltas.

## Limites / dette restante

- Le bloc **gating** (identity gate + complexity + fast-path + construction
  zoranSpecs) reste dans `superiority.js` — mélange pur/impur, extraction plus
  délicate. Identifié comme **étape 2** (non faite ici, volontairement).
- Le flux LLM complet (`runSuperiorityComparison` de bout en bout) reste non
  couvert par un test automatique faute d'API key / de mock. Dette ouverte.

## Décision

**KEEP** — extraction validée. Comportement runtime préservé (smoke inchangé),
logique pure désormais testée.
