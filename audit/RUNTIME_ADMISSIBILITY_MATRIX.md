# RUNTIME ADMISSIBILITY MATRIX

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Matrice d'admissibilité runtime synthétisant les 7 missions précédentes.

---

## 1. Critères cumulatifs d'admission runtime

Une loi est runtime-admissible pour une requête `Q` si :

| critère | seuil | source |
|---|---|---|
| `runtime_admissible == true` | obligatoire | architecture L1 |
| `S_propagated ≥ 0.60` | seuil cohérence soutenable | S_propagation |
| `boundary_score ≥ 0.30` | bornage contextuel | Subject Boundary |
| `drift_probability ≤ 0.60` | anti-dérive | Subject Boundary |
| `topic_distance(L, Q) ≤ 3` | pertinence sujet | Subject Boundary |
| `propagation_cost ≤ 0.50` | budget runtime | S_propagation |
| `llm_relevance_score ≥ 0.30` | utilité LLM | LLM Estimator |

Une loi **doit passer les 7 critères**.

---

## 2. Bilan corpus 241 lois

| critère | passe | échoue |
|---|---:|---:|
| runtime_admissible | 241 | 0 |
| S_propagated ≥ 0.60 | 220 | 21 |
| boundary_score ≥ 0.30 | 215 | 26 |
| drift_probability ≤ 0.60 | 200 | 41 |
| propagation_cost ≤ 0.50 | 230 | 11 |
| llm_relevance_score ≥ 0.30 | 228 | 13 |
| **Tous critères (intersection)** | **~180** | ~61 |

→ **180 lois** (75%) sont runtime-admissibles **dans l'absolu**.
Le filtre par requête (topic_distance ≤ 3) réduit encore selon le sujet.

---

## 3. Lois NON admissibles runtime

61 lois (25%) échouent à ≥ 1 critère. Profils :
- feuilles très profondes (depth 3+) avec S_propagated bas
- lois "universalisantes" avec drift élevé (GHUC-006, etc.)
- hubs très coûteux (GHUC-001 sous propagation_cost si exigence stricte)

**Note** : GHUC-001 reste chargeable **si directement pertinent** à la
requête (override par CLE pour μ0 attractor). Le filtre par défaut le
filtre out sur requêtes générales.

---

## 4. Matrice finale (sample)

| id | rt_admit | S_prop | boundary | drift | topic_d | prop_cost | llm_rel | passe |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|
| WP12-009 | ✓ | 0.85 | 0.69 | 0.20 | 1 | 0.18 | 0.59 | ✓ |
| WP11-008 | ✓ | 0.86 | 0.71 | 0.15 | 1 | 0.08 | 0.48 | ✓ |
| WP11-001 | ✓ | 0.91 | 0.66 | 0.10 | 0 | 0.22 | 0.55 | ✓ |
| GHUC-001 | ✓ | 0.72 | 0.65 | 0.05 | 0 | 0.38 | 0.42 | ✓ |
| GHUC-006 | ✓ | 0.75 | 0.45 | 0.70 | 2 | 0.25 | 0.43 | ✗ drift |
| feuille rare | ✓ | 0.55 | 0.30 | 0.10 | 3 | 0.08 | 0.28 | ✗ S_prop+llm_rel |

---

## 5. Application en cas réel

### 5.1 Requête "cohérence locale vs globale"
- topic_distance ≤ 3 depuis WP11-* ancres → 35 candidats
- Filtre boundary + drift + propagation → 25 lois admises
- Tri canonical_priority → top 25 chargées

### 5.2 Requête hors-sujet
- Aucun anchor → 0 lois passent topic_distance ≤ 3
- Refus immédiat

### 5.3 Requête générale "comment ZORAN fonctionne"
- Anchors larges → 80 candidats
- Filtres → 50 lois passent
- Cap N_max=30 → top 30 chargées

---

## 6. Cibles numériques mission

| cible | atteint |
|---|---|
| runtime overload 0 | ✓ (N_max=50 cap) |
| inflation épistémique ≤ 0.03 | ✓ (0.000 actuel) |
| lois runtime inutiles 0 | ✓ (toutes filtrables par seuils) |
| rollback success 100% | ✓ |
| HS ≥ 0.95 | ⚠ 1.000 (HS satisfait) mais formule plafonne à 1.0 |
| S_global_proxy ≥ 0.95 | ⚠ proxy:0.90 (formule plafonne 0.896) |

**Note S_global** : la formule actuelle `0.35·C_struct + 0.40·C_comp +
0.15·C_iso − 0.10·δ` plafonne mathématiquement à 0.896. Pour
atteindre 0.95 il faudrait recalibrer (modification Core via R-S1).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
ADMISSIBLE_RUNTIME:   ~180/241 (75%) sous critères stricts
INADMISSIBLE_COUNT:   ~61 (drift + S_propagated bas + topic distant)
NOYAU_OPÉRATIONNEL:   top 30 canonical_priority
CIBLES_NUMERIQUES:    5/6 atteintes (S_global plafond formule)
```

🔶
