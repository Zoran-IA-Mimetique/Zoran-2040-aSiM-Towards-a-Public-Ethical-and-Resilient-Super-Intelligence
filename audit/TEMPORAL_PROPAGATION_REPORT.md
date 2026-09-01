# TEMPORAL PROPAGATION REPORT

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`

Rapport sur la dimension **temporelle** intégrée à la propagation.

---

## 1. `temporal_cost(L)` = 1 − `temporal_stability(L)`

Une loi avec `temporal_stability` haute coûte peu en propagation temporelle.
À l'inverse, une loi instable temporellement (high temporal_cost) ajoute
un coût croissant avec le temps.

---

## 2. Articulation des 3 axes coût

| coût | source | unité |
|---|---|---|
| `runtime_cost` | maintenance des arêtes structurelles | par opération |
| `temporal_cost` | dérive prévisible dans le temps | par cycle |
| `cross_graph_pressure` | tension exercée par voisinage | instantanée |

Les trois s'additionnent dans `S_propagated`.

---

## 3. Distribution des coûts temporels

| segment temporal_cost | nb |
|---|---:|
| ≥ 0.50 (coûteux) | 28 |
| 0.30–0.50 | 75 |
| 0.10–0.30 | 110 |
| 0.00–0.10 (frugal) | 28 |

Les 28 lois "frugales temporellement" sont précisément le set qui
domine `coherence_pressure_score` de la mission temporelle.

---

## 4. Convergence temporelle-propagation

| critère | corrélation observée |
|---|---:|
| `temporal_stability` vs `S_propagated` | +0.78 |
| `dynamic_selection_rank` vs `S_propagated` (rank #1 = best) | -0.65 |
| `temporal_cost` vs `gap (S_local−S_propagated)` | +0.55 |

→ Les lois temporellement stables sont aussi celles dont le S_propagated
est élevé. **Convergence des deux moteurs**.

---

## 5. Implication

Les missions Distributed + Temporal + S_Propagation produisent des
verdicts **convergents** :

| ranking | top des 3 missions |
|---|---|
| Distributed top hier_conf | GHUC-001, WP12-001, UDE-001 |
| Temporal top dynamic_rank | WP11-008, WP12-028, UDE-021 |
| S_Propagation top S_propagated | WP11-008, WP12-028, UDE-032 |

Les **lois frugales** (TOP temporal + TOP S_propagated) coïncident.
Les **lois prestigieuses** (TOP distributed) dominent la centralité
structurelle.

Conclusion : il existe **deux strates** :
- centrale structurelle (GHUC-001 et co.) — hauts coûts
- résiliente (WP11-008 et co.) — bas coûts

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
CONVERGENCE_OBSERVED:     Temporal ∩ S_Propagation top = 80% overlap
DISTRIBUTED_DIFFERENT:    distributed top centré sur compositions
DUAL_STRATES_CONFIRMED:   centrale + résiliente coexistent
```

🔶
