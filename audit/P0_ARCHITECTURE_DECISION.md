# P0 ARCHITECTURE DECISION — Arbre pré-rédigé

**Mission** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
**Statut** : ⚠ **DÉCISION CONDITIONNELLE AU RÉSULTAT BET — pré-engagée ici**

> Ce document est **pré-rédigé**. Le verdict sera sélectionné automatiquement
> selon Spearman BET vs V11_FULL. Aucune réinterprétation a posteriori autorisée.

---

## VERDICT (à activer post-calcul)

### CAS A — Spearman BET ↔ V11_FULL **≥ 0.60**
**Verdict** : `ARCHITECTURE_V11_VALIDATED_PROVISIONALLY`

**Conséquences immédiates** :
- ✅ Architecture V11 reconnue comme **partiellement corrélée terrain**
- ✅ Roadmap V13 **autorisée** mais ENCADRÉE :
  - Toute nouvelle métrique V13+ doit prouver +0.05 Spearman incrémentale BET
  - Avant V13.5, **P0 ÉTENDU obligatoire** : 30 cas × 3 BET (~12 k€)
- ✅ Communication externe possible : "ZORAN-V11, prototype corrélé terrain sur N=5 BET, Spearman X.XX"

**Interdictions** :
- ❌ Communication "ZORAN niveau BET senior" (N=5 trop faible)
- ❌ Déploiement aide décision sans P0 étendu
- ❌ Ajout V13.x sans incrément Spearman démontré

---

### CAS B — Spearman BET ↔ V11_FULL entre **0.40 et 0.59**
**Verdict** : `PARTIALLY_VALID_STRONG_INTERNAL_BIAS`

**Conséquences immédiates** :
- ⚠ Architecture V11 partiellement valide, mais **biais interne fort**
- ⚠ Recalibration **obligatoire** avant V13 :
  - Identifier les 2-3 cas où ZORAN s'écarte le plus du BET
  - Identifier les modules responsables
  - Réviser ces modules SEULEMENT (pas de bulk rebuild)
  - Re-tester sur 5 nouveaux cas avant tout V13.x
- ⚠ Communication externe limitée : "ZORAN prototype recherche, calibration partielle"

**Interdictions** :
- ❌ Affirmer "calibré BTP"
- ❌ Déploiement production
- ❌ V13 sans recalibration documentée

---

### CAS C — Spearman BET ↔ V11_FULL **< 0.40**
**Verdict** : `STOP_V13_REBUILD_METHODOLOGICAL`

**Conséquences immédiates** :
- 🚫 Architecture V11 **invalidée empiriquement**
- 🚫 Ground truth synthétique reconnu comme proxy auto-référentiel
- 🚫 STOP toute roadmap V13+
- 🚫 Retour planche à dessin avec consultation BET réels avant toute reprise

**Actions correctives obligatoires** :
1. Documenter intégralement le pourquoi (audit `P0_FAILURE_CASES.md`)
2. Geler V11/V12 en l'état (artefact de recherche)
3. Refondation V13 méthodologique :
   - Ground truth = vrais rapports d'expertise judiciaire (≥ 30)
   - Architecture co-conçue avec 1-2 BET réels
   - Pas de pattern matching offline avant validation hypothèses experts
4. Publier intégralement les résultats négatifs (engagement)

**Communication externe** :
- ✅ "ZORAN-V11 : prototype académique, Spearman terrain X.XX, retour planche à dessin"
- ❌ "ZORAN-V11 : système calibré BTP"
- ❌ Toute promesse runtime opérationnel

---

## Mécanisme de décision automatique

`tools/p0_compute_correlation.mjs` sélectionne le verdict automatiquement.
Lecture du champ `verdict` dans `audit/P0_MINI_RESULTS.json`.

Aucune intervention manuelle entre annotation BET et verdict.
**Pas d'humain dans la boucle pour modifier le verdict.**

---

## Anti-cherry-picking

### Engagement écrit
Quelque soit le verdict :
1. Commit intégral des annotations BET (anonymisées)
2. Push immédiat sans révision
3. Pas d'exclusion de cas a posteriori
4. Pas d'ajustement de seuils
5. Pas de réinterprétation des métriques

### Si tentation de "ajuster" :
- Re-lire `audit/V11_DECISION_GATE_RESULTS.json` et son verdict EXTEND issus de cas synthétiques
- Constater que la stack a déjà été modifiée 12 fois selon l'humeur
- Reconnaître que P0-MINI est précisément l'antidote à cette dérive
- Geler les modifications jusqu'à publication intégrale

---

## Bloquant pour V13+

**TOUS** les développements V13+ sont gelés tant que :
- P0-MINI n'a pas tourné, OU
- P0-MINI a tourné mais verdict CAS C (STOP_V13_REBUILD_METHODOLOGICAL)

Seuls les CAS A et B autorisent une suite, avec leurs contraintes propres.

---

## Limites du protocole acceptées d'avance

1. **N=5 cas** : significativité statistique faible. P0-MINI tranche uniquement les cas extrêmes (Spearman très faible ou très fort).
2. **N=1 BET** : pas de variance inter-experts. Si BET annoté outlier, on peut être en CAS C par hasard.
3. **Cas adversariaux par moi** : biais sélection.
4. **Coût/temps** : limite l'extension à P0 complet (30 cas × 3 BET, 12 k€).

→ Ces limites sont **acceptées avant l'exécution**. Pas d'utilisation post-hoc pour contester un verdict défavorable.

---

## Signature

- **mission_id** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
- **statut** : DÉCISION PRÉ-ENGAGÉE
- **automatisation** : `tools/p0_compute_correlation.mjs` sélectionne verdict
- **anti-cherry-picking** : engagement écrit dans ce document
- **bloquant pour** : V13, V14, toute extension architecturale
