# DYNAMIC SELECTION REPORT

**Mission** : `ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515`

Rapport sur la **sélection dynamique** appliquée aux 241 lois canoniques.

---

## 1. Méthodologie

Chaque loi reçoit `dynamic_selection_rank` = rang dans le tri descendant
par `coherence_pressure_score`.

```
rank 1   = highest coherence_pressure (most "selected by reality")
rank N   = lowest coherence_pressure (least selected)
```

---

## 2. Top 25 sélection dynamique (= sidebar "SÉLECTION TEMPORELLE ▾")

| rang | id | famille | cps | persistence | cost (haut = bon) |
|---:|---|---|---:|---:|---:|
| 1 | WP11-008 | WP11 | 0.840 | 0.650 | 0.960 |
| 2 | WP12-028 | WP12 | 0.838 | 0.650 | 0.960 |
| 3 | UDE-021 | UDE | 0.833 | 0.650 | 0.960 |
| 4 | SDE-019 | SDE | 0.833 | 0.650 | 0.960 |
| 5 | UDE-032 | UDE | 0.833 | 0.650 | 0.960 |
| 6–25 | (cf. `audit/TEMPORAL_COHERENCE_REPORT.json` champ `top_coherence_pressure`) |

---

## 3. Patterns observés

### 3.1 Familles dominantes en sélection dynamique

| famille | nb dans top 25 |
|---|---:|
| WP11 | 6 |
| WP12 | 7 |
| UDE | 6 |
| SDE | 3 |
| DVE | 2 |
| GHUC | 1 |
| ULG | 0 |
| PAL | 0 |

→ Familles **anti-hallucination / audit / mémoire** dominent. Pas
GHUC/ULG malgré leur statut μ0/μ1. Cela suggère que ce qui survive est
ce qui **opère discrètement et efficacement** — pas ce qui est central.

### 3.2 Anti-pattern : les μ0 ne dominent pas

GHUC-001 (μ0) n'est pas dans le top 25 dynamique. Cela ne signifie pas
qu'il est inutile — au contraire, son rôle structurel est essentiel.

Mais sous **pression de sélection temporelle**, ce sont les lois qui
**coûtent peu et persistent** qui dominent. GHUC-001 a un coût de
maintenance élevé (nombreuses arêtes structurelles).

### 3.3 Convergence avec compositions sandbox P4

Les top 5 sont tous des lois **sandbox-promotées** en P2 ou P3
(`UDE-021`, `SDE-019`, `UDE-032`, `WP11-008`, `WP12-028`). Elles ont
été intégrées récemment via le pipeline strict — donc :
- compositions ≥ 3 (mais pas saturated)
- structures simples
- frames complets sans bloat

Le système **promeut spontanément les nouvelles arrivées efficaces**.

---

## 4. Distribution complète

| segment rank | nb |
|---:|---:|
| 1–25 (top) | 25 |
| 26–100 | 75 |
| 101–200 | 100 |
| 201–241 (bottom) | 41 |

---

## 5. Sélection vs Compositions

Corrélation entre `dynamic_selection_rank` et `compositions_count` :
- corrélation Spearman ≈ -0.20 (faible négative)
- les lois "moyennement composées" dominent la sélection dynamique
- les lois sur-composées (saturated comp_score=1.0) ne sont **pas**
  automatiquement au sommet temporel

→ La **complexité compositionnelle n'est pas un avantage évolutif**
sous pression de cohérence.

---

## 6. Implications pratiques

### 6.1 Pour ZenRuntime

Charger en priorité les top `dynamic_selection_rank` :
- moins coûteux en RAM
- plus stables en runtime
- moins susceptibles de conflits

### 6.2 Pour DiscoveryEngine

Favoriser candidates avec :
- frames minimaux mais complets
- 3-5 compositions (pas 10+)
- coût de maintenance bas

### 6.3 Pour la gouvernance

Vérifier que les nouveaux ajouts maintiennent `coherence_pressure_score`
> 0.50 — sinon prune avant intégration.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515
TOP_RANK_LAW:             WP11-008 (rank #1)
DOMINANT_FAMILY_DYNAMIC:  WP12 + WP11 + UDE (anti-hallu/audit/mémoire)
GHUC_001_RANK:            > 25 (μ0 mais pas dans top dynamique)
INSIGHT:                  prestige structurel ≠ survival dynamique
```

🔶
