# SUBTRACTION EXPERIMENT REPORT V11 — 4 pipelines

**Mission** : `V11_DECISION_GATE_20260517` (P1)
**Dataset** : 30 cas BTP variés (adversariaux + experts + couplages + traps)

> Question centrale : *La complexité V1-V10 apporte-t-elle un gain mesurable vs MINIMAL + extensions ciblées ?*

---

## 1. Pipelines comparés

| Pipeline | Composantes | Description |
|---|---|---|
| **A FULL** | 11 (V1-V10) | btp + fragility + systemic + goodhart + seductive + density + cta + practical + concrete + jargon + terrain |
| **B MINIMAL** | 2 (V7+V10) | identity_gate + causal_density |
| **C MINIMAL + VERNACULAR** | 3 | B + vernacular_wisdom (max-merge) |
| **D MINIMAL + PHYSICAL** | 3 | B × physical_causality (multiplicatif) |

---

## 2. Résultats globaux

| Métrique | A FULL | B MINIMAL | C +VERNACULAR | D +PHYSICAL |
|---|---|---|---|---|
| **Spearman ρ** | **0.639** | 0.552 | 0.517 | 0.559 |
| Kendall Tau | 0.453 | 0.375 | 0.398 | 0.377 |
| Latence | 2.91 ms | 0.12 ms | 0.41 ms | 0.17 ms |
| Inversions adv. | 1/6 | 1/6 | **0/6** | 1/6 |

### Lecture
- **A FULL est le meilleur** sur Spearman et Kendall
- Gap A vs B = **+0.088** sur Spearman → mesurable
- Mais A coûte 24.7× plus cher en latence
- **C VERNACULAR est PIRE que B** (−0.035) → vernacular naïf nuit
- **D PHYSICAL ≈ B** (+0.007) → physical_causality apporte peu en isolation

---

## 3. Analyse pipeline par pipeline

### A FULL
**Points forts** :
- Meilleure Spearman (0.639) — au-dessus du seuil 0.60 "calibration plausible"
- Plus stable (Kendall 0.453, meilleur des 4)

**Points faibles** :
- Plafond ~6.6/10 même pour cas experts (devrait atteindre 9+)
- Plancher ~4-5/10 même pour cas vagues (devrait descendre à 1-2)
- Score compressé vers la moyenne → discrimination par rangs OK mais magnitudes fausses

### B MINIMAL
**Points forts** :
- 24× plus rapide
- Très discriminant binairement : nulle ou présent

**Points faibles** :
- Beaucoup de 0/10 sur les vrais experts car causal_density manque les phrasings
- Spearman 0.552 reste sous le seuil 0.60

### C MINIMAL + VERNACULAR
**Points forts** :
- 0/6 inversions sur les 6 adversariaux (best des 4)
- Détecte VRAI_TERRAIN_SANS_JARGON (5.8 au lieu de 1.9 dans B)

**Points faibles** :
- Spearman **0.517 PIRE que MINIMAL pur** !
- Pourquoi : vernacular détecte aussi le FOLKLORE et le récompense
  - C7_TERRAIN_FOLKLORE (expected 2.0) noté 1.2 par C (était 0 dans B) — récompense erronée
  - C1_TERRAIN_LACONIQUE (expected 7.5) noté 1.5 par C — vernacular ne suffit pas
- **Faux positifs sur folklore = nuit à la corrélation globale**

### D MINIMAL + PHYSICAL
**Points forts** :
- Réduit A4_CAUSALITE_INVERSEE (de 2.5 dans B à 2.0)
- Identique à MINIMAL ailleurs

**Points faibles** :
- Gain marginal global (+0.007)
- N'aide pas les cas où causal_density est nulle

---

## 4. Métriques inutiles vs essentielles

### Métriques discriminantes (apportent du gain)
- `causal_density` (V10) — base nécessaire
- `identity_gate` (V7) — bloque hallucinations identité
- `btp_operational_score` (V9.1) — discrimine niveaux d'expertise BTP
- `practical_usefulness` + `concrete_runtime_alignment` (V1) — détectent actions

