# V11 DECISION — Verdict unique

**Mission** : `V11_DECISION_GATE_20260517`
**Date** : 2026-05-17

---

## ★ VERDICT : **EXTEND** *(avec nuances bloquantes)*

---

## 1. Verdict empirique

Sur 30 cas BTP variés × 4 pipelines :

| Pipeline | Spearman ρ | Gap vs MINIMAL | Verdict isolé |
|---|---|---|---|
| **A FULL** | **0.639** | +0.088 | au-dessus seuil 0.60 plausible |
| B MINIMAL | 0.552 | baseline | sous 0.60 |
| C +VERNACULAR | 0.517 | **−0.035 (NUIT)** | sous-performe MINIMAL |
| D +PHYSICAL | 0.559 | +0.007 | équivalent MINIMAL |

**Décision empirique** : **EXTEND** (FULL > MINIMAL de manière mesurable et stable).

---

## 2. Trois nuances qui modèrent EXTEND

### Nuance 1 — Seuil "calibré réel" pas atteint
Spearman 0.639 est **plausible** (≥ 0.60) mais **pas calibré réel** (< 0.65).
→ Aucune communication "ZORAN supérieur expertise" autorisée.

### Nuance 2 — VERNACULAR naïf NUIT
Pipeline C VERNACULAR fait −0.035 vs MINIMAL.
→ `vernacular_wisdom_engine` **NE DOIT PAS** être intégré tel quel dans le composite. Il sauve VRAI_TERRAIN mais récompense le folklore (CAS C7).
→ Avant intégration runtime : ajouter filtre anti-folklore.

### Nuance 3 — PHYSICAL marginal
Pipeline D apporte +0.007 → marginal mais positif.
→ `physical_causality_validator` peut être intégré comme filtre ponctuel (réduction score si causalité inversée détectée), pas comme composante principale.

---

## 3. Décisions opérationnelles imposées

### ✅ Maintenir architecture FULL comme référence runtime
- Spearman 0.639 prouve que la complexité apporte gain mesurable
- Pas de simplification radicale V12_REDUCTION
- PIPELINE_FULL devient le selector default (réversion de la décision V11 P1 précédente, justifiée par nouvelle mesure post-V10.1)

### ❌ NE PAS intégrer `vernacular_wisdom` en runtime maintenant
- Pipeline C empiriquement PIRE que MINIMAL
- À retravailler avec filtre anti-folklore avant ré-évaluation
- Reste disponible en debug/introspection

### ⚠ Intégrer `physical_causality_validator` UNIQUEMENT comme filtre
- Pas comme composante du composite (gain marginal)
- Mais en filtre post-hoc : si verdict = `PHYSICALLY_INCONSISTENT`, pénaliser le score final de 30%
- Active uniquement sur les cas adversariaux clairs

### 🚫 EXÉCUTER P0 avant tout V11+
- 5 cas P0-MINI prêts à transmettre (HUMAN_ALIGNMENT_REPORT.md)
- Coût ~200 €, 45 min BET réel
- BLOQUANT pour passer "calibré réel" (≥ 0.65)

---

## 4. Pourquoi PAS REDUCE / REBUILD / BLOCK

### Pourquoi pas REDUCE
- Gap 0.088 est mesurable, pas négligeable
- MINIMAL seul reste sous 0.60 (proxy faible)
- Réduire risque de perdre les +0.088 sans pouvoir les retrouver

### Pourquoi pas REBUILD
- 0.639 n'est pas catastrophique (sous seuil 0.40 BLOCK)
- Architecture FULL discrimine correctement sur les rangs (Kendall 0.453)
- Le problème est la **dynamique compressée** (1-10 → 4-7), pas la structure

### Pourquoi pas BLOCK_EXTENSION
- 0.639 ≥ 0.60 → "plausible", pas "non fiable"
- L'extension reste autorisée, mais ENCADRÉE par 3 conditions :
  1. Toute nouvelle métrique doit prouver +0.05 Spearman incrémentale
  2. Toute extension doit passer un test adversarial avant intégration
  3. P0 doit être exécuté dans les 60 jours sinon STOP

---

## 5. Roadmap V11+ autorisée (conditionnelle)

### Court terme (1-2 semaines)
1. **Transmettre les 5 cas P0-MINI à 1 BET réel** (~200 €, 45 min)
   - Si Spearman BET vs ZORAN ≥ 0.60 → autoriser V11.1
   - Si < 0.40 → STOP, revenir à V11_DECISION_GATE avec BET

2. **Affiner `vernacular_wisdom`** :
   - Ajouter filtre anti-folklore (sel, peinture Brico, remèdes de grand-mère)
   - Re-tester sur les 30 cas
   - Si nouveau Spearman > MINIMAL → intégration runtime

3. **Intégrer `physical_causality_validator` en filtre post-hoc** :
   - Pénalité 30% si `PHYSICALLY_INCONSISTENT`
   - Re-tester corrélation post-intégration

### Moyen terme (2-4 semaines)
4. **Exécuter P0 complet** (~12 k€, 30 rapports × 3 BET)
   - Bloquant pour transition "outil calibré"

### Long terme (post-P0)
5. **Si P0 ≥ 0.65** : passage en outil calibré, déploiement aide décision BET
6. **Si P0 0.40-0.65** : outil alerte qualité, pas verdict
7. **Si P0 < 0.40** : rebuild architecture avec hypothèses experts

---

## 6. Limites résiduelles V11 final

| ID | Limite | Sévérité | Fix prévu |
|---|---|---|---|
| LR-PROXY | Mes "expected_score" sont mes intuitions, pas BET réels | **CRITIQUE** | P0-MINI transmission |
| LR-COMPRESSION | Scores compressés 4-7 sur dynamique 1-10 | MOY | Recalibration post-P0 |
| LR-INVERSE | CAUSALITE_INVERSEE > VRAI_TERRAIN dans FULL | HAUTE | physical_causality filtre |
| LR-FOLKLORE | vernacular_wisdom récompense folklore | MOY | Filtre anti-folklore |
| LR-N5 | Seulement 5 cas P0-MINI préparés | MOY | Étendre si P0 réussit |
| LR-DOMAIN | Calibré sur BTP uniquement | STRUCT | Validation autres domaines |

---

## 7. Engagement de transparence

- Tous les résultats — y compris **VERNACULAR négatif** et **FULL sous-calibré** — sont publiés intégralement
- Pas de cherry-picking entre V11 P1 (verdict REDONDANTE) et V11_DECISION_GATE (verdict EXTEND) : les deux sont publiés, expliqués par évolution V10.1 entre les deux mesures
- Inversion critique CAS_INVERSE > VRAI_TERRAIN documentée

---

## 8. Signature

- **mission_id** : `V11_DECISION_GATE_20260517`
- **★ VERDICT** : **EXTEND avec NUANCES BLOQUANTES**
- **best Spearman** : 0.639 (FULL)
- **gap FULL vs MINIMAL** : +0.088
- **conditions extension** : 3 (incrémental +0.05 / test adversarial / P0 sous 60j)
- **non-décisions** : VERNACULAR nuit empiriquement, PHYSICAL marginal
- **bloquant absolu** : P0 transmission BET réel
- **fichiers livrés** : HUMAN_ALIGNMENT_REPORT.md, SUBTRACTION_EXPERIMENT_REPORT.md, V11_DECISION_GATE_RESULTS.json
