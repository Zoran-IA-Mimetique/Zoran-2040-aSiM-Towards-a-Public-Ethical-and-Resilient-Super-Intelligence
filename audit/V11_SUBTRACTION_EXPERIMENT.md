# V11 SUBTRACTION EXPERIMENT — Verdict

**Mission** : `ZORAN_V11_REALITY_CALIBRATION_20260517` (P1)
**Verdict** : **COMPLEXITÉ REDONDANTE — GOODHART DE SECOND ORDRE CONFIRMÉ**

---

## 1. Méthode

### Pipelines comparés

**PIPELINE_FULL** (11 composantes V1-V10) :
- `btpOperationalScore` (poids 0.20)
- `runFragilityDetector` (poids 0.10)
- `systemicCoherenceReport` (poids 0.10)
- `runAntiGoodhart` (poids 0.10)
- `seductiveComplexity` (poids 0.05)
- `usefulInformationDensityV2` (poids 0.05)
- `detectCTAPresence` (poids 0.05)
- `practicalUsefulness` (poids 0.10)
- `concreteRuntimeAlignment` (poids 0.10)
- `jargonDensity` (poids 0.05)
- `terrainAlignment` (poids 0.10)
- + `identityGate` (filter)

**PIPELINE_MINIMAL** (2 composantes V7+V10) :
- `identityGate` (filter)
- `causalDensityScore`

### Dataset
**30 cas** construits avec score humain attendu [0..10] :
- 6 cas adversariaux (groupe A)
- 8 cas expertise réelle variée (groupe B)
- 8 cas limites structurelles (groupe C)
- 8 cas couplages + RGA + décennale (groupe D)

---

## 2. Résultats

| Métrique | FULL | MINIMAL | Delta |
|---|---|---|---|
| **Spearman ρ** | **0.543** | **0.543** | **−0.000** |
| Kendall Tau | 0.372 | 0.368 | +0.004 |
| Latence moyenne | 3.20 ms | 0.13 ms | 24.7× |
| Composantes | 11 | 2 | 5.5× |

### Verdict statistique
**Δ Spearman = −0.000** → FULL et MINIMAL sont **strictement équivalents** en pouvoir prédictif.

FULL coûte **24.7× plus de calcul** pour **zéro gain** de corrélation.

### Seuil de calibration externe (protocole V11)
- Cible : Spearman ≥ 0.65 = "calibré réel"
- Obtenu : 0.543 sur les 2 pipelines
- **Aucun des 2 pipelines n'atteint le seuil**.

→ **ZORAN reste un prototype**, pas une référence métier.

---

## 3. Patterns d'erreurs

### Surévaluation FULL des mauvaises réponses
FULL donne 5-6/10 à des réponses qui devraient être 1.5-2.5/10 :

| Cas | Attendu | FULL | Drift |
|---|---|---|---|
| A6_JARGON_DECORATIF | 1.5 | 5.9 | +4.4 |
| D4_GENERIQUE_COUPLAGE | 2.0 | 5.3 | +3.3 |
| D6_LEGAL_FLOU | 2.5 | 5.7 | +3.2 |
| D8_AVIS_COMMERCIAL | 2.0 | 5.1 | +3.1 |
| B4_GENERIQUE_VIDE | 1.5 | 4.5 | +3.0 |

→ **Plancher artificiel** : les composantes V1-V5 (jargon, terrain,
practical_usefulness) donnent ~5/10 par défaut. Le système n'arrive pas
à descendre en dessous.

### Sous-évaluation FULL des bonnes réponses
FULL donne 5-6/10 à des réponses qui devraient être 8.5-9.5/10 :

| Cas | Attendu | FULL | Drift |
|---|---|---|---|
| C5_LONG_VRAI_COMPLET | 9.5 | 5.8 | −3.7 |
| C6_SHORT_EXPERT_DENSE | 9.0 | 4.8 | −4.2 |
| B2_TERRAIN_PRAGMATIQUE | 8.5 | 5.0 | −3.5 |
| B6_PRATICIEN_TOITURE | 8.5 | 4.8 | −3.7 |

