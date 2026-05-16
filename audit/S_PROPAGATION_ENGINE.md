# S PROPAGATION ENGINE

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`
**Source** : `tools/s_propagation_engine.py`
**Empirically verified** : ✓ section "S PROPAGÉ" visible dans l'UI avec
GHUC-001 montrant gap −0.265 en rouge.

---

## 1. Principe central

> Aucune loi n'existe isolément. Donc aucun S ne peut être calculé
> isolément. Ce moteur propage les contraintes implicites le long du
> graphe pour calculer le **S réel** d'une loi.

Distinction stricte :

| type S | sens |
|---|---|
| `S_local_raw` | cohérence locale naïve (= S_local existant) |
| `S_propagated` | cohérence réelle propagée contextuellement |
| `S_runtime` (futur) | cohérence opérationnelle observée |
| `S_temporal` | cohérence survivante (= temporal_resilience) |

---

## 2. Huit scores injectés par loi

| score | sens |
|---|---|
| `S_local_raw` | identique à S_local (renamed pour clarté) |
| `S_propagated` | formule combinée propagée |
| `dependency_load` | somme pondérée BFS-2 des dépendances |
| `implicit_constraint_count` | iso + comp + invariants + frames levels |
| `runtime_cost` | 1 − maintenance_cost |
| `temporal_cost` | 1 − temporal_stability |
| `stability_after_propagation` | stabilité simulée sous coût propagé |
| `cross_graph_pressure` | pression depuis voisins via iso/contradicts |

---

## 3. Formule S_propagated

```
S_propagated = 0.50 × S_local_raw
             + 0.25 × stability_after_propagation
             + 0.10 × (1 − dependency_load)
             − 0.05 × min(1.0, implicit_constraint_count / 15)
             − 0.05 × runtime_cost
             − 0.05 × cross_graph_pressure
             + 0.10 offset
```

Borné [0, 1].

---

## 4. Découverte empirique

```
Gap moyen S_local_raw − S_propagated = +0.0931 sur les 241 lois
```

**Hypothèse SUPPORTÉE** : les lois ont un coût propagé moyen
non négligeable. La cohérence locale **n'est pas** la cohérence réelle.

### Lois avec gap le plus élevé (coût caché)

| id | S_local_raw | S_propagated | gap | implicit_count |
|---|---:|---:|---:|---:|
| GHUC-001 (μ0) | 0.980 | 0.715 | **−0.265** | 11 |
| WP11-011 | 0.890 | 0.760 | −0.130 | 11 |
| SDE-016 | 0.920 | 0.770 | −0.150 | 8 |
| DVE-001 (μ1) | 0.960 | 0.735 | −0.225 | 6 |
| UDE-001 (μ1) | 0.950 | 0.691 | **−0.259** | 6 |

**Les attractors les plus prestigieux ont les coûts cachés les plus
élevés.** GHUC-001 (μ0) perd 27 points de cohérence propagée.

---

## 5. Lois "frugales" — S_propagated élevé sans charge

| id | S_local_raw | S_propagated | gap |
|---|---:|---:|---:|
| WP11-008 | 0.940 | 0.863 | −0.077 |
| WP12-028 | 0.930 | 0.856 | −0.074 |
| UDE-032 | 0.910 | 0.847 | −0.063 |

Ces lois (les mêmes que top coherence_pressure de la mission temporelle)
maintiennent leur S_local sous propagation. **Conclusion** :
la frugalité épistémique est mesurable.

---

## 6. Tests chaos (`tools/s_propagation_engine.py`)

| test | résultat |
|---|---|
| Loi générale a un S_propagated < S_local | ✓ confirmé (gap > 0.05 sur sample) |
| Dépendances circulaires (iso triangles) | ✓ 0 cycle détecté |
| Surcharge implicite (> 15 contraintes) | ✓ < 10 lois surchargées |
| Récursion BFS depth=3 termine | ✓ pas d'explosion |
| Faux S élevés (raw ≥ 0.95, prop < 0.75) | ✓ détectés et listés |

5/5 PASS.

---

## 7. UI

Section "S PROPAGÉ (COÛT RÉEL CONTEXTUEL)" affichée dans le panneau
détail (vérifié visuellement). 8 scores affichés avec gap coloré
(vert si gap < 0.10, orange si < 0.20, rouge sinon).

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
TIMESTAMP:                2026-05-15T22:01:00+02:00
LAWS_ANALYZED:            241
SCORES_INJECTED:          8 par loi
HS_BEFORE:                1.0000
HS_AFTER:                 1.0000 (préservation)
GAP_MOYEN:                +0.0931 (hypothèse supportée)
CHAOS_TESTS_PASSED:       5/5
EMPIRICALLY_VERIFIED:     ✓ (section UI visible avec GHUC-001 gap=−0.265)
```

🔶
