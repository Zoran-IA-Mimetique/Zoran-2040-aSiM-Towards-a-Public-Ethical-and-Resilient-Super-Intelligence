# HIERARCHICAL TOPOLOGY SPEC

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`
**Mode** : architecte topologique + Oracle hiérarchique

Spécification de la **topologie hiérarchique spatiale V3**. Le graphe
passe d'un nuage relationnel relativement plat à une **arborescence
cognitive verticale** où la position spatiale (Y) reflète la
fondamentalité structurelle.

---

## 1. Principe fondamental

> Plus une loi est structurellement fondamentale,
> plus elle monte (Y haut),
> plus elle devient centrale (X, Z proches du centre),
> plus elle devient stable visuellement (peu de variance positionnelle).

Inversement : les lois locales / dérivées / sandbox descendent en bas,
deviennent périphériques, perdent en taille.

---

## 2. Axes spatiaux

| axe | sémantique | calcul |
|---|---|---|
| **Y** (vertical) | rang hiérarchique | `structural_rank` (cf. `STRUCTURAL_RANKING_SYSTEM.md`) |
| **X, Z** (horizontal) | famille + relations | force-directed avec gravité par famille |
| **taille** | poids topologique | `topological_weight` (cf. `TOPOLOGICAL_WEIGHT_ENGINE.md`) |
| **couleur** | famille + tier (palette inchangée) | inchangé |
| **opacité** | admissibilité runtime | `runtime_admissible ? 1.0 : 0.4` |

---

## 3. Distribution verticale cible

```
   Y_haut (canopée)    │   ★ μ0 attractors                ← lois fondamentales
                       │     fortement composées
                       │     invariants multi-échelle
                       │
   Y_milieu_haut       │   ◆ μ1 attractors               ← racines de famille
                       │     racines canoniques
                       │
   Y_milieu            │   ● lois structurantes          ← compositions fortes
                       │     enfants directs canoniques
                       │
   Y_milieu_bas        │   ◯ lois intermédiaires         ← profondeur 2
                       │     sous-cas, dérivations
                       │
   Y_bas (racines)     │   · feuilles, instances         ← profondeur 3+
                       │     spécialisations terminales
                       │
   Y_très_bas          │   ▼ sandbox (futur)             ← non admissibles runtime
                       │     opacity = 0.4
```

---

## 4. Calcul du `structural_rank`

```
structural_rank(law) =
    + 100 si attractor_tier == 'μ0'
    +  60 si attractor_tier == 'μ1'
    +  40 si canonical == True ∧ parent == None        (racine de famille)
    +  20 si canonical == True ∧ parent != None         (canonique enfant direct)
    +  10 si compositions_count >= 7
    +   5 si compositions_count >= 5
    +   2 si compositions_count >= 3
    +  10 si family in fractal_families ∧ depth(law) <= 1
    -  10 si stability == 'instable'
    -  20 si stability == 'absorbée'
    -  hierarchical_depth * 5             (plus profond → plus bas)
    +  weight * 5
```

Plage attendue : `[0, 130]`. Mappé en Y selon :

```
Y = 200 - structural_rank * 2.5      // -325 (bas) ... +200 (haut)
```

Soit ~ -325 à +200 unités, donc ~525 unités d'amplitude verticale.

---

## 5. Calcul du `hierarchical_depth`

Profondeur dans l'arbre parent (BFS depuis la racine canonique de
famille) :

```
hierarchical_depth(law) =
    0 si parent == None (racine canonique)
    1 + min(hierarchical_depth(p) for p in parents)
```

Plage : `[0, 3+]`. Plus haut = plus profond dans l'arbre.

---

## 6. Calcul du `topological_weight`

Mesure d'importance structurelle (taille perçue de la sphère) :

```
topological_weight(law) =
    0.30 * (compositions_count / 10 capped 1.0)
    + 0.25 * (1.0 si attractor_tier ∈ {μ0, μ1} else 0.5 si canonical else 0.2)
    + 0.20 * (children_count / 5 capped 1.0)
    + 0.15 * weight
    + 0.10 * (1.0 if family in fractal_families else 0.5)
```

Plage : `[0, 1]`. Mappé en taille de sphère :

```
sphere_radius = 2 + topological_weight * 12
```

Soit `[2, 14]` unités. Les μ0/μ1 deviennent visuellement larges.

---

## 7. Calcul du `visual_weight`

Distinct du `topological_weight` : ajusté pour la perception visuelle
(éviter que les feuilles disparaissent visuellement).

```
visual_weight(law) =
    0.7 * topological_weight + 0.3 * 0.4   // floor à ~0.28
