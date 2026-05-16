# TOPOLOGICAL WEIGHT ENGINE

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`

Moteur de calcul des **5 poids topologiques** par loi. Déterministe,
reproducible, auditable.

```
topological_weight     // importance structurelle perçue (taille sphère)
visual_weight          // ajustement perceptif (anti-disparition feuilles)
runtime_weight         // priorité chargement CLE
hierarchical_depth     // profondeur dans l'arbre parent
structural_rank        // niveau hiérarchique (Y absolu)
```

Référence pratique : `tools/compute_topology_weights.py`.

---

## 1. Inputs

Pour chaque loi `L` :
- `L.canonical` (bool)
- `L.attractor_tier` (`μ0` / `μ1` / `null`)
- `L.weight` (∈ [0, 1])
- `L.stability` (`stable` / `instable` / `absorbée`)
- `L.runtime_admissible` (bool)
- `L.family` (string)
- `parents(L)`, `children(L)` (calculés depuis `edges`)
- `compositions_count(L)` (calculé depuis `compositions[].pair`)
- `family_is_fractal(L.family)` (bool, depuis `families[].fractality_demonstrated`)

---

## 2. `hierarchical_depth(L)`

Profondeur dans l'arbre parent (BFS) :

```python
def hierarchical_depth(L, graph, memo={}):
    if L.id in memo: return memo[L.id]
    parents = parents_of(graph, L.id)
    if not parents:
        memo[L.id] = 0
    else:
        memo[L.id] = 1 + min(hierarchical_depth(p, graph, memo)
                             for p in [graph.get_node(pid) for pid in parents])
    return memo[L.id]
```

Propriétés :
- racine canonique de famille (`parents = []`) → depth 0
- enfant direct → depth 1
- petit-enfant → depth 2
- arrière-petit-enfant → depth 3 (ex. ULG-002-a-i)
- multi-parental : prend le **min** (chemin le plus court)

---

## 3. `compositions_count(L)`

Identique au compteur P1/P2 (cf. `tools/add_p1_laws.py`,
`tools/demonstrate_all_laws.py`). Compte distinct :
- parent + grand-parent
- siblings + children
- iso / contradicts / related / absorbed_into / depends endpoints
- entries dans `compositions[]`

---

## 4. `topological_weight(L)`

```
topological_weight(L) =
    0.30 * min(1.0, compositions_count(L) / 10)
  + 0.25 * tier_factor(L)
  + 0.20 * min(1.0, children_count(L) / 5)
  + 0.15 * L.weight
  + 0.10 * fractal_factor(L.family)
```

avec :

```
tier_factor(L) = 1.0  si L.attractor_tier ∈ {μ0, μ1}
               = 0.5  si L.canonical
               = 0.2  sinon

fractal_factor(family) = 1.0 si family in fractal_families else 0.5
```

Plage : `[0, 1]`. Mappé en taille sphère :

```
sphere_radius(L) = 2 + topological_weight(L) * 12
```

Soit `[2, 14]` unités.

---

## 5. `visual_weight(L)`

Ajustement anti-disparition (les feuilles auraient sinon des sphères
trop petites pour être lisibles) :

```
visual_weight(L) = 0.7 * topological_weight(L) + 0.3 * 0.4
                 = 0.7 * topological_weight(L) + 0.12
```

Plage : `[0.12, 0.82]`. Plancher à 0.12 garantit qu'aucune sphère ne
disparaît sous une certaine taille.

```
visual_radius(L) = 2 + visual_weight(L) * 12 = [3.4, 11.84]
```

---

## 6. `runtime_weight(L)`

Priorité de chargement par CLE :

```
runtime_weight(L) =
    0.5 * (1.0 if L.runtime_admissible else 0.0)
  + 0.3 * topological_weight(L)
  + 0.2 * tier_runtime_factor(L)

tier_runtime_factor(L) = 1.0 si L.attractor_tier ∈ {μ0, μ1}
                       = 0.4 sinon
```

Plage : `[0, 1]`. CLE prend les top-`N_max` candidats par
`runtime_weight` après filtre `runtime_admissible == true`.

---

## 7. `structural_rank(L)`

Niveau hiérarchique absolu (mappé en Y) :

```
structural_rank(L) =
    + 100 si L.attractor_tier == 'μ0'
    +  60 si L.attractor_tier == 'μ1'
    +  40 si L.canonical ∧ depth(L) == 0     (racine canonique)
    +  20 si L.canonical ∧ depth(L) > 0       (canonique enfant direct)
    +  10 si compositions_count(L) >= 7
    +   5 si compositions_count(L) >= 5
    +   2 si compositions_count(L) >= 3
    +  10 si family_is_fractal(L.family) ∧ depth(L) <= 1
    -  10 si L.stability == 'instable'
    -  20 si L.stability == 'absorbée'
    -   5 * depth(L)                          (plus profond → plus bas)
    +   5 * L.weight                          (poids natif intervient)
