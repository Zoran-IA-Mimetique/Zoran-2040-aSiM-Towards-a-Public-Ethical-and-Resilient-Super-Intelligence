# LAYER_MANAGER_SYSTEM — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `META_PATTERN_LAYERS.md`, `MULTI_CORE_PATTERN_ENGINE.md`,
`MULTI_LAYER_VISUALIZATION.md`, `app/src/main.js` (lignes 414-457)

---

## 1. Structure DOM

Panneau dédié dans `app/index.html`, inséré entre `Familles` et
`Lois supérieures` :

```html
<section class="panel">
  <h3>Noyaux émergents ◉</h3>
  <ul id="cores-list"></ul>
  <div id="cores-controls">
    <button id="cores-all">tous</button>
    <button id="cores-isolate">isoler</button>
  </div>
</section>
```

Chaque `<li>` représente un core, généré par `buildSidebar()` à
partir de `state.cores.cores` (chargé depuis `app/data/cores.json`).

## 2. Item de noyau

Pour chaque core (8 au total) :

```js
<span class="swatch" style="background:${familyColor(c.dominant_family)}"></span>
<span class="mono">${c.core_id.replace('CORE-','')}</span>   // ex. "02-DVE"
<span class="fam-count">${c.size}</span>                      // 21..37
<span data-toggle="1">✓ | ∅</span>                            // toggle
```

`title` de l'item :
`"CORE-02-DVE\n\nCentres : DVE-001, DVE-002, DVE-008\nDensité : 0.089\n
Stabilité : 0.874\nClic centre = focus | Clic ✓ = toggle layer"`.

Couleur dérivée de la famille dominante via `familyColor(family_id)`
— même palette que le panneau Familles, garantit cohérence visuelle
cross-panneau.

## 3. Interactions

| Geste                          | Effet                                             |
|--------------------------------|---------------------------------------------------|
| Clic sur le corps de l'item    | `selectNode(c.gravity_center[0], true)` (focus)   |
| Clic sur le badge `✓`/`∅`      | toggle `state.layerVisibility[c.core_id]`         |
| Bouton **tous**                | set tous les cores à `true`, rebuild + apply      |
| Bouton **isoler**              | isole le core du nœud sélectionné (ou 1er core)   |

`isoler` lit `state.selected?.core_id` pour déterminer la cible —
permet à l'opérateur de cliquer un nœud puis isoler son noyau d'un
geste. Fallback : `state.cores.cores[0].core_id` (CORE-02-DVE par
`runtime_relevance` décroissante).

## 4. Cycle de rebuild

`buildSidebar()` est rappelé après tout toggle global (tous /
isoler) pour resynchroniser les badges `✓`/`∅`. Pour un toggle
unitaire, seul `e.target.textContent` est muté + `applyLayerVisibility()`
appliqué — pas de rebuild complet (optimisation 60fps).

Aucune dépendance ajoutée. Toggle persiste pour la session mais n'est
**pas** stocké dans `localStorage` (contrairement à la position du
panneau de détail) — comportement délibéré : l'état des layers est
un mode de lecture transitoire.
