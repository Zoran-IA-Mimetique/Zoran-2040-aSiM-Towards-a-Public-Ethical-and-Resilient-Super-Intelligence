# V11 HUMAN CALIBRATION PROTOCOL — Validation BET seniors

**Mission** : `ZORAN_V11_REALITY_CALIBRATION_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`
**Statut** : protocole proposé — exécution requiert moyens externes (3 BET réels)

> Principe directeur V11 :
> *"Le verrou n'est plus algorithmique. Il devient validation humaine,
> données terrain, causalité physique réelle."*
>
> Tant que ce protocole n'a pas tourné avec 3 experts réels, ZORAN
> reste un **prototype synthétique calibré sur lui-même**, pas une
> référence métier.

---

## 1. Dataset minimal requis

### Composition
- **30 rapports d'expertise judiciaire BTP** réels et anonymisés
- Diversité obligatoire :
  - **10** pathologies structurelles (fissures, tassement, contreventement)
  - **8** pathologies humidité/thermique (RGA, infiltration, condensation)
  - **6** pathologies couplées multi-cause
  - **6** cas adversariaux (faux experts, vernacular wisdom, causalité douteuse)
- Niveau de gravité : 10 mineurs / 10 moyens / 10 graves (décennale)
- Période : 2018-2025 (post-Loi Élan G1/G2)

### Format anonymisation
- Suppression nom maître d'ouvrage, adresse précise, BET signataire
- Conservation : type d'ouvrage, époque, pathologies, mesures, conclusions
- Hash identifiant : `BTP_EX_{YYYYMMDD}_{NNN}` (irréversible)

### Schema JSON cible
```json
{
  "id": "BTP_EX_20240315_007",
  "category": "RGA_structural",
  "gravity": "decennale",
  "ouvrage": "maison_individuelle_1990",
  "report_text_anonymized": "...",
  "ground_truth_diagnostic": "...",
  "ground_truth_actions": [...],
  "ground_truth_instrumentation": [...]
}
```

---

## 2. Panel experts

