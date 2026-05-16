# LLM RELEVANT LAW ESTIMATOR

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`
**Source** : `tools/llm_relevant_law_estimator.py`
**Verified empirically** : ✓ section "Pertinence LLM" présente dans le panel

---

## 1. Principe

> Le CanonicalGraph peut être large, mais Runtime doit être sélectif.
> Ce moteur estime, par loi, l'utilité réelle pour améliorer les ZORANs.

8 nouveaux scores par loi :

| score | sens |
|---|---|
| `llm_relevance_score` | score global pertinence LLM [0,1] |
| `runtime_impact_score` | impact runtime estimé |
| `anti_hallucination_score` | contribution anti-hallucination |
| `contextualization_gain` | gain pour CLE |
| `propagation_cost` | coût propagationnel (re-utilisé) |
| `cross_domain_reuse` | réutilisabilité multi-domaines |
| `runtime_survival_score` | capacité survie runtime |
| `canonical_priority` | priorité canonique |

---

## 2. Formule llm_relevance_score (calibrée)

```
llm_relevance = 0.30 × runtime_impact_score
              + 0.25 × anti_hallucination_score
              + 0.15 × contextualization_gain
              + 0.15 × cross_domain_reuse
              + 0.15 × runtime_survival_score
              − 0.05 × propagation_cost
```

Plage [0, 1]. Calibrée pour étalement statistique honnête.

---

## 3. Distribution observée (241 lois)

| classe | seuil | nb | % |
|---|---|---:|---:|
| Fondamentales LLM | ≥ 0.65 | 0 | 0.0% |
| **Majeures** | 0.55–0.65 | **5** | 2.1% |
| **Utiles** | 0.45–0.55 | **103** | 42.7% |
| Marginales | 0.30–0.45 | 120 | 49.8% |
| Non pertinentes | < 0.30 | 13 | 5.4% |

**Estimation mission** :
- "fondamentales : 20-50" → corpus actuel a 0 (formule conservatrice)
- "majeures : 100-300" → corpus actuel a 5 (sous-représenté)
- "utiles : 500-1500" → corpus actuel a 103 (cohérent avec petit corpus)

→ Le corpus actuel **n'a pas saturé** les niveaux fondamentaux. C'est
**honnête** : les fondamentales LLM n'existent que dans un corpus
massif.

---

## 4. TOP 5 llm_relevance_score

| id | llm | impact | anti_hallu | profil |
|---|---:|---:|---:|---|
| WP12-009 | 0.587 | 0.819 | 0.700 | critère anti-hallu admissibilité |
| WP12-001 | 0.559 | 0.838 | 0.550 | racine admissibilité μ1 |
| WP11-011 | 0.555 | 0.818 | 0.550 | audit hallucination composition |
| WP12-010 | 0.555 | 0.822 | 0.700 | critère citation obligatoire |
| WP11-001 | 0.554 | 0.859 | 0.400 | racine cohérence μ1 |

**Pattern observé** : les lois TOP llm_relevance sont **toutes** des
familles WP-11/WP-12 (cohérence + admissibilité + anti-hallucination).
Cohérent avec l'objectif "améliorer les ZORANs".

---

## 5. Chaos tests

3/4 PASS :
- ✓ pseudo_universal_low_relevance
- ✓ anti_hallu_families_dominate (WP-12/WP-11/DVE dominent anti-hallu)
- ✗ runtime_survival_correlates_relevance (corrélation < 0.40 attendue)
- ✓ no_epistemic_inflation (< 30% de lois en haut)

---

## 6. UI vérifiée

Section "Pertinence LLM (utilité ZORANs)" dans le panel détail.
7 scores affichés avec tier coloré (fondamentale / majeure / utile / marginale / non pertinente).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
TIMESTAMP:            2026-05-16T00:05:00+02:00
SCORES_PER_LAW:       8
TOP_RELEVANCE:        WP12-009 (0.587)
HONEST_DISTRIBUTION:  pas de fondamentale détectée (formule stricte)
ANTI_HALLU_DOMINANCE: ✓ WP-12/WP-11/DVE dominent
CHAOS_PASSED:         3/4
EMPIRICALLY_VERIFIED: ✓ smoke test (section UI visible)
```

🔶
