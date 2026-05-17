# ZORAN V11 REALITY CALIBRATION REPORT

**Mission** : `ZORAN_V11_REALITY_CALIBRATION_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`
**Date** : 2026-05-17

> **Verdict final** : *ZORAN reste un **prototype synthétique calibré sur lui-même**.*
> *La transformation en référence métier réelle nécessite la validation humaine externe (~12 k€, 6-8 semaines) qui n'a PAS été exécutée. Tous les autres travaux V11 (P1 à P4) sont des préparatoires.*

---

## 1. Statut des 5 priorités

| Priorité | Statut | Livrable |
|---|---|---|
| **P0** Validation humaine | 📋 **Protocole rédigé** — exécution externe requise | `audit/V11_HUMAN_CALIBRATION_PROTOCOL.md` |
| **P1** Test soustraction | ✅ **Exécuté** — verdict COMPLEXITÉ REDONDANTE | `audit/V11_SUBTRACTION_EXPERIMENT.md` |
| **P2** Vernacular wisdom | ✅ **Livré** — 5/5 tests canoniques | `app/src/vernacular_wisdom_engine.js` |
| **P3** Causalité physique | ✅ **Livré** — 4/5 tests + 1 limite docs | `app/src/physical_causality_validator.js` |
| **P4** BTP supremacy réel | ⏸ **Reporté** — bloqué par P0 | (post-validation humaine) |

---

## 2. P1 — Test de soustraction : RÉSULTAT CHOC

### Comparaison PIPELINE_FULL vs PIPELINE_MINIMAL sur 30 cas

| Métrique | FULL (11 composantes) | MINIMAL (2 composantes) |
|---|---|---|
| **Spearman ρ** | **0.543** | **0.543** |
| Kendall Tau | 0.372 | 0.368 |
| Latence | 3.20 ms/cas | 0.13 ms/cas |
| Coût ratio | **24.7×** plus cher | baseline |

### Verdict empirique

**Δ Spearman = −0.000** → FULL et MINIMAL strictement équivalents en pouvoir prédictif.

→ **COMPLEXITÉ REDONDANTE** confirmée.

### Patterns d'erreurs documentés

**FULL surévalue les mauvaises réponses** (plancher artificiel ~5/10) :
- JARGON_DECORATIF noté 5.9 au lieu de 1.5 (+4.4)
- AVIS_COMMERCIAL noté 5.1 au lieu de 2.0 (+3.1)

**FULL sous-évalue les bonnes réponses** (plafond artificiel ~6/10) :
- C5_LONG_VRAI_COMPLET noté 5.8 au lieu de 9.5 (-3.7)
- C6_SHORT_EXPERT_DENSE noté 4.8 au lieu de 9.0 (-4.2)

→ Goodhart de second ordre : la pondération moyenne 11 métriques produit un score **compressé vers la moyenne**, incapable de classer les extrêmes.

### Conséquence opérationnelle imposée

PIPELINE_MINIMAL devient le sélecteur par défaut (équivalent en qualité, 24× moins cher). PIPELINE_FULL conservé en debug/introspection uniquement.

---

## 3. P2 — Vernacular Wisdom Engine

### Approche
**Interdiction respectée** : pas de regex vocabulaire technique, pas de densité lexicale.

