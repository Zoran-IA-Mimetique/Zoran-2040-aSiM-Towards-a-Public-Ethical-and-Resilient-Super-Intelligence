# AUTO REFERENCE PREVENTION

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `generation_oracle()` (check #4), `derive_generative_scope()` (depth_limit), `propose_child_candidates()`
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`, `audit/GENERATION_ORACLE.md`, `audit/ANTI_DRIFT_PROTOCOL.md`

---

## 1. Trois couches de prévention

Trois barrières indépendantes contre la dérive auto-référentielle
(mère qui se génère elle-même, cascade sur filles, ou réouverture
d'une famille fermée).

| # | Mécanisme                      | Lieu                                       | Effet                  |
|---|--------------------------------|--------------------------------------------|------------------------|
| 1 | Oracle check `auto_référentialité` | `generation_oracle()` ligne `child.parent_id != child.id` | reject immédiat |
| 2 | `generation_depth_limit = 1`   | `derive_generative_scope()`                | pas de petite-fille    |
| 3 | `forbidden_expansions[]`       | injecté par mère                           | familles closes        |

Ces couches sont **indépendantes** : la défaillance de l'une ne
neutralise pas les autres.

---

## 2. Couche 1 — check Oracle `auto_référentialité`

```python
if child["parent_id"] == child["id"]:
    rejections.append("auto_référentialité")
```

Trivialement satisfait par construction puisque
`child_id = f"{gap_fam}-{parent_id}-d{i+1}"` est strictement plus long
que `parent_id`. Run 2026-05-16 : **0 rejet** pour cette raison.
Le check reste une **assertion défensive** contre toute mutation/bug
futur qui produirait `child_id == parent_id`.

---

## 3. Couche 2 — `generation_depth_limit = 1`

Injecté par `derive_generative_scope()` sur chaque mère. Conséquence
opérationnelle : `main()` itère uniquement sur `g["nodes"]` (mères
canoniques), **jamais** sur `new_children`. Une fille acceptée vit
en sandbox et n'est pas réinjectée comme mère au même run.

```
L_i    →  filles (depth=1)    autorisé
filles →  petites-filles      impossible (boucle main() ne les voit pas)
```

Sans cette borne : 241 × 2 × 2 = 964 nœuds en 2 niveaux, 1928 en 3.
Avec `depth_limit=1` : toit théorique `241 × 2 = 482`, puis cap dur
à **50** (cf. `SANDBOX_GENERATION_PROTOCOL.md`).

---

## 4. Couche 3 — `forbidden_expansions[]` par mère

```python
"forbidden_expansions": FORBIDDEN_GLOBAL + [
    f for f in FAMILY_AFFINITY if f not in affinities
]
```

Chaque mère porte la liste des familles hors de son affinity set
plus les domaines globalement interdits (`cosmologie_profonde`,
`conscience_profonde`, `physique_haute_énergie`). L'Oracle vérifie
`child.family ∉ mother.forbidden_expansions` (check `famille_interdite`).
Effet anti-référentiel : une mère `ULG` ne peut pas générer dans
`DVE`, empêchant le retour cyclique `ULG → DVE → ULG` à travers
plusieurs runs.

---

## 5. Pourquoi cela prévient la dérive

- **Pas de cascade verticale** : `depth_limit=1` — moteur *one-shot*,
  pas *self-replicator*.
- **Pas de boucle horizontale** : `forbidden_expansions` ferme les
  familles non-affines, bloquant la résonance cyclique.
- **Pas de point fixe identitaire** : check #4 illégalise
  `child.id == parent.id`.
- **Plafond global** : `MAX_CHILDREN=50` agit en dernière barrière
  même si les couches 1-3 fuyaient.

Mesure runtime : **0 fille touchant `laws.json`**, **0 rejet**
`auto_référentialité`, **0 rejet** `famille_interdite` — non parce
que les checks sont laxistes, mais parce que les couches 2 et 3
rendent ces cas structurellement impossibles avant l'Oracle.
