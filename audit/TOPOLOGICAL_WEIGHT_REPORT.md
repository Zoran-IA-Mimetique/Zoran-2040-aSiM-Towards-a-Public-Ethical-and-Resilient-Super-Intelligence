# TOPOLOGICAL WEIGHT REPORT

**Mission** : `ZORAN_HIERARCHICAL_TREE_VALIDATION_20260515`

État des poids topologiques sur les 241 lois canoniques, distribution,
audit anti-inflation.

---

## 1. Distribution `topological_weight` (radius sphère)

| segment topo_w | nb | % | radius implicite |
|---|---:|---:|---|
| [0.85, 1.00] | 1 | 0.4% | radius 12.2-14.0 (μ0) |
| [0.70, 0.85] | 8 | 3.3% | 10.4-12.2 (μ1 racines) |
| [0.55, 0.70] | 32 | 13.3% | 8.6-10.4 (canoniques principaux) |
| [0.40, 0.55] | 78 | 32.4% | 6.8-8.6 (canoniques + sous-cas) |
| [0.25, 0.40] | 95 | 39.4% | 5.0-6.8 (instances) |
| [0.12, 0.25] | 27 | 11.2% | 3.4-5.0 (feuilles) |

**Distribution pyramidale** — peu de très grosses sphères, beaucoup de
petites, conforme à l'intention « mériter sa taille ».

---

## 2. Audit anti-inflation taille

| anomalie | détection | observée |
|---|---|:---:|
| Taille géante non-canonique | `topo_w > 0.85 ∧ ¬canonical` | 0 |
| Pseudo-attractor visuel | `radius > 12 ∧ tier non-déclaré` | 0 |
| Feuille gonflée | `radius > 8 ∧ depth ≥ 3` | 0 |
| Sphère minuscule (lisibilité) | `visual_w < 0.20` | 0 (floor à 0.12) |

---

## 3. Cohérence taille / rang

Vérification que la taille suit le rang (pas anti-corrélée) :

```
correlation(topological_weight, structural_rank) ≈ 0.78  (forte)
```

Les grosses sphères sont effectivement les plus haut placées. La
corrélation n'est pas 1.0 car certaines feuilles très composées
peuvent être un peu plus grosses que des canoniques peu composés —
c'est sain (verticalité ≠ taille).

---

## 4. `runtime_weight` distribution

`runtime_weight` priorise les lois pour CLE :

| segment | nb | rôle |
|---|---:|---|
| [0.85, 1.00] | 9 | μ0/μ1 attractors — chargés en priorité |
| [0.65, 0.85] | 30 | canoniques principaux |
| [0.45, 0.65] | 90 | sous-cas réguliers |
| [0.25, 0.45] | 95 | instances (chargées si pertinentes) |
| [0.10, 0.25] | 17 | feuilles spécialisées (rarement chargées) |

Aucune loi avec `runtime_admissible: false` dans canonical (toutes
sandbox sont dans laws_sandbox.json séparément).

---

## 5. Consistance entre poids

Les 5 poids (`hierarchical_depth`, `topological_weight`, `visual_weight`,
`runtime_weight`, `structural_rank`) sont calculés **déterministiquement**
depuis l'état du graphe. Recalcul reproduit exactement les mêmes valeurs.

---

## 6. Comparaison historique

| version | nodes | topo_w_avg | rank_avg | vert_coef |
|---|---:|---:|---:|---:|
| P0.5 (initial V3) | 45 | 0.42 | 35 | n/a |
| P1 | 91 | 0.45 | 30 | n/a |
| P2 | 174 | 0.43 | 25 | 0.93 |
| P3 (final) | 241 | 0.42 | 22 | 0.91 |

`rank_avg` baisse légèrement avec l'expansion (plus de feuilles), `vert_coef`
reste stable au-dessus de 0.90 — verticalité préservée.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_HIERARCHICAL_TREE_VALIDATION_20260515
TIMESTAMP:                2026-05-15T20:44:00+02:00
INFLATION_COUNT:          0
SIZE_RANK_CORRELATION:    ~0.78
RUNTIME_WEIGHT_DIST:      pyramidale équilibrée
VERDICT:                  green
```

🔶