**Méthode pragmatique** : détection de 7 patterns comportementaux d'expertise terrain :
1. Impératifs praticien (pose, prends, gratte, vérifie...)
2. Diagnostic probabiliste (probablement, ça ressemble à...)
3. Élimination conditionnelle (si X alors Y, sinon Z)
4. Mesures low-tech valides (témoin papier, photo datée)
5. Marqueurs d'expérience (j'ai vu, c'est classique)
6. Causalité physique simple (l'humidité remonte, le mur travaille)
7. Pathologies implicites (ça boit, ça suinte, ça travaille)

### Résultats canoniques (5/5 pass)

| Cas | Score | Verdict | OK |
|---|---|---|---|
| VRAI_TERRAIN_PRATICIEN | 0.742 | vernacular_expert | ✓ |
| EXPERT_FORMEL_JARGON | 0.000 | no_vernacular_signal | ✓ |
| PRATICIEN_TOITURE | 0.250 | practician | ✓ |
| FAUX_EXPERT_JARGON_VIDE | 0.000 | no_vernacular_signal | ✓ |
| PRATICIEN_LACONIQUE | 0.208 | practician | ✓ |

**Impact** : LR-1 (vrai praticien sans jargon) maintenant détectable.
Le score = 0 pour faux experts verbeux, et > 0.20 pour vrais terrain.

### Limites documentées
- Détection limitée à FR
- Pas d'embeddings (non disponibles offline)
- Liste de patterns fixe (pas d'apprentissage)
- Texte trop court < 30 mots = score 0 par défaut

---

## 4. P3 — Physical Causality Validator

### Approche
Graphe de causalités plausibles encodé en règles physiques BTP :
- 13 effets → ensembles de causes plausibles
- 7 incompatibilités d'échelle spatiale interdites
- Détection :
  - Inversions causales (effet → cause au lieu de cause → effet)
  - Échelles incompatibles (condensation → tassement)
  - Causalités absentes du graphe (douteuses)

### Résultats canoniques (4/5 pass)

| Cas | Verdict | OK |
|---|---|---|
| CAUSALITE_CORRECTE | PHYSICALLY_PLAUSIBLE | ✓ |
| CAUSALITE_INVERSEE_BTP | flagué unverified (low sev) | ⚠ partiel |
| SCALE_INCOMPATIBLE | PHYSICALLY_INCONSISTENT | ✓ |
| CAUSALITE_PLAUSIBLE_MULTI | PHYSICALLY_PLAUSIBLE | ✓ |
| CAUSALITE_INVERSEE_SUBTLE | PHYSICALLY_INCONSISTENT | ✓ |

### Limite résiduelle LR-2.5
Pour les inversions BTP subtiles ("fissures causent humidité"), le système flag comme `unverified_causality` (low severity) au lieu de `causal_inversion` (high severity). Raison : le mapping concept→graphe ne capture pas toutes les nuances (humidite vs humidite_externe).

**Score 0.8 reste discriminant** mais pas tranché. Améliorations V12 possibles avec enrichissement du graphe.

### Impact
LR-2 originel (causalité syntaxique mais sens faux) partiellement adressé :
- Inversions caricaturales (condensation → tassement) : détectées
- Inversions subtiles intra-domaine : flaguées avec sévérité moindre

---

## 5. P4 — BTP Supremacy réel : REPORTÉ

### Raison du report
Toute exigence supplémentaire (CAUSE_MAP obligatoire, temporalité obligatoire, instrumentation obligatoire) consisterait à **ajouter des contraintes prescriptives** au système.

Or P1 a démontré que l'ajout de contraintes (V1-V10) n'améliore PAS la corrélation à l'expertise humaine. Sans validation humaine externe (P0 non exécuté), toute nouvelle exigence relève du **Goodhart de troisième ordre** : on optimiserait sur "ce que le système doit produire selon nos intuitions" sans savoir si ces exigences corrèlent avec la qualité réelle.

### Position de principe respectée
> *"Aucune nouvelle métrique ne doit être ajoutée avant validation humaine, test de soustraction, audit Goodhart de second ordre."*

P1 est fait, P0 et P2/P3 sont fait, P4 attend P0.

---

## 6. Architecture cumulative actuelle (V1→V11)

```
INPUT
↓
V7 IDENTITY_GATE        → ambiguïté ? clarification (no LLM)
↓
V6 COMPLEXITY_GATING    → simple ? fast-path baseline
↓
LLM CALLS
↓
PIPELINE_FULL (debug):
  V1-V5 : jargon, terrain, completion, fragility, seductive
  V3    : systemic_coherence, anti_goodhart
  V4    : fragility, domain_leak
  V5    : adversarial_OOD checks
  V8    : meta_metric_auditor, frame_refutation, validation_status
  V9    : btp_supremacy + CTA engine
  V10   : causal_density + verbosity_penalty
  V11.P2: vernacular_wisdom_engine            ← NEW
  V11.P3: physical_causality_validator        ← NEW
↓
PIPELINE_MINIMAL (default selector V11+) :
  V7 + V10.causal_density
↓
JUDGE
```

### Décision V11 architecturale
- **Default selector** : PIPELINE_MINIMAL (cost-efficient, équivalent en qualité)
- **PIPELINE_FULL** : conservé pour introspection diagnostique
- **V11 P2/P3** : disponibles mais NON intégrés dans le composite tant que P0 non exécuté

---

## 7. Verdict final ZORAN V11

### Niveau actuel : **PROTOTYPE SYNTHÉTIQUE**

| Critère | Statut |
|---|---|
| Cohérence interne | ✅ Forte (test_*.mjs tous au vert) |
| Adversarialité interne | ✅ Robuste (76/76 cas adversariaux passés) |
| Validation humaine externe | ❌ **Non exécutée** (P0 protocole prêt, ~12 k€) |
| Corrélation à expertise réelle | ⏳ **Inconnue** (synthétique = 0.543, sous seuil 0.65) |
| Utilisable comme aide décision | ❌ **Non** tant que P0 non validé |

### Décision honnête
ZORAN V11 reste un **prototype académique sophistiqué**, pas un **outil métier validé**.

Le passage à "outil calibré" ou "référence métier réelle" nécessite **uniquement** l'exécution du protocole P0 avec 3 BET seniors réels sur 30 rapports anonymisés.

**Sans cette étape, toute nouvelle métrique est du Goodhart cumulatif.**

---

## 8. Limites résiduelles (anti-religion V5)

| ID | Limite | Impact | Fix prévu |
|---|---|---|---|
| LR-1 | Vrai praticien sans jargon | RÉDUITE (P2 vernacular_wisdom) | calibration humaine |
| LR-2 | Causalité syntaxique mais sens faux | RÉDUITE (P3 physical_causality) | LR-2.5 résiduelle |
| LR-2.5 | Inversions BTP subtiles flaggées low-severity | docs P3 | enrichissement graphe V12 |
| LR-3 | Corrélation humaine 0.543 < 0.65 seuil | bloquant | P0 exécution |
| LR-4 | Pondération composite plafonne à ~6/10 | systémique | refonte composite V12+ |
| LR-5 | Pas de données réelles, tout synthétique | **structurel** | P0 obligatoire |

---

## 9. Roadmap conditionnelle

### Si P0 exécuté et Spearman ≥ 0.65
→ ZORAN devient **outil calibré**
→ Déploiement aide décision BET autorisé
→ V12 = refinement des composantes les plus prédictives

### Si P0 exécuté et Spearman 0.40-0.65
→ ZORAN devient **outil alerte qualité** (pas verdict)
→ V12 = ré-architecture du composite

### Si P0 exécuté et Spearman < 0.40
→ ZORAN reste prototype académique
→ V12 = retour planche à dessin avec hypothèses experts
→ Publication intégrale des résultats négatifs

### Si P0 jamais exécuté
→ ZORAN **reste prototype indéfiniment**
→ Pas d'usage métier
→ Toute nouvelle "amélioration" est suspecte de Goodhart cumulatif

---

## 10. Signature

- **mission_id** : `ZORAN_V11_REALITY_CALIBRATION_20260517`
- **statut global** : PROTOTYPE — calibration humaine en attente
- **livrables exécutés** : P1 (verdict), P2 (vernacular), P3 (physical)
- **livrables documentés non exécutés** : P0 (protocole humain)
- **livrables reportés** : P4 (BTP supremacy)
- **principe directeur** : break-first + anti-religion
- **engagement transparence** : tous résultats publiés (succès comme échecs)

---

## 11. Fichiers livrés V11

```
audit/V11_HUMAN_CALIBRATION_PROTOCOL.md         [P0 protocole]
audit/V11_SUBTRACTION_EXPERIMENT.md             [P1 verdict]
audit/V11_SUBTRACTION_EXPERIMENT_RESULTS.json   [P1 données]
audit/ZORAN_V11_REALITY_CALIBRATION_REPORT.md   [ce document]

app/src/vernacular_wisdom_engine.js             [P2 livrable]
app/src/physical_causality_validator.js         [P3 livrable]

tools/v11_subtraction_experiment.mjs            [P1 runner]
tools/test_v11_p2_p3.mjs                        [P2+P3 tests]
```

---

## 12. Engagement final

Aucun nouveau détecteur, aucune nouvelle métrique, aucune nouvelle complexité
ne sera ajoutée à ZORAN tant que P0 (validation humaine 3 BET × 30 rapports)
n'est pas exécutée.

Le passage à V12 est **conditionnel** au résultat P0.

> *Un système qui s'auto-valide à l'infini est un système religieux.*
> *Un système qui attend la validation externe avant de s'enrichir est un système empirique.*
