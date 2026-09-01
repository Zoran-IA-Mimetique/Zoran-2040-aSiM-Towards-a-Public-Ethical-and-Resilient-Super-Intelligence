# RUNTIME USEFULNESS ANALYSIS

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Analyse de l'utilité réelle des lois en runtime.

---

## 1. Critères d'utilité runtime

```
useful_runtime(L) ⟺
    L.runtime_impact_score ≥ 0.65
  ∧ L.runtime_admissible == true
  ∧ L.boundary_score ≥ 0.40
  ∧ L.propagation_cost ≤ 0.40
```

---

## 2. Lois passant les 4 critères

| segment | nb |
|---|---:|
| Passe tous les critères | 75 |
| Échoue à 1 critère | 95 |
| Échoue à 2+ critères | 71 |

→ **75 lois** (31%) sont **vraiment utiles runtime** selon ces seuils
stricts.

---

## 3. Top 10 runtime_impact_score

| id | impact | famille |
|---|---:|---|
| WP11-008 | 0.863 | WP11 |
| WP11-001 | 0.859 | WP11 |
| WP11-028 | 0.846 | WP11 |
| WP12-001 | 0.838 | WP12 |
| WP12-028 | 0.836 | WP12 |
| ULG-001 | 0.835 | ULG |
| DVE-001 | 0.833 | DVE |
| WP11-002 | 0.829 | WP11 |
| UDE-014 | 0.826 | UDE |
| WP12-007 | 0.822 | WP12 |

Familles dominantes runtime : WP-11, WP-12, ULG, DVE, UDE.

---

## 4. Lois de faible utilité runtime

13 lois avec llm_relevance < 0.30. Profils :
- feuilles très spécialisées (depth 3+)
- variants instables sans iso
- lois palieroniques rares (PAL-* avec niveaux limités)

Ces lois sont **candidates à démotion sandbox** (audit Adaptive).

---

## 5. Ratio impact / coût

Lois avec **meilleur ratio** runtime_impact / propagation_cost :

| id | impact | cost | ratio |
|---|---:|---:|---:|
| WP11-008 | 0.863 | 0.080 | 10.8 |
| WP12-028 | 0.836 | 0.090 | 9.3 |
| WP11-028 | 0.846 | 0.100 | 8.5 |
| UDE-032 | 0.815 | 0.105 | 7.8 |

Ces 4 lois sont **excellentes en efficience** : haut impact, bas coût.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
USEFUL_RUNTIME_NB:    75/241 (31%)
TOP_IMPACT_FAMILY:    WP-11 (5/10 in top 10)
BEST_RATIO_LAW:       WP11-008 (impact/cost = 10.8)
```

🔶
