# DORMANT_MODULES_AUDIT — Audit des 13 modules dormants

- **mission_id** : ZORAN_CORE_OS_FOUNDATION_20260520 (suite — audit zombies)
- **date** : 2026-05-20T19:00:00Z
- **agent** : CLAUDE (exec)
- **type** : audit pur — aucun module touché, aucune suppression. Décisions PROPOSÉES.
- **source** : `audit/impact_map_runtime.json` (cartographie statique) + lecture headers

## Pourquoi cet audit

`ARCHITECTURE_LIVE_MAP` mesure 13 modules dormants = **1957 LOC mortes (17,5%)**.
Oracle : *« le vrai risque septembre = dette de compréhension architecturale ;
un Core livré à Codex ne doit contenir aucun module zombie non décidé. »*
Cet audit classe chaque dormant et propose KEEP / REMOVE / REBUILD / CONDITIONAL.

## Taxonomie de statut (zéro zone ambiguë)

| Statut | Définition |
|---|---|
| `ALIVE_RUNTIME` | branché, exécuté à chaque run |
| `ALIVE_OPTIONAL` | branché, exécuté sous condition |
| `DORMANT_KEEP` | non branché mais **réserve planifiée** (phase future explicite) |
| `DORMANT_REMOVE` | non branché, **zombie** (doublon / absorbé / abandonné) |
| `CONDITIONAL` | sort lié à une décision/mesure en attente |
| `REBUILD` | fonction voulue mais code obsolète/non falsifié → à refaire |
| `FROZEN` | gelé, lecture seule |

## Constat central — le cluster adversarial

**9 des 13 dormants forment une seule lignée** : les moteurs adversariaux /
falsification des missions V8 → V12, **jamais branchés dans `superiority.js`**.
Ils s'importent entre eux (chaînes zombies) mais aucun n'est atteignable depuis
`main.js`. C'est le moteur adversarial déjà identifié dans
`V13_ADVERSARIAL_EXISTING_INVENTORY.md` — codé, dormant, non falsifié.

## Matrice de classification

| Module | LOC | Mission | Importé par | Classification proposée | Confiance |
|---|---|---|---|---|---|
| `adversarial_survivability_engine.js` | 212 | V12 | personne | **CONDITIONAL** (cluster adversarial) | haute |
| `physical_causality_validator.js` | 175 | V11 P3 | adversarial_surv. (mort) | **CONDITIONAL** (cluster adversarial) | haute |
| `frame_refutation_engine.js` | 154 | V8 | validation_status (mort) | **CONDITIONAL** (cluster adversarial) | haute |
| `validation_status.js` | 108 | V8 | personne | **CONDITIONAL** (cluster adversarial) | haute |
| `failure_extraction.js` | 149 | GLOBAL_RUNTIME | response_surgery (mort) | **CONDITIONAL** (cluster adversarial) | moyenne |
| `response_surgery.js` | 65 | GLOBAL_RUNTIME | personne | **CONDITIONAL** (cluster adversarial) | moyenne |
| `failures_memory.js` | 164 | SUPERIORITY_CONV | personne | **CONDITIONAL** (cluster adversarial) | moyenne |
| `causal_compression_engine.js` | 254 | V11 | truncation_v11 (mort) | **CONDITIONAL** (cluster compression) | moyenne |
| `truncation_detector_v11.js` | 201 | V11 | personne | **CONDITIONAL** (cluster compression) | moyenne |
| `vernacular_wisdom_engine.js` | 125 | V11 P2 | personne | **DORMANT_KEEP** | haute |
| `conclusion_wrapper.js` | 129 | V11.1 | personne | **DORMANT_REMOVE** (proposé) | moyenne |
| `cognitive_routing.js` | 128 | SUPERIORITY_CONV_V2 | personne | **DORMANT_REMOVE** (proposé) | moyenne |
| `mutation_stability.js` | 93 | V5 | personne | **À TRANCHER** | faible |

## Justifications

### DORMANT_KEEP — `vernacular_wisdom_engine.js`
Reconnaissance de l'expertise terrain sans jargon. **Correspond exactement à la
Phase 5 de `ZORAN_V2_MATURITY_ROADMAP`** (VERNACULAR_ENGINE_V2, juillet-août).
C'est une réserve planifiée, pas un zombie. À garder, à brancher en Phase 5.

### DORMANT_REMOVE proposé — `conclusion_wrapper.js`
Mission V11.1 : « wrapper CONCLUSION: forcé en sortie LLM ». La consigne de
conclusion explicite est aujourd'hui portée par le **prompt LLM** lui-même
(`llm.js`). Fonctionnalité vraisemblablement absorbée → doublon mort.
*Confirmation requise : vérifier qu'aucune régression « phrase coupée » n'apparaît.*

