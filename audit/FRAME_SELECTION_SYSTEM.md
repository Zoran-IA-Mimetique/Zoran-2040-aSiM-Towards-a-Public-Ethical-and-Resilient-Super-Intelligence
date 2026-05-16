# FRAME_SELECTION_SYSTEM — Spec

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Spec liée** : `audit/FRAME_HIERARCHY_SPEC.md` (schéma `frames`)
**Implémentation** : `tools/cognitive_selection_engine.py` → `frame_dependency_cost()`
**UI** : `app/src/panel.js` → `framesBlock(node)`

## Principe

Une loi ne se charge jamais **seule** : elle entraîne ses cadres de
calcul (`frames.local`, `frames.intermediate[]`, `frames.global`).
Le moteur de sélection internalise ce coût via `frame_dependency_cost`,
qui agit comme **pénalité** dans la priorité de sélection.

```
runtime_priority -= 0.10 × frame_dependency_cost
selection_priority pondère encore frame_dependency_cost indirectement
                   via propagation_efficiency (terme runtime_cost_ratio)
```

## Formule (proxy `dependency_load`)

```
frame_dependency_cost(n) = clamp01(n.dependency_load)
```

`dependency_load` est calculé en amont (cf. `DEPENDENCY_PROPAGATION_MODEL.md`)
et reflète le nombre de cadres distincts qu'il faut activer pour que
le calcul de la loi soit cohérent.

## Trois tiers de cadres (déjà câblés panel.js)

| Tier         | Glyphe | Couleur CSS              | Sémantique                              |
|--------------|--------|--------------------------|-----------------------------------------|
| local        | ⊙      | `var(--canonical)` bleu  | contexte minimal, attracteur réduit     |
| intermediate | ◉      | `var(--variant)` vert    | paliers micro / meso / macro / systémique |
| global       | ⊕      | `var(--accent)` or       | méta-cadre Ω⁸, condition systémique     |

Le bloc `framesBlock()` de `panel.js#L57-106` rend ces trois tiers
(plus `proxies` et `limits`) systématiquement quand la loi a un objet
`frames` valide.

## Co-sélection implicite

Quand `select_cognitive_set()` retient une loi `L`, **tous ses cadres
sont implicitement retenus** : le runtime doit les activer pour que `L`
soit interprétable. C'est pourquoi `frame_dependency_cost` figure deux
fois dans la chaîne de scores :

1. Pénalité directe dans `runtime_priority` (−10 %)
2. Composante 50 % de `runtime_cost_ratio` → influence `propagation_efficiency`

Cette double pénalisation pousse l'algorithme à préférer, à pertinence
sujet équivalente, les lois aux cadres **légers ou déjà partagés**
avec d'autres lois déjà sélectionnées (économie d'activation).

## Comportement empirique

Sur le sujet `boundary subject contextualisation`, les 20 lois retenues
appartiennent à 6 familles (WP11, WP12, UDE, PAL, SDE, GHUC). Cette
diversité familiale **maximise la couverture de cadres** tout en
restant sous le plafond budget — le moteur sélectionne naturellement
des lois aux cadres complémentaires plutôt que redondants, car la
saturation marginale pénalise les ajouts redondants après les premiers
rangs.

## Limite connue

`frame_dependency_cost` utilise `dependency_load` comme proxy unique.
Une amélioration P2 calculerait directement `|union(frames) sur selected|`
à chaque ajout, pour modéliser le **partage effectif de cadres** entre
lois co-sélectionnées. Aujourd'hui le partage est mesuré indirectement
via la saturation du gain marginal.
