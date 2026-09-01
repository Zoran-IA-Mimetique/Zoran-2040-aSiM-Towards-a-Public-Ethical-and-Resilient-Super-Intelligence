# P0-MINI BET PROTOCOL — Kit d'exécution

**Mission** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
**Statut** : **EN ATTENTE D'EXÉCUTION HUMAINE**

---

## ⚠ HONNÊTETÉ FONDATRICE

**Je (Claude Code agent) NE PEUX PAS exécuter cette mission moi-même.**

Cette mission requiert :
- 1 BET senior réel (humain, indépendant de moi)
- Transmission des 5 cas en aveugle
- Annotation manuelle (~45 min)
- Coût estimé ~200 €

**Mon rôle** : préparer le kit d'exécution complet, prêt à être déclenché par toi (humain).
**Ton rôle** : transmettre, recevoir les annotations, lancer le calculateur Spearman.

Aucun de ces 5 fichiers ne contient un faux résultat. Tous les champs "annotation" sont à `null` jusqu'à exécution réelle.

---

## 1. Préparation (côté ZORAN — FAIT)

| Livrable | Statut |
|---|---|
| `audit/benchmark_real_world_p0.json` | ✅ 5 cas + formulaire annotation prêts |
| `audit/P0_MINI_BET_PROTOCOL.md` | ✅ ce document |
| `audit/P0_HUMAN_ALIGNMENT_REPORT.md` | ✅ template (résultats à remplir) |
| `audit/P0_FAILURE_CASES.md` | ✅ template analyse divergences |
| `audit/P0_ARCHITECTURE_DECISION.md` | ✅ arbre de décision pré-rédigé |
| `tools/p0_compute_correlation.mjs` | ✅ calculateur Spearman + verdict auto |

---

## 2. Exécution requise (côté humain — À FAIRE)

### Étape 1 — Identifier le BET (1-3 jours)
Caractéristiques requises :
- **≥ 10 ans d'expérience** BTP
- Spécialité structure/pathologies bâtiment
- **AUCUN lien** avec le projet ZORAN
- **AUCUN accès** aux scores attendus ni aux verdicts ZORAN

Pistes :
- Réseau personnel (sans dire "test IA")
- Annonces type Malt, Codeur.com (catégorie expertise BTP)
- Ancien collègue de promo / vétéran connaissance
- Coût marché : 150-300 € pour 45 min

### Étape 2 — Transmission aveugle (5 min)
1. Ouvrir `audit/benchmark_real_world_p0.json`
2. **Copier UNIQUEMENT la section** `transmission_to_bet`
3. **Supprimer** tous les champs commençant par `_zoran_` (labels, expected_scores)
4. Transmettre au BET sous forme :
   - PDF ou email
   - Avec consigne : *"Annotez ces 5 réponses BTP indépendamment, sans connaître leur origine. Voir formulaire ci-joint."*

### Étape 3 — Réception annotations (~45 min BET)
Le BET retourne un JSON ou un document avec les 8 champs par cas :
- `ranking_quality` (1-5)
- `note_globale_expertise` (0-10)
- `justification_qualitative` (texte)
- `erreurs_critiques_detectees` (liste)
- `perception_terrain_credible` (enum)
- `confiance_expert` (0-1)
- `note_opposabilite_judiciaire` (0-10)
- `note_actionnabilite_MOA_MOE` (0-10)

### Étape 4 — Calcul automatique (1 min)
1. Coller les annotations dans `audit/benchmark_real_world_p0.json` section `results_template_to_fill_after_annotation`
2. Lancer :
   ```bash
   node tools/p0_compute_correlation.mjs
   ```
3. Le script produit automatiquement :
   - `audit/P0_MINI_RESULTS.json` (Spearman + Kendall + verdict)
   - Mise à jour de `audit/P0_HUMAN_ALIGNMENT_REPORT.md`
   - `audit/P0_ARCHITECTURE_DECISION.md` (décision EXTEND / PARTIAL / STOP)

