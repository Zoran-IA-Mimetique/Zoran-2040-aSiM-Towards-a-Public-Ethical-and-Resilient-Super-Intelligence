# LABEL SYSTEM

**Mission** : `ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515`
**Timestamp** : `2026-05-15T19:24:00+02:00`
**Mode** : spec

Système d'étiquettes des nœuds — apparition silencieuse, sans surcharge.

---

## 1. Choix technique : `CSS2DRenderer`

Three.js fournit `CSS2DRenderer` (et `CSS2DObject`). Avantages :

| critère | CSS2DRenderer | Texture canvas | Sprite billboard |
|---|---|---|---|
| coût GPU | très bas (DOM 2D) | moyen | moyen |
| lisibilité texte | parfaite (rendu natif font) | floue selon DPI | dépend texture size |
| accessibilité (a11y) | DOM réel → ARIA | aucune | aucune |
| effets CSS (fade, shadow) | natif | non | non |

**Décision** : `CSS2DRenderer` superposé au `WebGLRenderer` existant. Le
label est un `<div>` ancré à la position 3D du nœud, mis à jour par
projection à chaque frame.

Le moteur `3d-force-graph` utilisé actuellement supporte un mode
`extraRenderers: [new CSS2DRenderer()]` et un callback `nodeThreeObject`
acceptant des `CSS2DObject`. Pas besoin de réécrire le renderer.

---

## 2. Anatomie d'un label

```html
<div class="zoran-label" data-id="GHUC-001" data-tier="μ0">
  <span class="z-label-tier">μ0</span>
  <span class="z-label-id">GHUC-001</span>
  <span class="z-label-title">Consolidation Scientifique</span>
</div>
```

### Styles cibles (CSS)

```css
.zoran-label {
  position: relative;
  pointer-events: auto;
  user-select: none;
  font-family: -apple-system, "Inter", sans-serif;
  font-size: 11px;
  line-height: 1.2;
  color: var(--fg-1);
  background: rgba(13, 16, 24, 0.78);
  backdrop-filter: blur(4px);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 3px 8px;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, -130%) scale(0.95);
  transform-origin: bottom center;
  transition: opacity 280ms ease-out, transform 280ms ease-out;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.zoran-label.visible {
  opacity: 1;
  transform: translate(-50%, -130%) scale(1.0);
}
.z-label-tier {
  color: var(--accent);
  font-weight: 600;
  font-size: 9px;
  margin-right: 4px;
  letter-spacing: 0.5px;
}
.z-label-id {
  color: var(--fg-0);
  font-family: ui-monospace, "JetBrains Mono", monospace;
  margin-right: 6px;
}
.z-label-title {
  color: var(--fg-2);
  font-size: 10px;
}

/* Paliers d'information selon classe */
.zoran-label.minimal .z-label-tier { display: none; }
.zoran-label.minimal .z-label-title { display: none; }
.zoran-label.tier   .z-label-title { display: none; }
```

---

## 3. Apparition

L'apparition est conditionnée par **deux signaux** combinés :

1. **Distance caméra → nœud** : projetée en `px` à l'écran.
2. **État de sélection** : si le nœud est sélectionné OU dans la branche
   visible, son label apparaît indépendamment de la distance.

Algorithme par frame (déboucé à 30 Hz, pas 60) :

```
for each node n:
    pos_2d = project(n.position, camera)
    if pos_2d.behind_camera or pos_2d.offscreen_margin > 60px:
        n.label.classList.remove('visible')
        continue
    d = distance(n.position, camera)
    if d > 200:           tier = 'none'
    elif d > 80:          tier = 'minimal'
    elif d > 30:          tier = 'tier'
    else:                 tier = 'full'

    if n.selected or n in branch_visible:
        tier = max(tier, 'full')

    apply tier class
    if tier != 'none': add 'visible'
    else: remove 'visible'
```

---

## 4. Anti-chevauchement (R-L3)

Quadtree 2D :

```
qt = Quadtree(screen_rect)
priority = (n.attractor_tier == 'μ0' ? 100 : 0)
         + (n.selected ? 50 : 0)
         + (n.attractor_tier == 'μ1' ? 30 : 0)
         + n.weight * 10

for n in nodes sorted by priority desc:
    bbox = label_bbox(n)
    if qt.intersects(bbox):
        hide(n.label)
    else:
        qt.insert(bbox)
        show(n.label)
```

Coût : O(N log N), exécuté à la fréquence de mise à jour des labels (30 Hz)
seulement quand la caméra bouge ou un nœud est sélectionné. Pas chaque
frame.

---

## 5. Tooltip enrichi sur hover

Quand le curseur survole une sphère :

```html
<div class="zoran-tooltip" role="tooltip">
  <div class="z-tt-title">GHUC-001 — Consolidation Scientifique</div>
  <div class="z-tt-meta">famille GHUC · μ0 · weight 1.00</div>
  <div class="z-tt-invariant">Invariant : préservation de I_struct sous compression</div>
  <div class="z-tt-hint">Clic pour ouvrir la loi</div>
</div>
```

Apparition : 400 ms après début hover, disparition immédiate à mouseout.
N'apparaît pas si le label complet est déjà visible (évite la redondance).

---

## 6. Accessibilité

- `<div class="zoran-label" aria-label="GHUC-001 — Consolidation
  Scientifique — famille GHUC, attracteur μ0">`
- `<div class="zoran-tooltip" role="tooltip" id="tt-{id}">` + le nœud sphère
  reçoit `aria-describedby="tt-{id}"` quand hover.
- Touche `Tab` : navigation au sein de l'index sidebar (déjà fonctionnel),
  pas dans le canvas 3D (qui n'est pas navigable au clavier — alternative
  via index latéral assurée).

---

## 7. Mobile

- `touchstart` sur sphère = équivalent hover (apparition tooltip 400 ms
  après début touch, masqué à touchend).
- `tap` court = clic.
- Désactivation `:hover` natif via media query `(hover: none)` pour éviter
  le pseudo-hover collant.

---

## 8. Non-buts

- ❌ texte 3D (TextGeometry) — coûteux et illisible à distance
- ❌ labels avec icônes décoratives
- ❌ labels colorés sauf via `.z-label-tier`
- ❌ label sur chaque nœud en permanence (cf. R-L1)

---

## 9. Performance

| coût | mesure |
|---|---|
| création de 45 `<div>` au boot | ~2 ms |
| projection 45 nœuds + classification tier | ~0.4 ms |
| anti-chevauchement quadtree (45 candidats) | ~0.6 ms |
| update CSS classes | ~0.3 ms |
| **total par frame** (30 Hz) | **~1.3 ms** |

Budget OK pour 60 FPS sur desktop. À tester sur mobile bas-de-gamme avec
un dégradé à 30 Hz si nécessaire.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515
TIMESTAMP:            2026-05-15T19:24:00+02:00
FILES_ANALYZED:       app/src/main.js, app/style.css, 3d-force-graph CDN
RISKS:                CSS2DRenderer + WebGLRenderer composite : z-order
                      des labels par rapport aux nœuds non garanti par défaut ;
                      mobile bas-de-gamme : layout reflow coûteux
S_LOCAL:              n/a (spec UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    label coloré → bruit ; label permanent → galaxie
NEXT_ACTIONS:         à l'exécution : injecter CSS2DRenderer dans 3d-force-graph
                      via .extraRenderers([new CSS2DRenderer()]) + nodeThreeObject
```

🔶
