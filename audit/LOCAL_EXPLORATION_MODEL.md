# LOCAL EXPLORATION MODEL

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `topological_neighbors()`, `explore_local()`, `FAMILY_AFFINITY`
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`

---

## 1. Principe

Chaque loi mère explore **uniquement son voisinage topologique
immédiat** (depth=1). Pas de BFS étendu, pas de traversée multi-saut.
L'exploration cherche les **lacunes** (familles affines non
représentées) que la mère pourrait combler en proposant une fille.

---

## 2. `topological_neighbors(node, depth=1, max_n=8)`

```
nbrs = { e.target | e.source == node.id } ∪
       { e.source | e.target == node.id }
return [ n for n in all_nodes if n.id in nbrs ][:max_n]
```

- Aucune récursion : strictement les voisins reliés par une arête directe.
- Cap dur à 8 voisins par mère (6 en pratique dans `explore_local`).
- Coût `O(|E|)` par mère, négligeable sur 241 lois.

---

## 3. Identification des lacunes (`gaps`)

```
fam        = family_of(node.id)
affinities = FAMILY_AFFINITY[fam]
represented = { family_of(n.id) for n in neighbors }
gaps        = [ f for f in affinities if f not in represented and f != fam ]
```

Une *gap* = une famille théoriquement affine à la mère mais absente
de son voisinage actuel. C'est exactement là qu'une fille candidate
peut apporter une nouvelle relation utile.

Les gaps sont la matière première de `propose_child_candidates()`,
qui en prend au plus `n_max=2`.

---

## 4. Le dict `FAMILY_AFFINITY`

Définit le **scope génératif** par famille — qui peut générer dans quoi :

| mère  | scope autorisé                       | taille |
|-------|--------------------------------------|-------:|
| ULG   | ULG, WP11, WP12, ISO                 | 4      |
| DVE   | DVE, WP12, PAL, UDE                  | 4      |
| UDE   | UDE, DVE, WP12                       | 3      |
| GHUC  | GHUC, ULG, WP11                      | 3      |
| WP11  | WP11, ULG, ISO, VAR                  | 4      |
| WP12  | WP12, DVE, PAL                       | 3      |
| SDE   | SDE, PAL, UDE                        | 3      |
| PAL   | PAL, WP12, SDE                       | 3      |
| ISO   | ISO, ULG, WP11                       | 3      |
| VAR   | VAR, WP11                            | 2      |

Toute famille **hors scope** est automatiquement injectée dans
`forbidden_expansions[]` de la mère, ce qui ferme la porte à l'Oracle
(check `famille_interdite`).

---

## 5. Garde-fous

- `depth=1` : jamais de cascade exploratoire.
- `max_n=6..8` : empêche les mères hub d'aspirer tout le graphe.
- `n_max=2` filles par mère : exploration `O(1)` par sortie.
- Symétrie : une mère ne peut s'auto-cibler (`f != fam` dans gaps).
