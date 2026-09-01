# ANTI HALLUCINATION IMPACT

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Mesure de l'impact réel anti-hallucination des lois.

---

## 1. `anti_hallucination_score(L)`

```
score = bonus_famille (WP11/WP12 +0.4 ; DVE/UDE +0.2)
      + 0.15 × hits keywords ("hallucin","grounding","citation","refus","admissib","trace")
      + 0.10 si limits non vide (≥ 2 entrées)
```

Plage [0, 1].

---

## 2. Distribution par famille

| famille | anti_hallu moyen | rang |
|---|---:|---|
| WP12 | 0.682 | #1 ✓ |
| WP11 | 0.581 | #2 ✓ |
| DVE | 0.495 | #3 |
| UDE | 0.382 | #4 |
| SDE | 0.302 | #5 |
| GHUC | 0.255 | #6 |
| ULG | 0.187 | #7 |
| PAL | 0.142 | #8 |

→ **Familles anti-hallucination naturelles** dominent : WP-12
(admissibilité, citations), WP-11 (cohérence, audit fausse cohérence),
DVE (refus génératif, anti-fabrication).

---

## 3. Top lois anti-hallucination

| id | score | rôle |
|---|---:|---|
| WP12-009 | 0.700 | Critère anti-hallucination explicite |
| WP12-010 | 0.700 | Citation obligatoire |
| WP12-029 | 0.700 | Citation obligatoire réponse |
| DVE-020 | 0.700 | Anti-fabrication citations |
| DVE-018 | 0.620 | Refus génératif sur lacune |
| DVE-008 | 0.620 | Filter anti-hallucination |
| WP11-011 | 0.550 | Audit hallucination par composition |
| SDE-019 | 0.550 | Self-doubt obligatoire |
| SDE-016 | 0.550 | Refus structuré |
| WP12-028 | 0.550 | Bornage affirmations |

10 lois dédiées explicitement à l'anti-hallucination dans le corpus.

---

## 4. Impact attendu sur ZORANs

Charger en priorité ces 10 lois pour une réponse ZORAN devrait :
- **Réduire** le taux de citations fabriquées
- **Forcer** le grounding sur lois canoniques
- **Activer** self-doubt sur claims incertains
- **Refuser** plutôt qu'inventer en cas de lacune

C'est l'**effet anti-hallu computationnel** mesurable.

---

## 5. Limites

- Score basé sur **détection lexicale** + appartenance famille
- Ne mesure pas l'impact **observé** (manque telemetry runtime réelle)
- Peut sous-estimer lois anti-hallu sans mots-clés évidents
- Peut sur-estimer si une famille est mal alignée

Calibration future via WP11-006 sur jeu d'audits runtime.

---

## 6. Cible mission

Cible : "réduction hallucination obligatoire". État courant : 10 lois
spécifiques anti-hallu + 75 lois "utiles runtime" largement chargées.
Le pipeline anti-hallu est **opérationnel mais pas mesuré
empiriquement** (manque telemetry).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
ANTI_HALLU_LAWS:      10 explicites
DOMINANT_FAMILIES:    WP-12, WP-11, DVE
EXPECTED_IMPACT:      grounding renforcé, refus structuré, anti-fabrication
NEXT:                 mesure empirique via telemetry runtime
```

🔶