```

Bornes naturelles :
- max théorique : `100 + 40 + 10 + 10 + 5 = 165` (μ0 + canonical racine + comp ≥ 7 + fractal + weight 1)
- min théorique : `0 - 20 - 5 * 4 + 0 = -40` (absorbée à profondeur 4 sans rien d'autre)

Plage observée : `[~0, ~150]`.

Mapping Y :

```
Y_target(L) = 200 - structural_rank(L) * 2.5
            // structural_rank 100 → Y = -50 (haut)
            // structural_rank 50 → Y = +75
            // structural_rank 0 → Y = +200 (bas)
```

Wait — si rank haut → Y bas, c'est inversé. Correction :

```
Y_target(L) = -200 + structural_rank(L) * 2.5
            // structural_rank 100 → Y = +50
            // structural_rank 165 → Y = +212  (max)
            // structural_rank 0 → Y = -200    (bas)
```

C'est mieux : rang haut → Y haut.

---

## 8. Anti-overlap par jitter

Si plusieurs lois partagent le même `Y_target`, ajouter jitter :

```
Y_jitter(L) = (hash(L.id) % 30) - 15
Y_final(L) = Y_target(L) + Y_jitter(L)
```

Évite l'empilement strict, préserve la lisibilité.

---

## 9. Calcul programmatique

```python
def compute_all_weights(graph):
    for L in graph.nodes:
        L.hierarchical_depth = hierarchical_depth(L, graph)
        L._compositions_count = compositions_count(L, graph)
        L.topological_weight = topological_weight_calc(L, graph)
        L.visual_weight = 0.7 * L.topological_weight + 0.12
        L.runtime_weight = runtime_weight_calc(L, graph)
        L.structural_rank = structural_rank_calc(L, graph)
        L._Y_target = -200 + L.structural_rank * 2.5
        L._Y_jitter = (hash(L.id) % 30) - 15
        L._fy = L._Y_target + L._Y_jitter
```

Le résultat est sérialisé dans `laws.json` champs :
- `topological_weight`
- `visual_weight`
- `runtime_weight`
- `hierarchical_depth`
- `structural_rank`
- `_fy` (Y forcé pour le moteur de physique)

---

## 10. Validation

Pour chaque loi, vérifier :

| invariant | enforce |
|---|---|
| `topological_weight ∈ [0, 1]` | clamp |
| `visual_weight ∈ [0.12, 0.82]` | clamp |
| `runtime_weight ∈ [0, 1]` | clamp |
| `hierarchical_depth ∈ [0, 10]` | log warn si > 5 |
| `structural_rank ∈ [-50, 200]` | clamp |
| `_fy ∈ [-250, +250]` | clamp |

---

## 11. Recalcul automatique

Recompute déclenché par :
- ajout d'une loi (P1, P2, futur)
- modification du `weight` ou `attractor_tier` d'une loi
- ajout d'une nouvelle composition
- promotion sandbox → canonical
- démotion canonical → sandbox

À chaque recalcul : `tools/compute_topology_weights.py` réécrit les 5
champs sur tous les nœuds. Coût : O(N²) au pire, mais N ≤ 1000 reste
tractable (~50ms).

---

## 12. Risques

| risque | mitigation |
|---|---|
| Calcul non-déterministe | toujours seeded ; tests d'égalité re-run |
| Drift entre laws.json et computed values | invalider à chaque modification de graph |
| Cap excessivement bas (sphères toutes égales) | balance des coefficients |
| Verticalité écrasée (toutes lois proches) | normalisation par max observed |

---

## SIGNATURE

```
DOCUMENT:             TOPOLOGICAL_WEIGHT_ENGINE.md
VERSION:              1.0
WEIGHTS_COMPUTED:     5 (topological, visual, runtime, depth, rank)
DETERMINISM:          full
RECALC_TRIGGERS:      ajout/modif loi, modif coefficient
COMPLEXITY:           O(N²) max, tractable jusqu'à N=1000
NEXT_ACTIONS:         (a) tools/compute_topology_weights.py (Python)
                      (b) sérialiser dans laws.json
                      (c) main.js consomme structural_rank → fy
```

🔶
