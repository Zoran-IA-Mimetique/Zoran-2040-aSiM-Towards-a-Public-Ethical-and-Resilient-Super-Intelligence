# LAW COST MODEL

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Modèle de **coût** des lois pour ZORAN runtime.

---

## 1. Quatre dimensions de coût

| coût | source | unité |
|---|---|---|
| `dependency_load` | arêtes structurelles à maintenir | 0–1 normalisé |
| `implicit_constraint_count` | iso + comp + invariants + frames | entier |
| `runtime_cost` | maintenance opérationnelle | 0–1 |
| `temporal_cost` | dérive prévisible | 0–1 |
| `cross_graph_pressure` | tension voisinage | 0–1 |
| `propagation_cost` | synthèse propagation | 0–1 |

---

## 2. Distribution coût total

Coût total agrégé = `(dependency_load + propagation_cost + runtime_cost) / 3` :

| segment coût agrégé | nb | profil |
|---|---:|---|
| ≥ 0.50 | 5 | hubs très coûteux |
| 0.30–0.50 | 25 | canoniques structurants |
| 0.15–0.30 | 110 | nœuds réguliers |
| < 0.15 | 101 | feuilles frugales |

---

## 3. Lois les plus coûteuses

| id | dep | impl | runtime | cgp | profil |
|---|---:|---:|---:|---:|---|
| GHUC-001 (μ0) | 0.220 | 11 | high | 0.520 | méta-attractor central |
| WP11-005 | 0.180 | 7 | high | 0.440 | hub contradictions |
| UDE-014 | 0.175 | 6 | moderate | 0.20 | hub mémoire |
| WP12-007 | 0.160 | 6 | high | 0.30 | hub auditabilité |
| DVE-001 (μ1) | 0.158 | 6 | high | 0.25 | racine DVE |

Tous ces hubs portent des coûts substantiels — c'est le **prix de leur
centralité**.

---

## 4. Lois les plus frugales

| id | total cost | runtime_impact | ratio impact/cost |
|---|---:|---:|---:|
| WP11-008 | 0.080 | 0.863 | 10.8 (excellent) |
| WP12-028 | 0.090 | 0.836 | 9.3 |
| UDE-032 | 0.105 | 0.815 | 7.8 |
| SDE-019 | 0.108 | 0.812 | 7.5 |

Ces lois ont le **meilleur retour sur investissement structurel**.

---

## 5. Recommandations stratégiques

### 5.1 Pour démotion sandbox
Lois avec **coût total > 0.40 ET runtime_impact < 0.50** : candidates à
démotion (ROI négatif).

État actuel : **0 cas observé** sur 241. Bon.

### 5.2 Pour promotion
Lois avec **coût total < 0.15 ET impact ≥ 0.65** : candidates à
promotion μ-tier ou ★.

État actuel : **~10 cas** (WP11-008 et co.). Déjà détectés par
SuperiorityDecayEngine.

### 5.3 Pour audit
Lois avec **coût total > 0.40 mais essentielles** (μ0/μ1) :
audit régulier obligatoire (cf. R-S5, R-S6 monotonie sous compression).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
COST_DIMENSIONS:      6 mesurées
HIGH_COST_HUBS:       5 (GHUC-001 et co.)
FRUGAL_TOP:           WP11-008 (ratio 10.8)
DEMOTION_CANDIDATES:  0 (bonne santé)
```

🔶
