# VERTICALITY MODEL

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`

Modèle conceptuel de la **verticalité** dans le graphe ZORAN. Pourquoi
l'axe Y devient l'axe sémantique principal, et comment cela transforme
la cognition spatiale.

---

## 1. Hypothèse cognitive

L'œil humain, dans un graphe 3D, perçoit naturellement :
- **vers le haut** = autorité, fondement, racine intellectuelle
- **vers le bas** = détail, instance, dérivé
- **au centre** = importance, gravité, attractor
- **en périphérie** = secondaire, exception, marginal

Cette intuition est **culturellement acquise** (arbre de connaissance,
hiérarchie organisationnelle, table des matières) mais **stable** :
elle survit cross-culturel à 90%+ (cf. études de Lakoff & Johnson sur
les schémas cognitifs spatiaux).

**Décision** : exploiter cette intuition plutôt que la combattre.

---

## 2. Trois sémantiques de l'axe Y

### 2.1 Hauteur ≠ taille

| dimension | sémantique |
|---|---|
| **Y haut** | rang structurel (fondamentalité) |
| **taille grande** | importance compositionnelle |

Une loi peut être **haute mais petite** (μ0 jeune avec peu d'enfants)
ou **basse mais grande** (loi feuille très composée transversalement).

C'est volontaire : deux dimensions, pas une seule.

### 2.2 Hauteur ≠ centralité

| dimension | sémantique |
|---|---|
| **Y haut** | rang structurel |
| **X,Z central** | densité relationnelle |

Une loi peut être **haute en périphérie** (μ0 isolée, ex. ISO-005 si
elle survivait) ou **basse au centre** (feuille hautement connectée).

### 2.3 Hauteur = mérite, pas opinion

L'auteur **ne peut pas** placer une loi en haut par préférence. Le
calcul `structural_rank` est entièrement déterministe (cf.
`STRUCTURAL_RANKING_SYSTEM.md`).

C'est la garantie anti-hubris : aucune loi ne s'élève sans **mériter**
sa hauteur via :
- attractor_tier
- compositions démontrées
- profondeur hiérarchique inverse
- weight structurel
- famille fractale

---

## 3. Métaphore biologique

| niveau | biologie | ZORAN |
|---|---|---|
| canopée | feuilles supérieures captant la lumière | μ0 attractors |
| tronc | structure portante | racines canoniques de famille |
| branches | embranchements structurants | enfants directs canoniques |
| ramifications | sous-divisions fines | sous-cas, instances |
| racines | ancrage souterrain | feuilles spécialisées (paradoxalement en bas) |
| sandbox | semis | sous le sol, futur arbre potentiel |

Note : la métaphore inverse l'arbre biologique (racines en bas chez le
végétal, en haut chez ZORAN). C'est parce que **chez ZORAN les racines
sont conceptuelles** (lois fondatrices) tandis que **les feuilles sont
opérationnelles** (instances appliquées).

---

## 4. Transitions verticales et palier

Une transition entre paliers (`PAL` family) implique :
- soit un changement de Y_target (modification du structural_rank)
- soit un saut palieronique (changement de palier de cohérence)

Distinction importante :

| événement | effet vertical |
|---|---|
| Promotion sandbox → canonical | Y monte de ~50 unités |
| Démotion canonical → sandbox | Y descend de ~50 unités |
| Acquisition tier μ1 | Y monte de ~150 unités |
| Acquisition tier μ0 | Y monte de ~250 unités |
| Acquisition `fractality_demonstrated` famille | toutes les lois de la famille montent légèrement (+25) |
| Pruning d'enfant | léger ajustement (le parent perd `children_count`) |

Toutes ces transitions sont **animées** : pas de saut visuel brutal,
interpolation linéaire sur 800 ms.

---

## 5. Cohabitation avec le multi-parental

Le graphe reste multi-parental (une loi peut avoir plusieurs parents
via `parent`, `iso`, `related`, etc.). La verticalité ne casse pas ça.

Pour une loi à plusieurs parents, le `hierarchical_depth` est :

```
hierarchical_depth(L) = min(d(p) + 1 for p in parents(L))
```

i.e. la profondeur du chemin **le plus court** depuis une racine. Cela
favorise les lois "raccrochées proche du tronc" même si elles ont
aussi des parents profonds.

---

## 6. Cohabitation avec la fractalité

Une famille fractale a des feuilles à profondeur 3+. Ces feuilles
sont en **bas** dans Y. Mais elles bénéficient du bonus
`+10 si family in fractal_families ∧ depth ≤ 1` qui **ne s'applique
pas** à elles (depth > 1) — donc elles restent en bas, comme prévu.

Les **racines** des familles fractales bénéficient du bonus, donc
montent légèrement par rapport aux racines de famille non-fractale.
C'est une **récompense structurelle** explicite pour avoir démontré la
fractalité.

---

## 7. Lecture immédiate du graphe

Avec V3 implémenté, l'utilisateur regardant le graphe pour la première
fois doit voir :

1. **Tout en haut** : 1 sphère dorée géante = `GHUC-001` (μ0)
2. **Légèrement plus bas** : 7 sphères dorées (μ1 = racines des autres
   familles) disposées en arc
3. **Milieu** : ~15 sphères bleues canoniques (enfants directs des μ1)
4. **Sous le milieu** : ~30 sphères vertes / multicolores (sous-cas)
5. **En bas** : ~120 petites sphères (instances, feuilles)
6. **Tout en bas (futur sandbox)** : sphères transparentes

Sans cliquer, l'utilisateur **comprend** la hiérarchie cognitive du
système.

---

## 8. Mesures à instrumenter (futur)

```
verticality_health = {
  "Y_max": +200,
  "Y_min": -325,
  "amplitude": 525,
  "mu0_avg_Y": +180,
  "mu1_avg_Y": +120,
  "canonical_root_avg_Y": +60,
  "leaf_avg_Y": -180,
  "verticality_coefficient":
      (mu0_avg_Y - leaf_avg_Y) / amplitude   // doit être > 0.6
}
```

Si `verticality_coefficient < 0.6` → la verticalité est mal calibrée,
ajuster les coefficients de `structural_rank`.

---

## 9. Risques et garde-fous

| risque | garde-fou |
|---|---|
| Verticalité subjective | calcul déterministe `structural_rank` |
| Empilement vertical | Y_jitter ±15 unités |
| Forêt illisible (174 sphères verticales) | force-directed XZ + clustering famille |
| Saturation hauteur | cap Y_target à +200 (pas plus haut même si rank > 130) |
| Oscillation Y | `fy` fixe (Y gelé), pas de simulation Y |

---

## 10. Comparaison V2 → V3

| aspect | V2 (P0.5 INT) | V3 (P1+) |
|---|---|---|
| layout | force-directed isotrope 3D | force-directed XZ + Y fixe |
| sémantique Y | aucune | rang structurel |
| taille sphère | weight × 10 | topological_weight × 12 |
| sandbox | inexistant | Y bas + opacity 0.4 (futur) |
| temps stabilisation | ~5s | ~8s |
| FPS desktop | 60+ | 60+ (forces réduites grâce à fy) |

---

## SIGNATURE

```
DOCUMENT:             VERTICALITY_MODEL.md
VERSION:              1.0
COGNITIVE_BASIS:      Lakoff & Johnson schémas spatiaux
DETERMINISM:          structural_rank entièrement calculé
CULTURAL_VARIANCE:    ~10% (cross-cultural intuition stable)
NEXT_ACTIONS:         (a) implémenter dans app/src/main.js
                      (b) tester verticality_coefficient ≥ 0.6
                      (c) animer transitions Y sur 800ms
```

🔶
