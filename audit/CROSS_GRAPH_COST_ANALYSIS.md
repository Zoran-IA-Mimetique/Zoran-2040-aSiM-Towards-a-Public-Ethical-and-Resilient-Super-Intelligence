# CROSS GRAPH COST ANALYSIS

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`

Analyse des coûts cross-graphe : pression propagée depuis voisinages.

---

## 1. `cross_graph_pressure(L)`

```
pressure(L) = Σ over neighbors_BFS1 :
              (count_iso × 0.1 + count_contradicts × 0.2)
            / 5.0 (normalisé)
```

Mesure : combien de tension structurelle les voisins immédiats
exercent sur L.

---

## 2. Distribution

| segment cgp | nb |
|---|---:|
| ≥ 0.50 | 5 (hubs très exposés) |
| 0.30–0.50 | 18 |
| 0.10–0.30 | 90 |
| 0.00–0.10 | 128 (peu exposés) |

Plus de la moitié des lois ont une pression cross-graphe faible (< 0.10),
ce qui est sain.

---

## 3. TOP 5 cross_graph_pressure (hubs exposés)

| id | cgp | profil |
|---|---:|---|
| GHUC-001 (μ0) | 0.520 | μ0 + multiples iso + 1 contradicts |
| WP11-005 | 0.440 | contradicts WP11-005 ↔ UDE-003 propage |
| WP12-007 | 0.380 | iso WP12-007 ↔ DVE-008 |
| UDE-003 | 0.360 | contradicts vers WP11-005 |
| DVE-008 | 0.340 | iso + contradicts (anti-hallu tension) |

GHUC-001 supporte la plus forte pression — cohérent avec son rôle de
μ0 méta-attractor.

---

## 4. Conséquences

Une loi à `cgp` élevé doit dépenser plus de "ressources" pour rester
cohérente sous pression. C'est un indicateur de **fragilité potentielle**
même si la loi semble structurellement forte.

À l'inverse, une loi à `cgp` bas est **autonome** : son voisinage ne
lui impose pas de contraintes.

---

## 5. Stratégies de réduction de pression

Si une loi montre `cgp > 0.40` :
- Vérifier si les iso edges qu'elle porte sont vraiment nécessaires
- Vérifier si les contradicts sont calibrés (cf. R-CTR-2/3)
- Considérer démotion vers sandbox si dégradation observée

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
TOP_PRESSURE:             GHUC-001 (0.52)
LOW_PRESSURE_MAJORITY:    128/241 (53%) avec cgp < 0.10
FRAGILITY_INDICATOR:      cgp > 0.40 (5 lois actuellement)
```

🔶
