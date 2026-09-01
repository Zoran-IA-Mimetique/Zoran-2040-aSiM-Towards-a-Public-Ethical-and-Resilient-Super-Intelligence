# META_PATTERN_LAYERS — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `MULTI_CORE_PATTERN_ENGINE.md`, `LAYER_MANAGER_SYSTEM.md`,
`MULTI_LAYER_VISUALIZATION.md`

---

## 1. Concept

Chaque **noyau émergent** détecté par `multi_core_pattern_engine.py`
devient une **couche visuelle** (layer) du graphe 3D. La projection
241 lois → 8 cores produit 8 calques de lecture indépendants :
l'opérateur peut isoler un noyau, en masquer plusieurs, ou tout
afficher sans jamais modifier la topologie sous-jacente.

Le calque n'est pas une partition : c'est une **modulation
d'opacité**. La position des nœuds, les forces, les edges restent
identiques — seules `material.opacity` et `material.transparent`
varient selon `state.layerVisibility[core_id]`.

## 2. Annotation par nœud

À la sortie de `detect_cores()`, chaque `node` reçoit un attribut
`core_id` :

```json
{ "id": "DVE-014", "family": "DVE", "core_id": "CORE-02-DVE", ... }
```

- Un nœud appartient à un et un seul noyau dominant.
- Sur 241 nœuds, `orphan_count = 0` (coverage 100%).
- Les seeds sont les top-composite de chaque famille
  (voir `CORE_GRAVITY_DETECTION.md`).

## 3. État runtime

Dans `app/src/main.js`, l'état du gestionnaire de couches vit dans
`state.layerVisibility`, sérialisé `{ core_id: bool }` :

```js
state.layerVisibility = {
  "CORE-01-ULG":  true,
  "CORE-02-DVE":  true,
  "CORE-03-UDE":  true,
  // … 8 entrées au total
};
```

Initialisé à `true` pour tous les cores au premier `buildSidebar()`.
Modifié par les boutons `tous` / `isoler` / clic ✓ (voir
`LAYER_MANAGER_SYSTEM.md`).

## 4. Application opacité

`applyLayerVisibility()` parcourt `state.meshes` et règle l'opacité
cible (lue par `tickAnimation()` pour transition douce) :

| visibilité layer du nœud | opacité cible |
|--------------------------|--------------:|
| `true`                   | `1.00`        |
| `false`                  | `0.05`        |

Les edges héritent de l'opacité minimum des deux endpoints. Les nœuds
masqués restent **cliquables et raycastables** : le calque est un
filtre de lecture, pas une suppression. La topologie est préservée
pour permettre tout retour sans recalcul des forces.
