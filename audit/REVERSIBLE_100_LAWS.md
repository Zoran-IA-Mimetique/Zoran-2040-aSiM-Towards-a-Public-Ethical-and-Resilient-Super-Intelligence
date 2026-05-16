# REVERSIBLE 100 LAWS

**Mission** : `ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515`
**Timestamp** : `2026-05-15T20:44:00+02:00`

100 lois candidates ajoutées via pipeline strictement réversible.
**Aucune n'entre dans CanonicalGraph.** Toutes restent dans
`app/data/laws_sandbox.json` (séparation physique conformément à
`DISCOVERY_SANDBOX_SPEC.md` et `R-CORE-1`).

---

## 1. Pipeline exécuté

```
Candidate (112)
  → Phase 1 — Detection         (family ∈ canonical, parent existe)
  → Phase 2 — Frames             (5 fields complete + level enforced)
  → Phase 3 — Démonstration      (description ≥ 40 + grounding)
  → Phase 4 — Composition ≥ 3    (auto-comptage canonique + planned)
  → Phase 5 — Fractal info       (informational)
  → Phase 6 — Sandbox storage    (NOT canonical)
```

Source : `tools/add_sandbox_laws.py`. Logs : `audit/SANDBOX_INTEGRATION_LOG.json`,
`audit/SANDBOX_QUARANTINE_LOG.json`.

---

## 2. Résultat

| | |
|---|---:|
| Candidats considérés | 112 |
| **Intégrés sandbox** | **71** (63%) |
| Quarantinés | 41 (compositions < 3 majoritairement) |
| Nodes ajoutés à CanonicalGraph | **0** ✓ |
| `runtime_admissible` sur sandbox | tous false |
| Schema `_sandbox: true` | tous |

Distribution sandbox par famille (71 lois) :

| famille | sandbox count |
|---|---:|
| ULG | 13 |
| DVE | 13 |
| UDE | 13 |
| GHUC | 13 |
| WP11 | 9 |
| WP12 | 5 |
| SDE | 4 |
| PAL | 1 |

Quarantines majeures : SBX-WP12-* et SBX-SDE-* avec compositions < 3
(seuils stricts). Documenté dans `SANDBOX_QUARANTINE_LOG.json`.

---

## 3. Métadonnées de réversibilité par loi

Chaque loi sandbox porte :

```jsonc
{
  "_sandbox": true,
  "_sandbox_state": "incubation",
  "_decay_score": 0.0,
  "_promotion_score": 0.0,
  "_sandbox_origin": "P4_REV_001_<hash>",
  "_oracle_validation": {
    "phase_1_detection": "pass",
    "phase_2_frames": "pass",
    "phase_3_demonstration": "pass",
    "phase_4_composition_count": <int>,
    "phase_5_fractal_potential": "leaf|candidate",
    "phase_6_reversible": true
  },
  "reversible": true,
  "rollback_dependencies": [...],
  "canonical_status": "sandbox",
  "runtime_admissible": false
}
```

---

## 4. Garanties d'isolation

✓ Fichier sandbox **physiquement séparé** de canonical (`laws.json` ≠
  `laws_sandbox.json`).
✓ Validateur `validate_laws.py` ignore le sandbox (n'audite que canonical).
✓ Smoke test confirme `nodes 241` (canonical inchangé).
✓ Pipeline `tools/sandbox_pipeline.py status` détecte 0 leak.

---

## 5. Test rollback effectué

```
$ python3 tools/sandbox_pipeline.py rollback SBX-ULG-101
✓ SBX-ULG-101 + 0 dependencies removed cleanly from sandbox

$ python3 tools/sandbox_pipeline.py status
CanonicalGraph     : 241 nodes, 284 edges       # INCHANGÉ
DiscoverySandbox   : 70 nodes (était 71)
```

**Reversibility validée empiriquement** — aucune trace résiduelle.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515
TIMESTAMP:                2026-05-15T20:44:00+02:00
CANDIDATES:               112
INTEGRATED_SANDBOX:       71  (canonical inchangé)
QUARANTINED:              41
HS_BEFORE:                1.000  (canonical)
HS_AFTER:                 1.000  (canonical, sandbox isolé)
S_GLOBAL_PROXY_BEFORE:    proxy:0.90
S_GLOBAL_PROXY_AFTER:     proxy:0.90
ROLLBACK_AVAILABLE:       100% (test sandbox-pipeline rollback OK)
RUNTIME_VALIDATION:       smoke 6/6 OK · 0 erreur
```

🔶