### Composition
- **3 BET seniors indépendants** (≥ 15 ans d'expérience)
- Spécialités complémentaires :
  - 1 structure / fondations
  - 1 pathologie bâtiment / humidité
  - 1 expertise judiciaire / décennale
- Pas de lien commercial avec ZORAN ni entre eux
- Rémunération forfaitaire (anti-biais : pas de % qualité)

### Indépendance
- Annotation **strictement aveugle** (pas accès aux scores ZORAN, ni aux annotations des 2 autres experts)
- Plateforme isolée (formulaire indépendant par expert)
- Délai 1 heure max par cas

---

## 3. Tâches d'annotation

Pour chaque rapport, l'expert doit fournir :

### A. Note globale d'expertise [0..10]
*"À quel niveau d'expertise cette analyse correspond-elle ?"*
- 0-2 : étudiant / non-expert
- 3-4 : technicien junior
- 5-6 : ingénieur compétent
- 7-8 : BET senior
- 9-10 : expert judiciaire / référence

### B. Ranking comparatif
Présenter **3 réponses** au même cas, demander de les classer.
(Réponses générées par ZORAN sur 3 niveaux différents.)

### C. Détection de défauts
Cocher défauts détectés :
- ☐ Cause unique imposée trop tôt
- ☐ Mesures non-discriminantes
- ☐ Jargon sans contenu
- ☐ Causalité physiquement impossible
- ☐ Pas de hiérarchie temporelle
- ☐ Pas de contre-hypothèse
- ☐ Pas d'instrumentation concrète

### D. Verbatim
Champ libre : *"Qu'est-ce qui distingue un VRAI rapport BET d'une analyse plausible mais fausse ?"*

---

## 4. Métriques de corrélation

### Inter-experts (cohérence du panel)
- Kendall Tau entre paires d'experts sur le ranking comparatif
- Variance de la note globale par cas
- Si variance moyenne > 2.5 sur 10 → **panel non cohérent**, ré-annoter
- Si Kendall Tau moyen < 0.40 entre experts → **désaccord trop fort**, retoucher rubrique

### ZORAN vs panel humain
Pour chaque pipeline ZORAN (FULL / MINIMAL / autre) :
- **Spearman ρ** entre ranking ZORAN et ranking humain moyen
- **Kendall Tau** idem
- **Agreement rate** top-3 vs bottom-3
- **Confusion matrix** sur les défauts détectés (ZORAN vs experts)

### Seuils décisionnels

| Spearman ρ | Verdict |
|---|---|
| **≥ 0.65** | **Calibré réel** — ZORAN peut être utilisé comme aide décision |
| 0.40 — 0.65 | Partiellement calibré — utilisable comme alerte, pas comme verdict |
| < 0.40 | **Proxy interne uniquement** — pas de valeur métier prouvée |

---

## 5. Gestion désaccords experts

### Cas 1 : désaccord modéré (variance 1.5-2.5 / 10)
- Conserver les 3 annotations
- Score humain = médiane

### Cas 2 : désaccord fort (variance > 2.5 / 10)
- Réunion contradictoire entre les 3 experts (1h max)
- Si convergence atteinte → score consensus
- Si pas de convergence → cas **flag CONTROVERSE**, exclu de la corrélation

### Cas 3 : un expert systématiquement outlier
- Si > 30% des cas en désaccord majeur avec les 2 autres
- → exclusion + remplacement
- Documenter le pattern (peut révéler biais légitime)

---

## 6. Protocole anti-biais

### Anti-biais ordre
- Présentation des réponses ZORAN en ordre randomisé par cas
- Pas de label "FULL" / "MINIMAL" visible

### Anti-biais ancrage
- Pas de score ZORAN visible à l'expert
- Pas de "verdict pré-affiché"

### Anti-biais fatigue
- Max 10 cas par session
- Pause 15 min entre sessions
- 3 sessions max par expert / semaine

### Anti-biais expertise propre
- Mix de pathologies hors spécialité de chaque expert
- L'expert peut marquer "hors-spécialité" → exclu de la corrélation pour ce cas

---

## 7. Coût et logistique estimés

| Poste | Estimation |
|---|---|
| Honoraires 3 experts (30h chacun) | ~9 000 € |
| Anonymisation 30 rapports | ~1 500 € |
| Plateforme annotation isolée | ~500 € |
| Analyse statistique + rapport | ~1 000 € |
| **Total** | **~12 000 €** |
| Délai | 6-8 semaines |

---

## 8. Critères de succès / d'échec

### Succès complet (calibré réel)
- Spearman ZORAN ≥ 0.65 sur 30 cas
- Inter-experts Kendall Tau ≥ 0.50
- Agreement top-3 / bottom-3 ≥ 75%
- **Décision** : ZORAN utilisable comme aide décision BET

### Succès partiel
- Spearman 0.40-0.65
- **Décision** : utilisable comme alerte qualité, pas comme verdict

### Échec
- Spearman < 0.40
- **Décision** : prototype académique, pas d'usage métier
- Retour planche à dessin avec hypothèses experts

---

## 9. Engagement de transparence

Tous les résultats — **succès comme échec** — seront publiés intégralement :
- Données brutes (anonymisées)
- Analyses statistiques
- Verbatim experts
- Code des pipelines comparés
- Hypothèses falsifiées

Pas de cherry-picking. Pas de seuil ajusté a posteriori.

---

## 10. Signature

- **mission_id** : `ZORAN_V11_REALITY_CALIBRATION_20260517`
- **type** : protocole proposé (exécution externe requise)
- **dataset minimum** : 30 rapports, 3 BET, annotation aveugle
- **seuil principal** : Spearman ≥ 0.65 pour "calibré réel"
- **budget estimé** : ~12 k€, 6-8 semaines
- **engagement** : publication intégrale résultats même négatifs
