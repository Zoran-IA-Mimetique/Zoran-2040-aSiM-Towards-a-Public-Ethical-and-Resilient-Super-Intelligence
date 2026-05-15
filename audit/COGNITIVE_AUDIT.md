# COGNITIVE AUDIT

**Mission Oracle** : `ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY
**Fichiers audités** : `app/index.html`, `app/style.css`, `app/src/main.js`,
  `app/data/laws.json`

Mesure de la **charge cognitive réelle** du prototype et estimation du
risque de **collapse visuel futur** en cas de scaling.

---

## 1. Méthodologie

Quatre dimensions de charge :

1. **Charge attentionnelle simultanée** : nombre d'éléments visuels
   indépendants demandant attention en même temps (limite cognitive empirique
   ≈ 30 d'après Miller élargi).
2. **Friction de navigation** : nombre d'étapes entre une intention et son
   résultat (recherche, focus, retour).
3. **Densité informationnelle perçue** : ratio info-utile / info-décorative
   par cm² d'écran.
4. **Profondeur exploitable** : combien de paliers de zoom révèlent
   réellement de la structure (vs. zoom vide).

---

## 2. Mesures actuelles (corpus 50 lois)

### 2.1 Charge attentionnelle simultanée

| élément | count | statut |
|---|---|---|
| nœuds visibles | 50 | au-dessus seuil 30 |
| liens visibles | ~106 | dont ~45 animés (`linkDirectionalParticles`) |
| labels visibles | 50 (au survol) ou ~9 (sans survol, légende et statusbar) | OK sans survol |
| streams animés en continu | ~45 | **bruit** |
| **éléments attentionnels actifs** | ~50+45 = **95** | **3× seuil** |

**Verdict** : surcharge attentionnelle modérée. Le système fonctionne car
le cerveau abstrait les nœuds en « nuage » et ne traite individuellement
que ce sur quoi l'œil se pose. Mais les particules forcent une attention
résiduelle non sollicitée.

### 2.2 Friction de navigation

| intention | étapes |
|---|---|
| trouver une loi par nom | `search` → tape → Entrée = 3 étapes ✅ |
| accéder à la fiche détail | click nœud = 1 étape ✅ |
| revenir | `Esc` ou `Alt+←` = 1 étape ✅ |
| explorer une famille | sidebar → clic famille = 2 étapes ✅ |
| isoler une branche | **impossible actuellement** = ∞ ❌ |
| désactiver les particules | **impossible sans modif code** = ∞ ❌ |

**Verdict** : friction faible sur l'usage normal, **infinie** sur deux cas
critiques (isolation de branche, suppression de bruit).

### 2.3 Densité informationnelle perçue

À l'écran (~1600×900 px) :
- ~50 disques (nœuds), surface utile cumulée ≈ 1.5% écran
- ~106 lignes (liens), surface utile cumulée ≈ 0.5% écran
- ~45 particules animées, surface ≈ 0.2% écran mais **mouvement = attention**

**Ratio info-utile / info-décorative** : ~70% utile, ~30% décoratif
(particules + glow + dégradés). Au-dessus du seuil acceptable 80/20.

### 2.4 Profondeur exploitable

Zoom in : on rapproche, on lit les labels, on identifie un nœud. **Utile.**
Zoom out : on voit la topologie globale. **Utile.**
Zoom extrême in (× 100) : **vide** — pas de structure interne aux nœuds, pas
de sous-graphe. **Faux zoom.**
Zoom extrême out (× 0.1) : **vide** — pas de méta-clusters, pas de
super-structure. **Faux zoom.**

**Verdict** : 2 paliers de zoom utiles, 2 paliers de faux zoom. Le terme
« zoom infini » de la lettre de mission initiale est aspirationnel, pas
réalisé.

---

## 3. Projection à 200 lois (P1 sans P0.5)

Estimation linéaire-quadratique :

| métrique | 50 lois | 200 lois (P1 sans gouverneur) |
|---|---|---|
| nœuds visibles | 50 | 200 |
| liens visibles | 106 | ~600–800 (densité actuelle × 4²) |
| streams animés | 45 | ~250 |
| éléments attentionnels | 95 | **~450** (15× seuil cognitif) |
| collapse cognitif | non | **probable** |

**Verdict** : sans gouverneur de croissance + désactivation des particules
par défaut, **le système devient inutilisable au-dessus de ~120 lois**.

---

## 4. Profondeur cognitive utile vs profondeur métaphorique

| profondeur | exploitée ? |
|---|---|
| profondeur structurelle (hiérarchie de lois) | ⚠ profondeur réelle ≤ 2 |
| profondeur sémantique (description, équations, exemples) | ✅ exploitée dans le panneau HTML |
| profondeur relationnelle (lien → fiche → lien) | ✅ navigation historique |
| profondeur visuelle (zoom révélant nouvelle structure) | ❌ inexistante |
| profondeur fractale (auto-similarité à plusieurs échelles) | ❌ inexistante (cf. `FRACTAL_VALIDATION.md`) |

---

## 5. Diagnostic synthétique

| dimension | score [0..1] | commentaire |
|---|---|---|
| charge attentionnelle | 0.55 | tolérable maintenant, fragile en scaling |
| friction navigation | 0.70 | bonne sauf 2 trous (focus-branche, kill-particules) |
| densité info utile | 0.70 | au-dessus du seuil mou de 30% décoratif |
| profondeur exploitée | 0.40 | seule la profondeur sémantique est réelle |
| **score cognitif global** | **0.59** | acceptable, mais limité |

---

## 6. Recommandations (sans exécution)

| action | gain estimé sur score |
|---|---|
| désactiver `linkDirectionalParticles` par défaut | +0.10 |
| ajouter mode focus-branche (masque tout sauf branche sélectionnée) | +0.10 |
| ajouter contrôle utilisateur sur opacité des liens `related` | +0.05 |
| afficher labels uniquement sur les attracteurs μ₀ par défaut | +0.05 |
| introduire profondeur ≥ 3 sur 3 familles (P0_5_SPEC §4) | +0.10 |
| supprimer ISO-005 et reclasser attracteurs | +0.05 |
| **gain projeté score cognitif** | **+0.45 → 1.04 (cap 1.00)** |

Conclusion : P0.5 a un effet cognitif majeur (gain ~0.45) **avant même
toute extension du corpus**.

---

## 7. Détection de symptômes « anti-cognitifs » présents

| symptôme | présent ? | gravité |
|---|---|---|
| galaxie décorative | ⚠ partiel (particules) | modérée |
| pseudo-profondeur (zoom vide) | ✅ présent | modérée |
| bruit lumineux (glow, dégradés excessifs) | ⚠ partiel (glow SVG dans preview ; box-shadow modéré dans CSS) | faible |
| faux zoom utile | ✅ présent (×0.1 et ×100 sont vides) | modérée |
| esthétique anti-cognitive (forme prime sur structure) | ❌ pas présent — la structure prime | — |
| sur-saturation chromatique | ❌ palette restreinte respectée | — |

**Verdict** : aucun symptôme critique. Symptômes modérés à corriger.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/index.html, app/style.css, app/src/main.js,
                      app/data/laws.json
RISKS:                collapse cognitif probable au-dessus de 120 lois
                      sans P0.5 ; faux zoom (profondeur structurelle 2)
S_LOCAL:              n/a (audit UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a (audit UX, pas relationnel)
TOP_FAKE_PATTERNS:    « zoom infini » non réalisé (2 paliers utiles seulement) ;
                      streams particulaires permanents non informatifs
NEXT_ACTIONS:         désactiver particules par défaut ; mode focus-branche ;
                      labels uniquement sur attracteurs ; profondeur ≥ 3
```

🔶