```

Garantit qu'aucune sphère ne devient trop minuscule.

---

## 8. Calcul du `runtime_weight`

Priorité de chargement par CLE (cf. `CONTEXTUAL_LOADING_ENGINE.md`) :

```
runtime_weight(law) =
    0.5 * (1.0 if runtime_admissible else 0.0)
    + 0.3 * topological_weight
    + 0.2 * (1.0 if attractor_tier ∈ {μ0, μ1} else 0.4)
```

Utilisé par CLE pour ranker les candidats à charger.

---

## 9. Forces appliquées au layout

| force | rôle | paramètre |
|---|---|---|
| repulsion globale | éviter agglutination | strength = -110 |
| attraction parent | hiérarchie verticale | distance ~ 30 |
| **gravité Y** (NOUVEAU) | tirer vers Y_target | strength = 0.04 |
| gravité X centrale (NOUVEAU) | éviter dispersion latérale | strength = 0.02 |
| force par famille | clustering horizontal | par swarm |

```
node.fy = Y_target  // force la position Y absolue
```

`fy` (fixed Y) gèle la coordonnée verticale. Le moteur de physique
n'optimise que X et Z. C'est ce qui transforme le nuage en arbre.

---

## 10. Anti-overlap vertical

Si plusieurs nœuds partagent le même `structural_rank` exact, ajouter
un jitter en Y de ±15 unités basé sur le hash de l'id :

```
Y_jitter = (hash(id) % 30) - 15
Y_final = Y_target + Y_jitter
```

Évite l'empilement strict ; permet de distinguer visuellement les nœuds
de même rang.

---

## 11. Stabilisation

```
fg.d3Force('charge').strength(-110)
fg.d3Force('center').strength(0.02)         // gravité X,Z
// pas de gravité Y centrale — fy gèle Y
fg.d3VelocityDecay(0.4)                     // damping fort
fg.d3AlphaDecay(0.025)                      // convergence rapide
fg.cooldownTime(8000)                        // arrêt simulation après 8s
```

Damping fort + alphaDecay = arbre se stabilise rapidement, bouge peu.

---

## 12. Tests d'acceptation

| test | critère pass |
|---|---|
| TT1 — μ0/μ1 visuellement en haut | les attractors occupent les Y > 0 |
| TT2 — feuilles en bas | depth ≥ 3 → Y < -100 |
| TT3 — pas d'overlap | aucun chevauchement ≥ 50% de surface |
| TT4 — stabilité | la simulation converge en < 8s |
| TT5 — FPS ≥ 60 | desktop sur 174 nœuds |
| TT6 — sandbox bas + transparent (futur) | runtime_admissible=false → Y bas + opacity 0.4 |

---

## 13. Interdictions

| interdit | raison |
|---|---|
| ❌ esthétique arbitraire (gros nœuds décoratifs) | viole « mériter sa taille » |
| ❌ hiérarchie subjective (re-ordonnance manuelle) | seul le calcul automatique gouverne |
| ❌ Y défini par préférence d'auteur | dérive idéologique |
| ❌ surcharge verticale chaotique | viole silence visuel |
| ❌ amas centraux sans aération | overload zone Z1 réintroduit |

---

## 14. État courant (P0.5)

L'app actuelle utilise un layout 3D **isotrope** (force-directed sans
biais vertical). Cette spec décrit l'évolution V3.

À implémenter :
- `tools/compute_topology_weights.py` : calcule `structural_rank`,
  `topological_weight`, `visual_weight`, `runtime_weight`,
  `hierarchical_depth` pour chaque loi → écrit dans `laws.json`.
- `app/src/main.js` : utilise `node.structural_rank` pour
  `node.fy = -2.5 * structural_rank + 200` ; utilise
  `node.topological_weight` pour la taille de sphère.
- `app/src/colors.js` : pas de changement (palette préservée).

---

## SIGNATURE

```
DOCUMENT:             HIERARCHICAL_TOPOLOGY_SPEC.md
VERSION:              1.0
Y_AXIS:               structural_rank ∈ [0, 130]
SIZE:                 topological_weight ∈ [0, 1] → radius [2, 14]
LAYOUT_FORCE:         fy fixed = forced vertical
DAMPING:              0.4 (strong)
COOLDOWN:             8s
NEXT_ACTIONS:         (a) implémenter tools/compute_topology_weights.py
                      (b) modifier app/src/main.js pour utiliser fy
                      (c) tester FPS sur 174 nœuds
                      (d) document VERTICALITY_MODEL.md, TOPOLOGICAL_WEIGHT_ENGINE.md, etc.
```

🔶
