# PROPAGATION STOPPING RULES

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Règles d'arrêt strict de la propagation contextuelle.

---

## 1. Conditions d'arrêt

Une expansion BFS s'arrête quand **l'une** de ces conditions est
satisfaite :

| condition | seuil | type |
|---|---|---|
| Profondeur atteint depth max | param utilisateur | hard |
| Nœud courant atteint son `propagation_depth_limit` | individuel | hard |
| Loi candidate a `boundary_score < 0.30` | filter | soft (skip) |
| Loi candidate a `drift_probability > 0.60` | filter | soft (skip) |
| Cap total N_max atteint | 50 absolu | hard |
| Sous-graphe fragmenté | métrique | soft (warn) |

---

## 2. Conditions de continuation

Continuer si **tout** :
- `boundary_score ≥ 0.30`
- `drift_probability ≤ 0.60`
- depth courant < `propagation_depth_limit` du nœud
- N total < 50

---

## 3. Garanties

| garantie | preuve |
|---|---|
| Termine en temps fini | BFS borné, depth ≤ 3 max |
| Pas d'explosion combinatoire | N_max = 50 cap |
| Reste sur le sujet | drift filter |
| Reste cohérent | boundary filter |
| Pas de fragmentation | extracteur sous-graphe canonique |

---

## 4. Exemples concrets

### 4.1 Sujet "cohérence" (anchors WP11-*)

```
depth 0 : WP11-001 (anchor)
depth 1 : WP11-002, WP11-003, WP11-004 (enfants) + WP12-001 (iso)
depth 2 : WP11-005, WP11-002-a, WP11-002-b, WP11-006, etc.
depth 3 : WP11-002-a-i, WP11-002-a-ii, etc.

STOP : depth 3 atteint, N ~ 25 lois
```

### 4.2 Sujet "consolidation" (anchor GHUC-001)

```
depth 0 : GHUC-001
depth 1 : GHUC-002, GHUC-003, GHUC-004, GHUC-005, GHUC-006, ...
         (mais propagation_depth_limit=1 sur GHUC-001 car coûteux)

STOP : depth 1 atteint pour GHUC-001 spécifiquement, N ~ 15 lois
```

→ GHUC-001 limite naturellement la propagation à cause de son haut
coût.

---

## 5. SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
STOP_CONDITIONS:      6 (5 strictes + 1 warn)
TERMINATION:          garantie en temps fini
MAX_NODES:            50 absolu
```

🔶
