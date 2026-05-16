# DRAGGABLE PANEL SYSTEM

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec + exec autorisée

Le panneau de loi devient **déplaçable à la main**, ne masque plus
brutalement le graphe, préserve la continuité spatiale.

---

## 1. Modèle de panneau

| propriété | valeur |
|---|---|
| `position` | `fixed` (déjà), positionné par `top`/`left` au lieu de `right` |
| largeur | 380 px desktop, `min(380, 100vw - 24)` mobile |
| max-height | `calc(100vh - 100px)` |
| z-index | 20 |
| backdrop-filter | conservé (blur 8px) — assure lisibilité sur graphe |
| draggable via | header explicite (drag handle) |

---

## 2. Structure DOM

```html
<section id="detail" class="hidden" aria-hidden="true">
  <header id="detail-header" class="drag-handle" title="Glisser pour déplacer">
    <span id="detail-handle">⋮⋮</span>
    <span id="detail-title-mini"></span>
    <button id="detail-close" title="Fermer (Esc)">×</button>
  </header>
  <div id="detail-body"></div>
</section>
```

- `#detail-header` est la **seule** zone draggable.
- `#detail-handle` (icône ⋮⋮) signale visuellement la draggabilité.
- `#detail-title-mini` reproduit le titre court (id) pour identifier vite
  le panneau pendant le drag.

---

## 3. Comportement drag

### 3.1 Pointer events (souris + tactile unifiés)

```js
let dragging = false;
let startX, startY, startLeft, startTop;

const header = $('#detail-header');
const panel = $('#detail');

header.addEventListener('pointerdown', e => {
  if (e.target.id === 'detail-close') return;
  dragging = true;
  header.setPointerCapture(e.pointerId);
  const rect = panel.getBoundingClientRect();
  startX = e.clientX; startY = e.clientY;
  startLeft = rect.left; startTop = rect.top;
  panel.style.transition = 'none';
  document.body.style.userSelect = 'none';
});

window.addEventListener('pointermove', e => {
  if (!dragging) return;
  let left = startLeft + (e.clientX - startX);
  let top  = startTop  + (e.clientY - startY);
  // Contraintes viewport
  left = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth, left));
  top  = Math.max(48, Math.min(window.innerHeight - 100, top));
  panel.style.left  = left + 'px';
  panel.style.top   = top  + 'px';
  panel.style.right = 'auto';
});

window.addEventListener('pointerup', e => {
  if (!dragging) return;
  dragging = false;
  document.body.style.userSelect = '';
  // Persist
  const rect = panel.getBoundingClientRect();
  localStorage.setItem('zoran.panel.pos',
    JSON.stringify({ left: rect.left, top: rect.top }));
});
```

### 3.2 Restauration au boot

```js
function restorePanelPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem('zoran.panel.pos') || 'null');
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      const left = Math.max(0, Math.min(window.innerWidth - 380, saved.left));
      const top  = Math.max(48, Math.min(window.innerHeight - 200, saved.top));
      panel.style.left = left + 'px';
      panel.style.top  = top  + 'px';
      panel.style.right = 'auto';
    }
  } catch (_) { /* ignore */ }
}
```

### 3.3 Reset position

Touche `Shift + R` ou clic-droit sur le handle → position par défaut
(coin haut-droit, comme aujourd'hui).

---

## 4. Aspect visuel

### Header

```css
#detail-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  cursor: grab;
  user-select: none;
  background: linear-gradient(180deg, rgba(20,24,38,0.95), rgba(13,16,24,0.85));
}
#detail-header:active { cursor: grabbing; }
#detail-handle {
  color: var(--fg-2);
  font-family: monospace;
  letter-spacing: -2px;
}
#detail-title-mini {
  flex: 1;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--fg-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#detail-close {
  position: static; /* override absolute existant */
  width: 28px; height: 28px;
  /* … */
}
```

---

## 5. Continuité spatiale

| règle | énoncé |
|---|---|
| R-D1 | jamais de backdrop opaque derrière le panneau |
| R-D2 | le graphe reste interactif (rotate/zoom) avec le panneau ouvert |
| R-D3 | le panneau ne capte pas les événements de scroll/wheel destinés au canvas |
| R-D4 | si la fenêtre est redimensionnée, recontraindre la position |

---

## 6. Mobile (viewport ≤ 720px)

Bottom-sheet **non-draggable** :
- s'attache au bas de l'écran.
- glisser vers le bas = fermer (swipe-to-dismiss).
- pas de positionnement libre (pas pertinent sur écran étroit).
- le drag reste actif sur desktop.

```css
@media (max-width: 720px) {
  #detail {
    left: 0 !important;
    top: auto !important;
    bottom: 28px;
    right: 0;
    width: 100vw;
    max-height: 50vh;
    border-radius: 12px 12px 0 0;
  }
  #detail-header { cursor: default; }
}
```

---

## 7. Accessibilité

- `role="dialog"` sur `#detail`.
- `aria-labelledby="detail-title-mini"` quand actif.
- `tabindex="0"` sur le header (focus clavier).
- `Enter` ou `Space` quand focus sur header + flèches = déplacement
  pas-à-pas (stretch P0.6, hors scope V2).

---

## 8. Anti-régressions

| comportement | preuve |
|---|---|
| `Esc` ferme | conservé |
| clic background graphe ferme | conservé |
| navigation interne (relations) → conserve la position | localStorage relu seulement au boot |
| pruning P avec panneau ouvert → panneau reste là | OK |
| recherche Enter → navigue + repositionne contenu, pas le panneau | OK |

---

## 9. Tests d'acceptation

| test | critère |
|---|---|
| TD1 — drag desktop | maintenir clic sur header → panneau suit le curseur |
| TD2 — relâche | position conservée |
| TD3 — bornes viewport | impossible de sortir hors écran |
| TD4 — persistance | recharger la page → position préservée |
| TD5 — clic × | ferme normalement, ne déplace pas |
| TD6 — graphe interactif derrière | rotation/zoom fonctionnent avec panneau ouvert |
| TD7 — mobile bottom-sheet | swipe down ferme |
| TD8 — Shift+R | reset position |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_MODIFIED:       app/index.html (header + handle),
                      app/style.css (drag styles),
                      app/src/main.js (pointer events + persistence),
                      app/src/panel.js (set #detail-title-mini)
RISKS:                drag heurte les forces du graphe si le canvas
                      reçoit pointermove pendant drag (à isoler avec
                      pointer capture) ;
                      localStorage corrompu → guard try/catch
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    drag via hack mousedown global → utiliser pointer
                      capture pour isolation propre
NEXT_ACTIONS:         exec immédiate dans main.js + ajouts CSS/HTML
```

🔶
