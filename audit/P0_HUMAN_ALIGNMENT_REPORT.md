# P0 HUMAN ALIGNMENT REPORT — Template

**Mission** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
**Statut** : ⚠ **EN ATTENTE — ce document sera mis à jour automatiquement par `tools/p0_compute_correlation.mjs` une fois les annotations BET reçues.**

---

## 1. État actuel

| Item | Statut |
|---|---|
| 5 cas adversariaux préparés | ✅ `audit/benchmark_real_world_p0.json` |
| Formulaire annotation prêt | ✅ 8 champs par cas |
| Calculateur Spearman prêt | ✅ `tools/p0_compute_correlation.mjs` |
| BET identifié | ❌ **À faire par utilisateur** |
| Transmission aveugle | ❌ **À faire par utilisateur** |
| Annotations reçues | ❌ **En attente** |
| Calcul Spearman | ❌ **Sera auto** |
| Verdict publié | ❌ **Engagement intégral** |

---

## 2. Section RANKING (à remplir post-annotation)

| Cas | BET ranking | BET note /10 | ZORAN expected | V11_FULL | V12 |
|---|---|---|---|---|---|
| CASE_1 EXPERT_COURT | _à remplir_ | _à remplir_ | 9.0 | 6.6 | 10.0 |
| CASE_2 VRAI_TERRAIN | _à remplir_ | _à remplir_ | 8.0 | 5.3 | 7.0 |
| CASE_3 CAUSALITE_INVERSEE | _à remplir_ | _à remplir_ | 2.5 | 5.8 | 4.7 |
| CASE_4 FAUX_EXPERT_LONG | _à remplir_ | _à remplir_ | 2.0 | 4.0 | 7.0 |
| CASE_5 EXPERT_SYSTEMIQUE | _à remplir_ | _à remplir_ | 9.5 | 6.0 | 10.0 |

---

## 3. Corrélations (à calculer post-annotation)

| Métrique | Valeur | Seuil cible |
|---|---|---|
| Spearman BET ↔ ZORAN_EXPECTED | _à calculer_ | ≥ 0.60 |
| Spearman BET ↔ V11_FULL | _à calculer_ | ≥ 0.60 |
| Spearman BET ↔ V12_ADVERSARIAL | _à calculer_ | bonus |
| Kendall Tau | _à calculer_ | ≥ 0.50 |

---

## 4. Divergences critiques (à analyser post-annotation)

Pour chaque cas où |BET_note − ZORAN_expected| ≥ 3 :
- Quel signal BET a-t-il capté que ZORAN a manqué ?
- Quel biais ZORAN cela révèle-t-il ?

Format réservé :
```
CASE_X : BET=A.A / ZORAN=B.B / Δ=C.C
  Justification BET : "..."
  Hypothèse de biais ZORAN : ...
```

---

## 5. Verdict final (à appliquer post-calcul)

Selon `primary_spearman_used_for_verdict` (= Spearman BET vs V11_FULL) :

| Score | Verdict | Conséquence |
|---|---|---|
| ≥ 0.60 | `ARCHITECTURE_V11_VALIDATED_PROVISIONALLY` | V13 autorisé avec P0 étendu (30 cas / 3 BET) |
| 0.40-0.59 | `PARTIALLY_VALID_STRONG_INTERNAL_BIAS` | Recalibration obligatoire avant V13 |
| < 0.40 | `STOP_V13_REBUILD_METHODOLOGICAL` | Architecture invalidée, retour planche à dessin |

---

## 6. Engagement de transparence

Je m'engage à :
- Publier les annotations BET **intégralement** (anonymisées)
- Publier le verdict **même négatif** sans rationalisation
- Documenter chaque divergence **précisément**
- Ne pas exclure de cas a posteriori
- Ne pas ajuster les seuils
- Ne pas réinterpréter les métriques

Si Spearman < 0.40 : V11/V12 sont publiquement invalidés et retour à phase 0.

---

## 7. Signature

- **mission_id** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
- **statut** : TEMPLATE — en attente exécution humaine
- **calculateur** : `tools/p0_compute_correlation.mjs`
- **benchmark** : `audit/benchmark_real_world_p0.json`
