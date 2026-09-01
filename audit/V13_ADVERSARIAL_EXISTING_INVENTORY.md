# V13_ADVERSARIAL_EXISTING_INVENTORY — Inventaire de l'existant adversarial

- **mission_id** : ZORAN_V2_ADVERSARIAL_REALITY_ENGINE_2026
- **généré le** : 2026-05-20T17:35:00Z
- **méthode** : cartographie statique (`tools/architecture_live_map.mjs`) + lecture exports
- **verdict** : **NO-BUILD** — le moteur adversarial existe déjà, il est dormant

## Pourquoi ce document

Mission 2 demande de créer un `V13_ADVERSARIAL_REALITY_ENGINE` avec 7 briques.
La cartographie prouve que **les 7 briques existent déjà** dans le code V12.
Construire « V13 » serait du renommage architectural, pas une augmentation de
capacité — interdit par la règle terminale de Mission 2 elle-même.

## Mapping demande V13 → existant

| Brique V13 demandée (Mission 2) | Code existant | État runtime |
|---|---|---|
| 1. Claim Extraction Engine | `adversarial_survivability_engine.js::extractClaims()` | **DORMANT** (inbound=0) |
| 2. Hostile Refutation Engine | `…::generateRefutations()` + `frame_refutation_engine.js::generateCounterHypotheses()` | **DORMANT** |
| 3. Physical Survivability Validator | `…::physicalSurvivability()` + `physical_causality_validator.js::validatePhysicalCausality()` | **DORMANT** |
| 4. Tribunal Mode | `adversarial_survivability_engine.js::tribunalAttack()` | **DORMANT** |
| 5. Irreversibility Engine | `…::irreversibilityFilter()` + `fragility_detector.js::futureHiddenCost()` | DORMANT / partiel live |
| 6. False Coherence Detector V2 | `seductive_complexity.js` + `anti_goodhart.js` (4 détecteurs) | **LIVE** ✅ |
| 7. Reality-Grounded Scoring (SURVIVAL_SCORE) | `adversarial_survivability_engine.js::adversarialSurvivability()` | **DORMANT** |

## Constat dur

- **6 briques sur 7 sont dormantes.** Le module central `adversarial_survivability_engine.js`
  (212 LOC, 6 exports) a **inbound=0** — aucun module ne l'importe. Code écrit,
  jamais branché, jamais exécuté, **non falsifiable par construction**.
- Seule la brique 6 (false coherence : `seductive_complexity` + `anti_goodhart`)
  est réellement branchée dans `superiority.js`.
- `frame_refutation_engine.js`, `physical_causality_validator.js`,
  `failure_extraction.js` ont inbound=1 — mais leur unique importateur est
  lui-même dormant (cluster zombie).

## Ce que cela signifie

Le « besoin de V13 » est un **faux besoin**. Le vrai problème n'est pas
« il manque un moteur adversarial » mais :

> « le moteur adversarial existe, mais il n'est ni branché, ni falsifié, ni validé. »

## Décision recommandée — par brique

| Brique | Décision proposée | Condition |
|---|---|---|
| 1-5, 7 (cluster dormant) | **MESURER avant de décider** | Brancher temporairement en mode test, comparer à un prompt Sonnet nu sur les 5 cas P0. Si pas de gain → REMOVE. |
| 6 (false coherence, live) | **KEEP conditionnel** | Déjà branché ; à falsifier via P0. |

## Test discriminant proposé (exécutable sans BET, cette semaine)

Faire tourner `adversarialSurvivability()` (déjà codé, dormant) sur les 5 cas du
benchmark P0 et comparer son ranking à celui d'un prompt Sonnet nu.

- Si le moteur dormant ne bat pas le prompt nu → **6 briques à supprimer**, V13
  est inutile par construction.
- S'il le bat → brancher proprement le moteur V12 (PAS créer V13), puis P0.

Ce test découple la valeur du moteur de la valeur du prompting. Coût ~0,
falsifiable, propre.

## Interdiction explicite

Tant que ce test n'est pas fait et que P0-MINI n'est pas exécuté :
- ❌ ne pas créer `V13_ADVERSARIAL_REALITY_ENGINE` (couche neuve)
- ❌ ne pas re-coder claim extraction / tribunal / survival score
- ✅ autorisé : mesurer, brancher en test isolé, documenter, supprimer
