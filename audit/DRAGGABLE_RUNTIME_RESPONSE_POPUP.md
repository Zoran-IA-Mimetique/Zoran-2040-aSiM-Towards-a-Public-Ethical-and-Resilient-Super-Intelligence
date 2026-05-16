# DRAGGABLE_RUNTIME_RESPONSE_POPUP

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_PANEL_SYSTEM.md`, `MULTI_ROUTE_RUNTIME_SYSTEM.md`,
  `RUNTIME_OVERLAY_SYSTEM.md`
- Source     : `app/src/main.js#setupDraggableChatPopup`,
  `app/style.css` (`#chat-results*`), `app/index.html` (`#chat-results`)

## 1. Problem statement

The runtime response panel (`#chat-results`) previously rendered as a
fixed-centered card occupying most of the lower viewport: 6 route cards,
1 winner, 2 baselines. While useful, it created a **graph continuity
break** — the user lost the cognitive scene every time a question ran.

Mission constraint: **`popup ne doit PAS remplacer le graphe`**. The
3D graph must remain visible and manipulable at all times during
response reading.

## 2. The 6 popup functions

| function | implementation | persistence |
|---|---|---|
| draggable | `pointerdown` on `#chat-results-header` captures pointer, `pointermove` updates `left/top` with viewport bounds | `zoran.chat.pos` |
| resizable | CSS `resize: both` native handle, `min-width:360px`, `min-height:80px` | `zoran.chat.pos` (w/h merged) |
| minimizable | injected `–`/`+` button toggles `.minimized` → height forced to 42 px, `#chat-results-body` hidden | `zoran.chat.min` |
| closable | `#chat-results-close` adds `.hidden` and calls `deactivateRoutes()` to clear graph overlay | — |
| position persisted | `localStorage` round-trip on every drag-end and resize tick | both keys above |
| multitask coexistence | popup does not block graph pointer events outside its bounding box (see `GRAPH_RESPONSE_CONTINUITY.md`) | — |

## 3. Pipeline

```
chat-bar submit
   → compete(question, nodes)     // 6 strategies + 2 baselines
   → activateRoutes(routes)       // graph overlay
   → renderRouteCards(popup)      // 6 cards + winner + baselines
   → popup.classList.remove('hidden')
   → popup.dispatchEvent('zoran-show')  // restores saved pos/size/min
```

The graph keeps running its render loop during all of the above. No
modal mask, no `display:none` on `#graph`, no pointer capture outside
the popup's own bounding rect.

## 4. Verified behaviour

| smoke test | result |
|---|---|
| `popup_draggable` (dx > 50 px after manual drag) | true |
| `popup_minimize` (`classList.contains('minimized')` after click) | true |
| `chat_routes_compete` (6 routes rendered) | true |
| `route_viz_in_graph` (graph live during popup interaction) | true |
| FPS during drag + graph rotate | stable |
| total suite | 14/14 vert |
