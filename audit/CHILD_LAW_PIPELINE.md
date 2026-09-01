# CHILD LAW PIPELINE

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `main()`
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`, `audit/GENERATION_ORACLE.md`, `audit/SANDBOX_GENERATION_PROTOCOL.md`

---

## 1. Pipeline complet (8 étapes)

```
L_i  (loi mère du CanonicalGraph)
  │
  ├─[1] derive_generative_scope(L_i)
  │       → injecte generative_scope[], allowed_domains[],
  │         forbidden_expansions[], generation_depth_limit=1,
  │         runtime_admissibility{}, generation_cost
  │
  ├─[2] explore_local(L_i, edges, depth=1)
  │       → neighbors[] (≤6), gaps[]
  │
  ├─[3] propose_child_candidates(L_i, exploration, n_max=2)
  │       → ≤ 2 child candidates per mother
  │
  ├─[4] GenerationOracle (6 checks bloquants)
  │       → accepted / rejected (+raisons)
  │
  ├─[5] DiscoverySandbox  (laws_sandbox.json)
  │       status="sandbox_candidate", mother_id traced
  │       needs=["propagation_test","temporal_test","composition_test"]
  │       ── AUCUN bypass vers laws.json ──
  │
  ├─[6] propagation_test · temporal_test · composition_test
  │       (différés, exécutés par moteurs dédiés)
  │
  ├─[7] CanonicalCandidate  (validation manuelle requise)
  │
  └─[8] CanonicalGraph      (intégration à laws.json — humain ou Oracle Adaptive)
```

Promotion automatique **interdite** à toutes les frontières
(étapes 5→6, 6→7, 7→8).

---

## 2. Mesures runtime (241 mères, 1 run)

| Étape                                | Valeur |
|--------------------------------------|-------:|
| Lois mères activées (étape 1)        | 241    |
| Filles proposées (étape 3)           | 476    |
| Filles acceptées par Oracle (4)      | 365    |
| Taux d'acceptation Oracle            | 76.7 % |
| Cap anti-explosion sandbox           | 50     |
| Filles effectivement injectées (5)   | 50     |
| Filles ayant atteint `laws.json`     | **0**  |

→ Ratio de réduction : 476 → 50 (10.5 %), gardant uniquement le top
`estimated_S_local`.

---

## 3. Garanties pipeline

- **Sandbox-only** : `SANDBOX = app/data/laws_sandbox.json` est le seul
  fichier touché côté production (la mère reçoit des champs structurels
  mais aucune fille ne rejoint `laws.json`).
- **Traçabilité** : chaque fille porte `mother_id`, `parent_id`,
  `generation_type="derivation_local"`, `generation_oracle_accepted=true`.
- **Idempotence** : un re-run écrase la sandbox avec la même graine
  (hash déterministe sur `child_id`).
- **Aucune cascade** : `generation_depth_limit=1` empêche une fille
  de devenir mère à son tour dans le même run.

---

## 4. Hand-off vers les moteurs aval

Une fois en sandbox, chaque fille porte `needs[]` qui pilote les
moteurs suivants :

| need                  | moteur cible                                 |
|-----------------------|----------------------------------------------|
| `propagation_test`    | `tools/contextual_propagation_engine.py`     |
| `temporal_test`       | `tools/temporal_stress_engine.py`            |
| `composition_test`    | `tools/composition_validation_engine.py`     |

Tant que les 3 tests ne sont pas verts, la fille reste
`sandbox_candidate` — jamais `canonical_candidate`.