→ **Plafond artificiel** : aucune composante ne donne > 7/10 même sur
les meilleures réponses. La distribution est compressée vers la moyenne.

### MINIMAL : binaire mais sans biais directionnel
MINIMAL donne 0 à beaucoup de cas (langage non causal) mais 2.5-4.3 aux
vraies expertises. Plus discriminant qualitativement, moins continu.

---

## 4. Diagnostic du Goodhart de second ordre

### Ce qui se passe vraiment
Chaque métrique V1-V10 a été conçue pour détecter UN biais spécifique.
Mais l'agrégation pondérée **moyenne les signaux** : un texte vide
récupère des "demi-points" partout (terrain 0.5 par défaut, robustesse OOD
0.5 par défaut, etc.) qui s'additionnent à ~5/10.

Inversement, un texte excellent atteint rarement 1.0 sur toutes les
dimensions simultanément, donc le composite plafonne à ~6-7/10.

### Le piège architectural
On a optimisé chaque métrique séparément contre ses biais → on a créé
un système **incapable de classer les réponses extrêmes**.

C'est exactement le pattern Goodhart : optimiser sur 11 proxies de qualité
finit par produire un score qui n'est plus aligné avec la qualité réelle.

### Pourquoi MINIMAL n'est pas meilleur non plus
MINIMAL souffre du problème inverse : `causal_density` étant binaire-ish,
beaucoup de bonnes réponses (langage praticien) tombent à 0. Mauvaise
sensibilité.

**Aucun des 2 pipelines ne capture la qualité réelle**.

---

## 5. Conclusions opérationnelles

### CONFIRMÉ
- L'empilement V1-V10 ne sert **pas** la corrélation à l'expertise humaine (par construction)
- FULL ne fait **pas mieux** que MINIMAL malgré 24× plus de calcul
- Aucun des 2 pipelines n'atteint le seuil de "calibré réel" (0.65)

### IMPLIQUE
- **STOP ajout de métriques** sans validation humaine externe (protocole V11 P0)
- La complexité actuelle est **redondante**, pas nuisible mais inutile
- L'architecture nécessite repensée — pas plus de couches, mieux d'évaluation

### NE CONFIRME PAS
- Que MINIMAL soit la bonne réponse (Spearman 0.543 reste sous le seuil)
- Que les métriques V1-V10 soient inutiles dans l'absolu (peut-être utiles individuellement, juste pas en agrégation pondérée)
- Que le problème vienne du choix des 11 métriques (peut être de la pondération, ou du moyennage)

---

## 6. Décisions imposées par ce résultat

### Décision 1 — Arrêt de l'empilement
Aucune métrique V11+ ne sera ajoutée tant que la calibration humaine
réelle (protocole V11 P0) n'a pas tourné sur 30 rapports + 3 BET.

### Décision 2 — Choix par défaut runtime
Tant que la validation n'a pas eu lieu, le système doit utiliser le pipeline
le **moins cher** à corrélation équivalente → **PIPELINE_MINIMAL**.

Le pipeline FULL est conservé pour debug / diagnostic / introspection,
pas comme winner sélecteur.

### Décision 3 — V11 P2 (vernacular) et P3 (causalité physique) restent autorisés
Parce qu'ils visent à corriger des limites résiduelles spécifiques
(LR-1, LR-2) qui pourraient remonter MINIMAL au-dessus de 0.65.

Mais avec la même règle : **break-first**, mesurer avant d'ajouter.

---

## 7. Signature

- **mission_id** : `V11_SUBTRACTION_EXPERIMENT_20260517`
- **n_cases** : 30
- **verdict** : COMPLEXITÉ REDONDANTE
- **delta_spearman** : −0.000
- **cost_ratio** : 24.7×
- **principe respecté** : V5 falsifiability (résultat suspect-si-trop-bon, ici résultat HONNÊTEMENT MAUVAIS)
- **fichier données** : `audit/V11_SUBTRACTION_EXPERIMENT_RESULTS.json`
