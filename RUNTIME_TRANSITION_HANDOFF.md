# RUNTIME_TRANSITION_HANDOFF — Passation labo aSiM → backend vivant ZORAN

- **mission_id** : ZORAN_RUNTIME_HANDOFF_20260520
- **date** : 2026-05-20T23:30:00Z (gel : 2026-05-21T00:10:00Z)
- **agent** : CLAUDE (exec, session repo aSiM)
- **objet** : point de passation unique pour reprendre la transition runtime
  dans le backend vivant `zoran/` — sans perte de contexte.

> **STATUT : FROZEN_CORE_REFERENCE** (gel 2026-05-21, décision Oracle).
> Le repo aSiM est gelé comme référence de Core stable. Aucune nouvelle
> fonctionnalité ne doit y être ajoutée. Tag git : `frozen-core-reference`.
> Dormants finaux : 4 modules, 673 LOC — tous décidés, zéro ambiguïté.

> Le repo aSiM (front-only, vanilla CDN) a atteint sa fin de phase utile.
> La suite (provider survival, API-first, mobile, offline) s'exécute dans
> le backend `zoran/` de Fred. Ce document transfère l'état et les contrats.

---

## 1. Ce qui est PROUVÉ (repo aSiM)

| Preuve | Évidence |
|---|---|
| Core boot propre | `smoke_test.mjs` 14/14, 0 erreur console/page |
| Logique pure testée | `superiority_units_check.mjs` 35/35 assertions |
| Core livrable sur clone froid | `git clone` froid → smoke 14/14, units 35/35 |
| Architecture cartographiée | `architecture_live_map.mjs` → 45 modules, 10 213 LOC |
| god-function découplée | `superiority.js` 431→255 l, 3 modules purs extraits |

Portée : **validation ARCHITECTURE uniquement**. Aucune validation métier.

## 2. Ce qui est FALSIFIÉ

Le moteur adversarial V12 (`adversarialSurvivability()`) — test discriminant
`ADVERSARIAL_DISCRIMINANT_RESULTS.md` + falsification de second ordre :
attribue `v12_score 0.70-1.0` à un faux expert verbeux et à un texte creux
ultra-formaté. **Il mesure la forme syntaxique, pas la vérité causale.**
Paradigme adversarial V8-V12 invalidé dans sa forme actuelle.

## 3. Ce qui a été SUPPRIMÉ

7 modules du cluster adversarial V8-V12 — **1027 LOC** (commits `a6e3e25`..`3af1660`) :
`adversarial_survivability_engine`, `physical_causality_validator`,
`frame_refutation_engine`, `validation_status`, `failure_extraction`,
`response_surgery`, `failures_memory`. Restituables via `git revert`.

## 4. Ce qui reste DORMANT (6 modules, 930 LOC)

| Module | Statut | Décision en attente |
|---|---|---|
| `causal_compression_engine` | CONDITIONAL | test compression — bloqué (pas de benchmark de paires) |
| `truncation_detector_v11` | CONDITIONAL | idem |
| `conclusion_wrapper` | REMOVE proposé | confirmation Oracle |
| `cognitive_routing` | REMOVE proposé | confirmation Oracle |
| `vernacular_wisdom_engine` | **KEEP** | réserve Phase 5 roadmap — ne pas supprimer |
| `mutation_stability` | à trancher | décision Oracle |

## 5. Invariants Core (à préserver)

- Entry point : `app/src/main.js` (chargé par `index.html`).
- Hub de scoring : `app/src/superiority.js` → `runSuperiorityComparison`.
- Stack : vanilla CDN, **zéro build** — ne jamais introduire de bundler ici.
- Baseline de non-régression : smoke 14/14, units 35/35, 0 erreur console
  (`audit/REGRESSION_MATRIX_V13.json`).
- `superiority.js` expose un contrat public stable : `runSuperiorityComparison`
  + `renderComparison` — ne pas casser.

## 6. Règles MAX_SECURITY (à reconduire dans le backend)

Réf. : `audit/V13_MAX_SECURITY_PROTOCOL.md`, `V13_PATCH_DISCIPLINE.md`,
`V13_CRITICAL_LAB_RULES.md`, `V13_IMPACT_MAP_PROTOCOL.md`.

Avant tout dev : cartographie → hypothèses → contre-hypothèses → patch minimal
→ tests avant/après → validation humaine si impact fort. Chaque patch :
horodaté, signé, journalisé (`critical_patch_log.jsonl`), rollbackable.
Aucun ajout sans falsification. Suppression = succès possible.

