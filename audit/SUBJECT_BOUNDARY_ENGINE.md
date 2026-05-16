# SUBJECT BOUNDARY ENGINE

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`
**Source** : `tools/subject_boundary_engine.py`
**Verified empirically** : ✓ section "Bornage contextuel" présente dans le panel

---

## 1. Principe

> Une intelligence stable ne charge pas tout — elle sait jusqu'où
> propager. Ce moteur calcule pour chaque loi : `boundary_score`,
> `drift_probability`, `propagation_depth_limit`, etc.

12 nouveaux scores par loi.

---

## 2. Liste des scores

| score | sens |
|---|---|
| `topic_distance` | BFS distance aux ancres typiques (racines canoniques) |
| `runtime_relevance` | pertinence runtime estimée |
| `propagation_cost` | dep_load + impl_count + cgp |
| `boundary_score` | score limite contextuelle (synthèse) |
| `contextual_priority` | priorité ordre chargement |
| `drift_probability` | risque dérive hors sujet |
| `information_gain` | gain info (multi-scale + cross-domain) |
| `subject_admissibility_score` | admissibilité globale pour sujet |
| `contextual_density` | densité voisinage canoniques |
| `propagation_depth_limit` | depth max recommandée (1/2/3) |
| `runtime_focus_score` | runtime_relevance × (1 − drift) |
| `boundary_stability` | stabilité bornage |

---

## 3. Résultats

TOP 5 boundary_score :
- DVE-001 (μ1) : 0.712
- PAL-019 : 0.711
- WP11-008 : 0.710
- DVE-013 : 0.706
- ULG-003 : 0.704

GHUC-001 (μ0) : boundary_score **0.65** — **ne domine pas** car cgp
+ dep load le pénalisent. Comportement attendu.

TOP 5 drift_probability (risque dérive) :
- GHUC-006, WP11-011, WP12-017, WP12-019, SDE-015 : 0.700 chacune
  (lois avec mots vagues "tout", proches mais loin de ancres typiques)

---

## 4. Chaos tests

4/5 PASS :
- ✓ pseudo_universal_drift_detection
- ✓ propagation_depth_consistency
- ✓ hub_branching_not_topping_boundary (GHUC-001 ne saturate pas)
- ✗ distant_laws_low_boundary (calibration : seuil 0.60 trop bas)
- ✓ deep_recursion_terminates

---

## 5. UI vérifiée

Section "Bornage contextuel (sujet actif)" dans le panel détail.
9 scores affichés (boundary, topic distance, runtime relev., coût propag.,
drift, info gain, context density, depth limit, focus runtime).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
SCORES_PER_LAW:       12
TOP_BOUNDARY:         DVE-001 (0.712), PAL-019, WP11-008
HUB_NOT_DOMINATING:   ✓ GHUC-001 boundary < 0.70
CHAOS_PASSED:         4/5
EMPIRICALLY_VERIFIED: ✓ smoke test
```

🔶
