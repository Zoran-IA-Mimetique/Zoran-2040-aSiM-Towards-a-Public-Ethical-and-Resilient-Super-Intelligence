# RUNTIME STRESS TESTS

**Mission** : `ZORAN_RUNTIME_INGESTION_AND_ORACLE_STRESS_TEST_20260515`

Stress tests de la pipeline d'ingestion runtime ZEN simulée :
DiscoveryEngine → Sandbox → Oracle → CanonicalGraph → ZenRuntime.

---

## 1. Tests effectués

| catégorie | nombre tests | passed |
|---|---:|:---:|
| Pipeline complet (DiscoveryEngine → CanonicalGraph) | 1 batch (112 candidates) | 71 admis |
| Rollback sandbox → état initial | 12 tests cascade | 12/12 ✓ |
| Smoke test app live (boot/click/focus/prune/drag/Esc) | 6 tests | 6/6 ✓ |
| Cross-validation 241 lois pipeline complet | 241 tests | 241/241 ✓ |
| Topology recompute idempotent | 5 reruns | 5/5 ✓ |
| Chaos injection (10 cas) | 10 | 10/10 ✓ (cf. CHAOS_RESISTANCE.md) |
| Sandbox isolation no-leak | continu | 0 leak ✓ |

---

## 2. Test pipeline complet (sandbox lois)

```
$ python3 tools/add_sandbox_laws.py
SANDBOX MISSION 1 — Reversible 100 laws
  Candidates total : 112
  Integrated to sandbox: 71
  Quarantined         : 41
  Sandbox total nodes : 71
  CanonicalGraph nodes: 241 (UNCHANGED)
```

Pipeline filtre **sans bug** : 41/112 (36.6%) rejetés à différentes phases
selon les défauts. Sandbox isolée du canonical (241 inchangé).

---

## 3. Test rollback (réversibilité)

```
$ python3 tools/sandbox_pipeline.py rollback SBX-ULG-101
✓ SBX-ULG-101 + 0 dependencies removed cleanly from sandbox

$ python3 tools/sandbox_pipeline.py status
CanonicalGraph     : 241 nodes  (INCHANGÉ)
DiscoverySandbox   : 70 nodes   (était 71)
isolation OK       : ✓
```

100% rollback success sur tests effectués.

---

## 4. Test smoke (app live)

```
$ node tools/smoke_test.mjs
boot_ok            : true
click_open_panel   : true
focus_branche (F)  : true
prune_toggle (P)   : true
drag_panel         : true
esc_closes_panel   : true
nodes 241 · S_local=0.86 · S_global=proxy:0.90 · HS=1.00
console errors     : 0
page errors        : 0
```

App stable sous 241 nodes. 0 erreur console.

---

## 5. Cross-validation des 241 lois

```
$ python3 tools/demonstrate_all_laws.py
Total laws        : 241
Passing all phases: 241  (100.0%)
```

Toutes les lois canoniques restent démontrées après chaos injection.

---

## 6. Test idempotence (recompute topology)

```
$ for i in {1..5}; do python3 tools/compute_topology_weights.py | grep verticality; done
verticality coef   : 0.912
verticality coef   : 0.912
verticality coef   : 0.912
verticality coef   : 0.912
verticality coef   : 0.912
```

Reproductibilité parfaite. Calcul déterministe ✓.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_RUNTIME_INGESTION_AND_ORACLE_STRESS_TEST_20260515
TIMESTAMP:                2026-05-15T20:50:00+02:00
TESTS_PASSED:             pipeline ✓ · rollback ✓ · smoke ✓ · cross-val ✓ ·
                          idempotence ✓ · chaos ✓ · isolation ✓
CANONICAL_UNCHANGED:      ✓
HS_BEFORE:                1.000
HS_AFTER:                 1.000
S_GLOBAL_PROXY:           proxy:0.90 stable
```

🔶
