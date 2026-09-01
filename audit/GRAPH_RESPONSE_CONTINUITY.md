# GRAPH_RESPONSE_CONTINUITY

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `RUNTIME_OVERLAY_SYSTEM.md`, `DRAGGABLE_PANEL_SYSTEM.md`
- Source     : `app/src/main.js` (`activateRoutes`, `deactivateRoutes`,
  `setupDraggableChatPopup`), `app/style.css`

## 1. The continuity contract

The mission identifies one dominant risk: **`rupture continuité graphe`**.
A user who asks a question and gets a popup that hides the scene loses
the cognitive context that motivated the question. The contract:

1. The graph canvas is **never** hidden, blurred to opacity, or covered
   by a full-viewport surface.
2. The graph remains **interactive** — pan, rotate, zoom, node click —
   while the popup is open.
3. Pointer events on the popup do **not** leak to the canvas below
   and vice-versa.
4. Closing the popup also calls `deactivateRoutes()`, restoring the
   graph to its pre-question colour state.

## 2. How event isolation works

Both `#chat-bar` and `#chat-results` have **bounded** bounding rects.
Outside those rects, pointer events reach `#graph` natively — there is
no transparent overlay catching them. Inside the popup, pointer events
are consumed by the popup's own handlers:

- header drag : `header.setPointerCapture(e.pointerId)` so the drag
  cannot escape into the canvas.
- body scroll : `overflow-y: auto` on `#chat-results-body`; wheel
  events scroll the card list, not the camera.
- resize : native CSS `resize: both` handle in the bottom-right; the
  browser handles pointer capture for the resize gesture.

The popup's `userSelect = 'none'` during drag only affects text
selection — it does not block other event listeners.

## 3. What the user can do simultaneously

| action | works while popup is open |
|---|---|
| rotate graph | yes (drag on empty canvas zone) |
| zoom graph | yes (wheel on canvas zone) |
| click a node | yes (opens `#detail` at z=20, *above* popup) |
| pan camera | yes |
| read route cards | yes (popup body scrolls independently) |
| drag popup | yes (header pointer-captured) |
| resize popup | yes (native handle) |
| submit new question | yes (chat-bar always live, popup re-renders in place) |

## 4. The `deactivateRoutes()` close hook

When the user clicks `×` on the popup, two things happen in order:

1. The popup gets `.hidden` (CSS `display: none`).
2. `deactivateRoutes()` walks `state.meshes`, restores
   `userData.zoranOrigColor` on every material, clears `emissive`,
   drops `state.activeRoutes`, and triggers `state.fg.refresh()`.

Result: the graph returns to its baseline appearance. No half-state
where coloured route edges linger after the response is dismissed.
The user can immediately ask another question with a clean canvas.

## 5. Anti-regressions

| regression | guard |
|---|---|
| popup steals scroll from canvas | `overflow-y` scoped to `#chat-results-body` |
| popup catches a stray click meant for a node | popup z=16 is below `#detail` z=20; nodes still receive their own pointer events outside popup rect |
| close button accidentally triggers drag | `if (e.target.id === 'chat-results-close' \|\| ...) return;` in `pointerdown` |
| graph stops rendering when popup is open | `#graph` render loop is independent of DOM panel state |