### Métriques redondantes (overlap fort)
- `fragility_risk` ⊂ `systemic_coherence` ⊂ `useful_information_density` — toutes trois pénalisent la verbosité de manière chevauchante
- `goodhart_risk` ⊂ `seductive_complexity` — overlap sur jargon décoratif
- `cta_coverage` ⊂ `btp_operational_score` — CTAs sont sous-ensemble du BTP

### Métriques utiles individuellement mais nuisibles en agrégation
- `vernacular_wisdom` — utile pour vrais terrains MAIS récompense le folklore en
  l'absence de filtre (Pipeline C −0.035 vs B)

### Métriques marginalement utiles
- `physical_causality_validator` — utile en cas de causalité inversée caricaturale
  uniquement (peu présent dans dataset réel BTP)

---

## 5. Distribution des scores

```
              FULL    MIN    +VERN   +PHYS
expected 1-3  4.2     0.3    0.4     0.3   (devrait être 1-3)
expected 4-6  4.9     0.7    1.4     0.7   (devrait être 4-6)
expected 7-9  5.4     2.3    2.7     2.3   (devrait être 7-9)
expected 9+   5.9     2.7    2.6     2.7   (devrait être 9+)
```

**Lecture** : FULL compresse tout vers ~5/10. MINIMAL est plus discriminant
sur les bas-scores mais sous-évalue les hauts-scores.

→ **Aucun pipeline n'a la dynamique complète 1-10 attendue par l'humain.**

---

## 6. Inversions sur les 6 cas adversariaux

| Cas | Attendu rang | FULL | MIN | C | D |
|---|---|---|---|---|---|
| A1_EXPERT_COURT | #1 | #1 ✓ | #1 ✓ | #2 | #1 ✓ |
| A2_VRAI_TERRAIN | #2 | #4 | #5 | **#1** | #5 |
| A3_MESURES_INUTILES | #3 | #2 | #4 | #4 | #4 |
| A4_CAUSALITE_INVERSEE | #4 | #3 | #2 | #3 | #2 |
| A5_FAUX_EXPERT_LONG | #5 | #6 ✓ | #6 ✓ | #6 ✓ | #6 ✓ |
| A6_JARGON_DECORATIF | #6 | #5 | #6 ✓ | #5 | #6 ✓ |

**Observations** :
- Pipeline C VERNACULAR sauve seul VRAI_TERRAIN_SANS_JARGON (le promeut #1)
- Aucun pipeline ne place correctement CAUSALITE_INVERSEE bas (toujours #2-#3)

---

## 7. Conclusion

### Verdict empirique
**Gap FULL vs MINIMAL = +0.088 Spearman** = mesurable mais modeste.

### Trois options possibles
**Option 1 — EXTEND (verdict du gate)**
- Garder FULL comme système de référence
- Optimiser pondérations dans la suite V11+
- Accepter coût 24× pour gain 0.088

**Option 2 — REDUCE PRAGMATIQUE**
- Garder uniquement les 4-5 métriques empiriquement utiles
  (causal_density, identity_gate, btp_operational_score, practical_usefulness, concrete_runtime_alignment)
- Tester un Pipeline E "pragmatique" — non testé dans cette mission
- Hypothèse : Spearman intermédiaire ~0.60 avec latence ~1ms

**Option 3 — BLOCK + EXÉCUTER P0**
- Reconnaître que 0.639 < seuil 0.65 "calibré réel"
- Exécuter le protocole P0 avec BET réels avant tout autre travail
- Toute décision EXTEND/REDUCE prise sans BET = aveugle

---

## 8. Signature

- **mission_id** : `V11_DECISION_GATE_20260517` (P1)
- **n cas** : 30
- **best pipeline** : A FULL (Spearman 0.639)
- **gap FULL vs MINIMAL** : +0.088 Spearman
- **fichier données** : `audit/V11_DECISION_GATE_RESULTS.json`
- **verdict imposé par data** : EXTEND avec NUANCES
