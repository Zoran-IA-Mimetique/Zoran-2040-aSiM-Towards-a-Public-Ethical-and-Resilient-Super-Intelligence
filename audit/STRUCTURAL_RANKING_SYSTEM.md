# STRUCTURAL RANKING SYSTEM

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`

Système de **rang structurel** qui détermine la position verticale Y de
chaque loi. Déterministe, auditable, anti-subjectif.

Référence formelle : `TOPOLOGICAL_WEIGHT_ENGINE.md §7`.

---

## 1. Principe

Le rang structurel `structural_rank(L)` est une **fonction pure** des
propriétés mesurables de `L` et de son contexte dans le graphe. **Aucune
intervention humaine** n'altère le rang.

---

## 2. Hiérarchie produite (corpus actuel post-P2)

Estimation du rang sur les attracteurs et lois fondamentales :

| loi | tier | canonical | depth | comp | rank | Y |
|---|---|---|---|---|---|---|
| GHUC-001 | μ0 | true | 0 | 9 | ~155 | +187 |
| ULG-001 | μ1 | true | 0 | 8+ | ~120 | +100 |
| DVE-001 | μ1 | true | 0 | 8 | ~120 | +100 |
| UDE-001 | μ1 | true | 0 | 8 | ~120 | +100 |
| WP11-001 | μ1 | true | 0 | 7 | ~115 | +87 |
| WP12-001 | μ1 | true | 0 | 7 | ~115 | +87 |
| SDE-001 | μ1 | true | 0 | 7 | ~115 | +87 |
| PAL-001 | μ1 | true | 0 | 6 | ~115 | +87 |
| GHUC-002 | — | true | 1 | 7 | ~30 | -125 |
| GHUC-002-a | — | false | 2 | 5 | ~5 | -187 |
| GHUC-002-a-i | — | false | 3 | 4 | ~−6 | -215 |

Verticalité observée : amplitude ~400 unités entre top et bottom du
corpus.

---

## 3. Niveaux d'admissibilité visuels

Le rang structurel mappé sur 5 niveaux perceptifs :

| niveau Y | rang min | rang max | population attendue |
|---|---|---|---|
| Canopée (+150 → +200) | 100+ | ∞ | μ0 attractors |
| Stratum supérieur (+50 → +150) | 60–100 | μ1 attractors |
| Tronc (-50 → +50) | 20–60 | racines canoniques + canoniques enfants |
| Branches (-150 → -50) | 0–20 | sous-cas, dérivations |
| Racines (-250 → -150) | < 0 | feuilles, instances |

L'utilisateur **lit** ces 5 niveaux à l'œil nu.

---

## 4. Règles d'élévation et descente

### 4.1 Une loi monte si :
- Elle gagne un tier μ1 (+60 rank)
- Elle gagne un tier μ0 (+100 rank)
- Elle accumule des compositions (jusqu'à +10)
- Sa famille devient fractale (+10 si depth ≤ 1)

### 4.2 Une loi descend si :
- Sa stabilité passe à `instable` (-10)
- Sa stabilité passe à `absorbée` (-20)
- Sa profondeur augmente (-5 par palier)

### 4.3 Une loi reste stable si :
- Aucun changement structurel
- Le recalcul donne même rank

**Aucune modification arbitraire** : un auteur ne peut pas dire
« mettons cette loi en haut ». La seule façon de la monter est
d'**augmenter ses compositions** ou de la **promouvoir μ-tier**.

---

## 5. Audit hiérarchique

Pour chaque audit complet, calculer :

```
hierarchy_health = {
  "amplitude": Y_max - Y_min,
  "verticality_coefficient": (mu0_avg_Y - leaf_avg_Y) / amplitude,
  "rank_distribution": Counter(rank // 20),
  "lonely_levels": [niveau Y avec count == 0],
  "saturated_levels": [niveau Y avec count > 30]
}
```

Si `verticality_coefficient < 0.6` → la verticalité est mal calibrée
(ajuster les coefficients du `structural_rank`).

Si un niveau Y est saturé (> 30 lois) → bundling visuel ou redistribution
fine (jitter augmenté).

---

## 6. Anti-règles

| anti-règle | exemple |
|---|---|
| ❌ Modifier rank par instruction | « monte cette loi en haut » |
| ❌ Surcharge top par auto-promotion | générer des μ0 sans démonstration |
| ❌ Descente par préférence | rétrograder une loi sans audit |
| ❌ Niveaux Y vides | si trop d'écart entre niveaux, jitter ou re-équilibrage |
| ❌ Verticalité écrasée | tous les nœuds dans le même Y |

---

## SIGNATURE

```
DOCUMENT:             STRUCTURAL_RANKING_SYSTEM.md
VERSION:              1.0
DETERMINISM:          full (fonction pure)
ANTI_SUBJECTIVITY:    aucune intervention manuelle possible
LEVELS:               5 (canopée / stratum / tronc / branches / racines)
NEXT_ACTIONS:         implémenter compute_topology_weights.py
                      tester verticality_coefficient
                      auditer hierarchy_health après chaque batch
```

🔶