## 7. Contrats runtime que le backend `zoran/` doit respecter

Issus des missions `ZORAN_CORE_OS_FOUNDATION` / `RUNTIME_REAL_TRANSITION` :

- **Provider abstraction** : chaque provider expose `generate()`, `stream()`,
  `embed()`, `health()`, `cost()`, `capabilities()`. Aucune logique métier
  ZORAN dans un provider. Le Core ne connaît pas les providers individuels.
- **Provider survival** : Claude ↔ GPT ↔ DeepSeek ↔ local interchangeables
  sans casser mémoire / orchestration / API / traces.
- **API-first** : backend fonctionnel sans frontend (curl, scripts, agents).
- **Événements** : chaque event porte `timestamp`, `trace_id`, `provider`,
  `rollback_id`.
- **Mémoire minimale** : `HOT_MEMORY` + `ARCHIVE_MEMORY` uniquement — ne pas
  reconstruire une mémoire totale complexe.
- **Rollback réel** : snapshot/restore de l'état runtime.

Point d'attention front : `app/src/llm.js` (aSiM) est **câblé en dur à
Anthropic** (`api.anthropic.com`, headers `x-api-key`). Si le front aSiM doit
survivre au changement de moteur, extraire un adaptateur provider — sinon il
restera couplé à Claude. Décision non prise (front déprioritisé par mission).

## 8. Tickets encore ouverts

Réf. : `audit/TICKETS_PROGRESS.md`. 12 restants :

- **8 majeurs** : T1 provider survival · T2 API-first · T3 mobile · T4 offline
  · T5 rollback runtime · T6 P0-MINI BET (⛔ bloquant) · T7 provider
  abstraction live · T8 event bus — **tous dans `zoran/`, hors aSiM**.
- **4 secondaires** : S1-S3 décisions Oracle (modules dormants), S4 test
  compression (bloqué — pas de benchmark de paires).

## 9. Limites connues (honnêteté empirique)

- **Validation réelle ≈ 0 %** : P0-MINI BET humain non exécuté. Tant que ce
  verrou n'a pas sauté, ZORAN reste un prototype interne — aucun claim
  « expert validé / OS cognitif validé » autorisé.
- Le flux LLM end-to-end de `runSuperiorityComparison` n'est pas couvert par
  test automatique (pas de clé API en CI).
- Le ground truth du benchmark P0 est synthétique (intuitions ZORAN, non-BET).
- Les tests runtime sont headless — un vrai navigateur peut différer.

## 10. Tests restants — critères d'acceptation du backend `zoran/`

Le backend vivant devra prouver « runtime > moteur » par ces tests
(aucun n'est exécutable depuis aSiM — ils nécessitent le backend Node) :

**Provider survival**
- T1.1 — Claude → GPT sans patch (mémoire/API/orchestration intactes)
- T1.2 — GPT → LLM local sans patch
- T1.3 — rollback provider live
- T1.4 — mémoire conservée après switch de provider
- T1.5 — même contrat API malgré changement de moteur

**API-first** — T2 : backend fonctionnel sans frontend (curl-only, API-only,
SSE stable, events stables, mémoire stable, orchestration stable).

**Mobile / edge** — T3 : runtime sur Android/ARM (RAM limitée, cache mémoire,
offline partiel, faible latence, API locale).

**Offline** — T4 : runtime survit sans internet (mode dégradé + cache).

**Validation humaine** — T5 : P0-MINI BET réel (⛔ bloquant — kit prêt dans
`audit/P0_MINI_BET_PROTOCOL.md`). Tant que T5 n'est pas exécuté, aucun claim
« expert validé / OS cognitif validé / runtime métier fiable ».

Critère de succès septembre : runtime survivant **minimal** capable de
changer de moteur, tourner sans front, survivre mobile + offline partiel,
conserver mémoire/runtime, rollback proprement. Pas un « OS cognitif complet ».

## 11. Progression (deux jauges, non fusionnables)

```
INGÉNIERIE        ≈ 46 %
VALIDATION RÉELLE   0 %   (gated P0-MINI BET)
```

Le prochain gain de progression doit venir du **backend vivant `zoran/`**,
pas du laboratoire aSiM. Le repo aSiM côté Core OS est clos.

---

signature : {agent: CLAUDE, mission: ZORAN_RUNTIME_HANDOFF_20260520,
scope: passation, timestamp: 2026-05-20T23:30:00Z}
