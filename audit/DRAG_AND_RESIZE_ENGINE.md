# DRAG_AND_RESIZE_ENGINE

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `DRAGGABLE_PANEL_SYSTEM.md`, `GRAPH_RESPONSE_CONTINUITY.md`
- Source     : `app/src/main.js#setupDraggableChatPopup`
  (lines 945–1057), `app/style.css` (`#chat-results`, `#chat-results.minimized`)

## 1. Drag engine — pointer-captured 1:1 follow

The drag is intentionally trivial: no inertia, no easing, no snap.
Mission constraint `no aggressive animation` rules out anything fancy.

```js
header.addEventListener('pointerdown', e => {
  if (e.target.id === 'chat-results-close' ||
      e.target.id === 'chat-results-min') return;
  dragging = true;
  header.setPointerCapture(e.pointerId);
  const rect = popup.getBoundingClientRect();
  startX = e.clientX; startY = e.clientY;
  startLeft = rect.left; startTop = rect.top;
  popup.style.transform = 'none';   // kill the centering translateX(-50%)
  popup.style.transition = 'none';
});
```

Three notable details :

- `setPointerCapture` keeps the drag alive even if the cursor leaves
  the header during fast motion, and prevents leakage into `#graph`.
- The initial `transform: none` overrides the CSS centering rule
  (`transform: translateX(-50%)`) once and for all — without this the
  computed `left` would be wrong on subsequent drags.
- Both close and minimize button clicks are filtered before drag
  capture, so the user never accidentally drags the popup while
  trying to close it.

## 2. Bounds clamping

`pointermove` computes the next position and **clamps** it so the
popup can never leave the viewport in an unrecoverable way :

```js
left = Math.max(0, Math.min(window.innerWidth  - 80,  left));
top  = Math.max(48, Math.min(window.innerHeight - 60, top));
popup.style.left   = left + 'px';
popup.style.top    = top  + 'px';
popup.style.bottom = 'auto';
popup.style.right  = 'auto';
```

| edge | clamp | rationale |
|---|---|---|
| left | `≥ 0` and `≤ innerWidth - 80` | always 80 px of popup visible on the right |
| top  | `≥ 48` and `≤ innerHeight - 60` | header stays below `#topbar` (48 px) and above the bottom `#chat-bar` zone |

The 80 px / 60 px reserves guarantee the user can always grab the
header to drag the popup back, even if they pushed it half off-screen.

## 3. Persistence — localStorage round-trip

On `pointerup`, the current rect is serialized to
`zoran.chat.pos` :

```js
localStorage.setItem('zoran.chat.pos', JSON.stringify({
  left: rect.left, top: rect.top,
  w: popup.offsetWidth, h: popup.offsetHeight,
}));
```

On first show after page reload, the `zoran-show` custom event
restores it, re-applying the same bounds clamp so a previous session's
position remains valid even if the viewport shrunk.

Minimize state lives in a separate key `zoran.chat.min` (`'0'` or
`'1'`), restored on the same `zoran-show` event.

## 4. Resize engine — native CSS + ResizeObserver

Resizing is delegated entirely to the browser :

```css
#chat-results {
  resize: both;
  min-width: 360px;
  min-height: 80px;
  overflow: hidden;
}
#chat-results.minimized { resize: none; }   /* lock when minimized */
```

The browser draws and handles the bottom-right grip. A
`ResizeObserver` watches the popup and merges the new `w/h` into
the saved position object on every tick :

```js
const ro = new ResizeObserver(() => {
  if (popup.classList.contains('hidden')) return;
  const saved = JSON.parse(localStorage.getItem('zoran.chat.pos') || '{}');
  localStorage.setItem('zoran.chat.pos', JSON.stringify({
    ...saved, w: popup.offsetWidth, h: popup.offsetHeight,
  }));
});
ro.observe(popup);
```

The observer is no-op while `.hidden` is on the popup, so a closed
popup does not pollute storage with stale dimensions.