### Étape 5 — Publication (5 min)
- Commit + push intégral, **même si résultat négatif**
- Si Spearman < 0.40 → publier `audit/P0_FAILURE_CASES.md` détaillé
- Pas de cherry-picking, pas de réinterprétation a posteriori

---

## 3. Anti-biais protocole

### Anti-biais ordre
- Présenter les 5 cas en **ordre randomisé** (pas A1→A5)
- Pas de label "EXPERT" / "FAUX_EXPERT" visible

### Anti-biais ancrage
- **Aucun score ZORAN** transmis au BET
- **Aucun "verdict pré-affiché"**
- Le BET ne sait pas qu'un système IA existe

### Anti-biais sponsoring
- Pas de présentation "ZORAN est un système d'expertise BTP" qui orienterait positivement
- Présentation neutre : *"recherche universitaire sur la qualité d'analyse BTP"*

### Anti-biais cherry-picking
- **Engagement écrit** dans ce document : tous les résultats seront publiés, même négatifs
- Pas de "le BET s'est trompé" comme excuse post-hoc

---

## 4. Règle de décision finale

Calculée automatiquement par `tools/p0_compute_correlation.mjs` :

```
Spearman ZORAN vs BET sur 5 cas :

  ≥ 0.60         → V11 architecture validée provisoirement
                   Roadmap V13 autorisée avec extension P0 (30 cas, 3 BET)

  0.40 ≤ X < 0.60 → V11 partiellement valide
                   Forte dépendance biais internes
                   Recalibration obligatoire avant V13

  < 0.40         → STOP roadmap V13+
                   REBUILD méthodologique
                   Ground truth synthétique invalidé
                   Retour planche à dessin
```

---

## 5. Engagement de non-rationalisation

Si Spearman < 0.40, je m'engage à publier intégralement et SANS rationalisation :
- Quels cas ont le plus divergé
- Pourquoi (selon le BET)
- Quelles métriques V1-V12 étaient les plus mal corrélées
- Quelles parties de la stack doivent être abandonnées

**Aucune des phrases suivantes ne sera utilisée** :
- ❌ "Le BET ne comprenait pas le test"
- ❌ "L'échantillon est trop petit"
- ❌ "Avec 30 BET au lieu de 1, ce serait différent"
- ❌ "Le synthétique reste utile en interne"

Si N=1 BET donne Spearman 0.20, alors **N=1 BET donne Spearman 0.20** et c'est un signal architectural.

---

## 6. Limites explicites du protocole

| Limite | Sévérité |
|---|---|
| N=5 cas trop faible pour significativité statistique forte | HAUTE |
| N=1 BET (pas de variance inter-experts) | HAUTE |
| Sélection BET par moi/utilisateur introduit biais | MOY |
| Coût/temps limite l'extension à N=30 / 3 BET | MOY |
| Cas adversariaux construits par moi → biais ground truth | HAUTE |

P0-MINI est **insuffisant** pour conclure à "ZORAN calibré". Il est **suffisant** pour conclure à "ZORAN invalidé" si Spearman < 0.40. C'est une mesure unidirectionnelle.

---

## 7. Coût/délai estimés

| Poste | Estimation |
|---|---|
| Recherche BET | 2-4h utilisateur |
| Honoraires BET | 150-300 € |
| Annotation | 45 min |
| Calcul Spearman | 1 min |
| Publication résultats | 10 min |
| **Total** | **~3-5 heures + 200 €** |

---

## 8. Signature

- **mission_id** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
- **statut** : KIT PRÊT — EXÉCUTION REQUISE PAR L'HUMAIN
- **moi (Claude Code)** : aucun moyen d'exécuter, kit préparé
- **toi (utilisateur)** : décisionnaire transmission + paiement BET
- **bloquant pour** : V13, V14, toute extension architecturale
- **engagement** : publication intégrale, anti-rationalisation
