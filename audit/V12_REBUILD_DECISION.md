# V12 REBUILD DECISION — verdict empirique

**Mission** : `ZORAN_V12_ADVERSARIAL_SURVIVABILITY_20260517`
**Date** : 2026-05-17

---

## ★ VERDICT : **PAS DE REBUILD GLOBAL — V12 EN MODULE SPÉCIALISÉ**

---

## 1. Résultat empirique brutal

| Métrique | V11 FULL | V12 ADVERSARIAL MINIMAL |
|---|---|---|
| **Spearman global** | **0.646** | **0.204** |
| Lignes de code | 4000+ | 250 |
| Delta | baseline | **−0.442 (V11 meilleur)** |

→ **V12 minimal échoue largement sur la corrélation globale**.

---

## 2. Pourquoi V12 échoue globalement

Le moteur n'extrait pas assez de claims causaux explicites. Sur 30 textes :
- Seulement **4 cas** ont au moins 1 claim causal extrait (A1, A4, C2, D1)
- 26 cas → score par défaut 7.0 (claims=0 → physical=1.0 → composite=0.70)

Le pattern `CAUSAL_CLAIM_RX` (X cause/explique/provoque Y) est trop strict.
Les textes BTP réels utilisent souvent des constructions implicites :
- "RGA argile gonflante + corrosion par humidité capillaire" (juxtaposition causale)
- "Étape 1 : étaiement si fissure > 0.5mm/mois" (conditionnelle)
- "Suspicion RGA post-sécheresse 2022" (suspicion ≠ causation explicite)

Pour les cas SANS claim causal extrait, V12 ne peut **rien attaquer** → score baseline neutre.

---

## 3. Pourquoi V12 RÉUSSIT sur cas adversariaux causaux

Sur les cas où V12 extrait des claims (causalité explicite "X cause Y"), il
SURPERFORME V11 :

| Cas | Expected | V11 | V12 | V12 vs V11 |
|---|---|---|---|---|
| A4_CAUSALITE_INVERSEE | 2.5 | 5.8 ✗ | **4.7 ✓** | **V12 mieux** |
| C2_CAUSAL_INVERSEE_SUBTLE | 3.0 | 4.5 | **3.2 ✓** | **V12 mieux** |
| B7_FAUX_EXPERT_FUITE | 2.0 | 4.0 | 4.0 | égal |

V12 détecte 2 violations physiques sur A4, 2 sur C2 — exactement ce que V11
ne capturait pas (LR-2 résiduel V11).

→ V12 a **résolu LR-2 sur les cas où il s'active**.

---

## 4. Conclusion architecturale

**PAS de REBUILD global** : V12 minimal ne remplace pas V11.

**MAIS** : V12 doit être intégré comme **module spécialisé** filtre
causalité inversée, activé UNIQUEMENT quand des claims causaux explicites
sont extraits.

### Architecture proposée
```
Pipeline FULL V11
  ↓
Si extractClaims(text).causal_count >= 1
  ↓
Filtre V12 : si v12_score < 0.40 → pénalité finale 30%
```

→ V12 devient un **détecteur de claims causaux dangereux**, pas un système
de scoring complet.

---

## 5. Limites résiduelles V12

| ID | Limite | Sévérité |
|---|---|---|
| V12-LR-1 | Pattern CAUSAL_CLAIM_RX trop strict (manque causalité implicite) | HAUTE |
| V12-LR-2 | Score baseline 7.0 quand zéro claim → faux positif sur cas vagues | HAUTE |
| V12-LR-3 | Tribunal mode détecte instrumentation manquante mais pas qualité | MOY |
| V12-LR-4 | Pas de tests sur vrais rapports d'expertise judiciaire | HAUTE |

---

## 6. Décisions opérationnelles

### ✅ MAINTENIR V11 FULL comme selector global
V11 reste largement meilleur sur la corrélation globale (0.646 vs 0.204).

### ✅ INTÉGRER V12 comme filtre conditionnel
Activer V12 seulement si claims causaux extraits ≥ 1.
Pénalité finale -30% si v12_score < 0.40 sur ces cas.

### ❌ PAS de gel V11.x
Le verdict REBUILD ne s'applique pas. V11 démontre sa valeur globale.

### ⚠ ÉTENDRE V12 pattern extraction
V12.1 doit améliorer CAUSAL_CLAIM_RX pour capturer constructions
implicites (juxtapositions, conditionnelles, suspicions causales).

---

## 7. Engagement de transparence

**TOUS les résultats publiés**, y compris :
- Spearman V12 = 0.204 < V11 = 0.646 (V11 gagne globalement)
- V12 gagne sur 2 cas adversariaux ciblés (A4, C2)
- Default score 7.0 sur 26/30 cas = **bug architectural V12**
- Tribunal attacks 5 cas seulement = détection limitée

Pas de réinterprétation a posteriori. Le moteur V12 minimal **ne remplace pas
V11**. Il complète sur niche spécifique.

---

## 8. Engagement vs RÈGLE DE DÉCISION mission

> SI V12 minimal > FULL sur causalité inversée, faux expert, adversarial → REBUILD

| Critère mission | Résultat |
|---|---|
| Causalité inversée (A4, C2) | V12 ≥ V11 ✓ |
| Faux expert (A5, A6, B7) | V12 ≤ V11 ✗ |
| Adversarial terrain (autres) | V12 << V11 ✗ |

**1 critère sur 3** → pas de majorité, pas de REBUILD.

---

## 9. Signature

- **mission_id** : `ZORAN_V12_ADVERSARIAL_SURVIVABILITY_20260517`
- **verdict** : MODULE_SPÉCIALISÉ (pas rebuild)
- **Spearman V11 FULL** : 0.646
- **Spearman V12 MINIMAL** : 0.204
- **gain V12 sur causalité inversée** : oui (A4 5.8→4.7, C2 4.5→3.2)
- **dégradation V12 sur cas neutres** : oui (default score 7.0)
- **P0-MINI BET réel** : toujours bloquant pour claim "calibré réel"
- **fichiers livrés** : `app/src/adversarial_survivability_engine.js` (250 lignes), `tools/test_v12_adversarial.mjs`, `audit/V12_CLAIM_SURVIVAL_RESULTS.json`