### DORMANT_REMOVE proposé — `cognitive_routing.js`
Exports `detectCognitiveNature / detectRiskLevel / detectDepthRequired /
semanticRouting`. Recoupe `complexity_estimator.js` (live, `estimateComplexity`
fait déjà `depth_required`) et `domain_detection.js` (live). Ancêtre
vraisemblablement remplacé.

### À TRANCHER — `mutation_stability.js`
Mission V5 (la plus ancienne du lot). Isolé, sans spec, sans cluster. Décision
Oracle requise : la « stabilité par mutation » est-elle un objectif Core ou
une expérimentation abandonnée ?

### CONDITIONAL — le cluster adversarial (9 modules)
Leur sort est **un seul et même verdict**, lié à un test discriminant unique
(déjà spécifié dans `V13_ADVERSARIAL_EXISTING_INVENTORY.md`) :

> Faire tourner `adversarialSurvivability()` sur les 5 cas du benchmark P0 vs
> un prompt Sonnet nu.
> - Le moteur ne bat pas le prompt nu → **REMOVE des 9 modules** (~1482 LOC).
> - Le moteur bat le prompt nu → **REBUILD propre + branchement** (1 module
>   consolidé, pas 9 éparpillés).

Tant que ce test n'est pas fait, les 9 restent `CONDITIONAL` — ni vivants, ni
supprimés, mais **explicitement en attente d'une mesure** (pas de zone grise).

## Bilan quantitatif

| Décision | Modules | LOC |
|---|---|---|
| DORMANT_KEEP | 1 | 125 |
| DORMANT_REMOVE proposé | 2 | 257 |
| CONDITIONAL (cluster adversarial+compression) | 9 | 1482 |
| À TRANCHER | 1 | 93 |
| **Total dormant** | **13** | **1957** |

## Plan de levée d'ambiguïté (ordre)

1. **Test discriminant adversarial** (sans BET, ~0 coût) → tranche 9 modules d'un coup.
2. **Décision Oracle** sur `conclusion_wrapper`, `cognitive_routing`, `mutation_stability` (3 modules, 350 LOC).
3. Après décisions : exécuter les REMOVE en commits séparés, 1 module = 1 commit, avec smoke + `architecture_live_map` re-run (le compteur de dormants doit baisser).

## Garde-fou

Aucune suppression dans cet audit. La règle fondatrice exige une **décision
explicite** par module avant tout REMOVE. Ce document est l'instruction de
décision, pas la décision. `vernacular_wisdom_engine` est d'ores et déjà
protégé (DORMANT_KEEP) — ne pas le supprimer dans un futur nettoyage de masse.

---

## RÉSOLUTION — 2026-05-20T20:00:00Z

Le test discriminant adversarial (`ADVERSARIAL_DISCRIMINANT_RESULTS.md`) +
sa falsification de second ordre ont tranché : le moteur adversarial mesure
la forme, pas le fond (texte creux → v12_score 1.0). Paradigme falsifié.

**Scope corrigé 9 → 7.** Test 2 a falsifié le paradigme *adversarial* ; il
ne couvre PAS le paradigme *compression*. Correction par honnêteté empirique :

| Module | Statut final | Action |
|---|---|---|
| `adversarial_survivability_engine` | DORMANT_REMOVE | **supprimé** (212 LOC) |
| `physical_causality_validator` | DORMANT_REMOVE | **supprimé** (175 LOC) |
| `frame_refutation_engine` | DORMANT_REMOVE | **supprimé** (154 LOC) |
| `validation_status` | DORMANT_REMOVE | **supprimé** (108 LOC) |
| `failure_extraction` | DORMANT_REMOVE | **supprimé** (149 LOC) |
| `response_surgery` | DORMANT_REMOVE | **supprimé** (65 LOC) |
| `failures_memory` | DORMANT_REMOVE | **supprimé** (164 LOC) |
| `causal_compression_engine` | **CONDITIONAL** (compression) | conservé — Test 2 ne couvre pas ce paradigme |
| `truncation_detector_v11` | **CONDITIONAL** (compression) | conservé — idem |
| `vernacular_wisdom_engine` | DORMANT_KEEP | conservé — réserve Phase 5 |
| `conclusion_wrapper` | DORMANT_REMOVE proposé | non exécuté — confirmation Oracle requise |
| `cognitive_routing` | DORMANT_REMOVE proposé | non exécuté — confirmation Oracle requise |
| `mutation_stability` | À TRANCHER | décision Oracle |

**Bilan** : 7 modules supprimés (1027 LOC), 7 commits topologiques.
Dormants 13 → 6. Core 11240 → 10213 LOC. Smoke 13/14 inchangé,
`superiority_units_check` 35/35, 0 erreur.

**Dette restante (6 dormants, 930 LOC)** : 2 CONDITIONAL compression
(test propre requis), 2 REMOVE-proposés (confirmation Oracle), 1 KEEP
(vernacular, Phase 5), 1 à trancher (mutation_stability).
