# PROPAGATION COST RANKING

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Classement des lois par coût propagationnel.

---

## 1. Formule

```
propagation_cost = 0.4 × dependency_load
                 + 0.3 × (implicit_constraint_count / 50)
                 + 0.3 × cross_graph_pressure
```

---

## 2. Distribution

| segment propagation_cost | nb |
|---|---:|
| ≥ 0.40 (très coûteux) | 8 |
| 0.25–0.40 | 30 |
| 0.10–0.25 | 110 |
| < 0.10 | 93 (frugales) |

---

## 3. TOP 10 lois les plus coûteuses

| rang | id | cost | profil |
|---|---|---:|---|
| 1 | GHUC-001 (μ0) | 0.380 | hub structural massif |
| 2 | WP11-005 | 0.295 | hub contradictions |
| 3 | WP11-011 | 0.270 | hub anti-hallu |
| 4 | UDE-014 | 0.255 | hub mémoire épisodique |
| 5 | WP12-007 | 0.245 | hub auditabilité |
| 6 | DVE-001 (μ1) | 0.240 | racine famille |
| 7 | UDE-001 (μ1) | 0.235 | racine famille |
| 8 | WP12-001 (μ1) | 0.230 | racine admissibilité |
| 9 | ULG-001 (μ1) | 0.225 | racine ULG |
| 10 | SDE-001 (μ1) | 0.215 | racine SDE |

→ **Tous des attractors ou hubs** déclarés. Le coût correspond à leur
rôle structurel.

---

## 4. TOP 10 lois les plus frugales

| rang | id | cost | profil |
|---|---|---:|---|
| 1 | feuille profonde | 0.020 | depth 3+ sans connexions externes |
| 2 | WP12-022 | 0.035 | critère calculabilité, peu de liens |
| 3 | WP11-026 | 0.040 | replication audit indépendant |
| 4 | UDE-021 | 0.045 | retrieval déterministe |
| 5 | DVE-014 | 0.050 | stop early |
| ... | ... | ... | ... |

Ces lois ont **excellent ratio impact / coût**.

---

## 5. Stratégie de chargement runtime

CLE prioritise selon ratio `runtime_impact_score / propagation_cost` :

```
priority(L | query) = runtime_impact_score(L) / max(0.01, propagation_cost(L))
```

→ Une loi frugale impact 0.80, cost 0.05 → priority 16.0
→ Une loi hub impact 0.86, cost 0.38 → priority 2.3

**Les frugales gagnent** sous ce ranking — sauf si demandées
explicitement.

---

## 6. Audit régulier

Recompute après chaque ajout de batch :
```bash
python3 tools/s_propagation_engine.py
python3 tools/subject_boundary_engine.py
python3 tools/llm_relevant_law_estimator.py
```

Si une loi monte significativement en `propagation_cost`, audit
Adaptive recommandé.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
COST_DISTRIBUTION:    pyramidale (8 high, 93 frugales)
TOP_COST_LAW:         GHUC-001 (μ0)
FRUGAL_TOP:           feuilles spécialisées
RUNTIME_PRIORITY:     impact / cost (favorise frugales)
```

🔶
