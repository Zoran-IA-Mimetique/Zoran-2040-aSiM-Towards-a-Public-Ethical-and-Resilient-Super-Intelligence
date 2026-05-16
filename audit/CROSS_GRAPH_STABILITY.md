# CROSS GRAPH STABILITY

**Mission** : `ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515`

Stabilité d'une loi mesurée à **travers les familles** et **les
sous-graphes**, pas seulement localement.

---

## 1. `cross_graph_stability(L)`

```
score = 0.5 × min(1.0, |families_touched| / 5)
      + 0.5 × mean(S_global of neighbors_BFS2)
```

Combine :
- **Couverture famille** : combien de familles L touche via voisinage
- **Santé du voisinage** : S_global moyen des nœuds proches

Une loi avec haute cross_graph_stability est :
- soit transverse (touche plusieurs familles via iso/related)
- soit dans un voisinage globalement sain

---

## 2. Distribution

| segment | nb | profil |
|---|---:|---|
| ≥ 0.85 | 3 | racines canoniques + ponts transverses |
| 0.70–0.85 | 18 | hubs intermédiaires |
| 0.50–0.70 | 90 | nœuds réguliers |
| 0.30–0.50 | 85 | feuilles avec voisinage moyen |
| < 0.30 | 45 | nœuds très spécialisés |

---

## 3. Lois transverses identifiées (top cross_graph_stability)

Lois touchant le plus de familles via leur voisinage :

| id | familles touchées | score |
|---|---:|---:|
| GHUC-001 | 8/8 | 0.89 |
| WP12-001 | 7/8 | 0.87 |
| ISO-002 (composition) | 4/8 | 0.85 |

---

## 4. Lois localement stables mais cross-faibles

Certaines lois ont S_local élevé mais cross_graph_stability moyen — elles
sont **localement performantes** mais **systémiquement isolées**. Ce sont
les candidates idéales pour :
- ajout d'iso bridges vers autres familles (gain cross sans perte local)
- ou pruning si effectivement isolées sans valeur transverse

---

## 5. Implication pour la pression de sélection

Une loi avec haute cross_graph_stability **résiste mieux** au temps :
- multiple familles la maintiennent
- son retrait impacterait plusieurs sous-graphes
- elle est multi-référencée

Inversement, une loi cross-faible est un **candidat naturel à decay**.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515
TOP_CROSS_STABILITY:      GHUC-001 (0.89), WP12-001 (0.87)
TRANSVERSE_LAWS_HIGH:     ~3 lois
LOCALLY_STABLE_CROSS_LOW: ~10 lois (candidats iso bridges)
```

🔶
