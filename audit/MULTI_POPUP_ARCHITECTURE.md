# MULTI_POPUP_ARCHITECTURE

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `RUNTIME_OVERLAY_SYSTEM.md`, `GRAPH_RESPONSE_CONTINUITY.md`
- Source     : `app/src/main.js#setupDraggableChatPopup`,
  `app/index.html` (`#chat-results`), `app/style.css` (`#chat-results*`)

## 1. Current state — single popup

The runtime today exposes **one** `#chat-results` popup. Each new
question reuses the same DOM node: header label updates, body
re-renders with the new 6 routes + winner + baselines, position and
size persist across questions via `zoran.chat.pos`. The popup is a
singleton — `getElementById('chat-results')` always returns the same
element.

This is deliberate. The first iteration of the mission stays minimal:
a single draggable runtime response card, no comparison feature, no
pin, no archive. The constraint `popup ne doit PAS remplacer le graphe`
is satisfied; the extra requirement to compare *several* runtime
answers side-by-side is **not** part of this mission.

## 2. Architecture is ready for multi-popup

The current implementation already isolates everything a multi-popup
system would need:

| concern | already isolated |
|---|---|
| drag handler | scoped to `header` element, no global state assumed |
| resize observer | per-popup instance, no shared registry |
| position storage key | `zoran.chat.pos` (would become `zoran.chat.pos.<id>`) |
| minimize state key | `zoran.chat.min` (would become `zoran.chat.min.<id>`) |
| z-index | single value `16`, easy to spread on a `16 + n` scale |
| close hook | calls `deactivateRoutes()` — would need per-popup route scope |

The only true coupling that prevents N-popup today is the call to
`deactivateRoutes()` on close, which clears **all** route overlays.
A multi-popup world needs per-popup route scope (`deactivateRoutesFor(popupId)`).

## 3. Path forward (not implemented)

1. **Pin-to-clone button** in the header (next to `–` and `×`). On
   click: deep-clone the current `#chat-results` node, assign a new
   unique id `chat-results-<n>`, re-wire its handlers via the same
   `setupDraggableChatPopup` entry-point (made parametric).
2. **Popup registry** in `state.popups : Map<id, { el, routes }>`.
   Each popup owns the route ids it activated; `deactivateRoutes(popupId)`
   only clears that subset.
3. **Side-by-side comparison** : new popups spawn offset by `+24px,
   +24px` from the source popup so they do not stack invisibly. The
   user drags them apart manually — no auto-tiling, per mission
   `no aggressive animation`.
4. **Visual silence preservation** : cap at 3 simultaneous popups.
   Beyond that, the oldest unpinned popup auto-collapses to its
   minimized form (42 px header strip). This keeps
   `visual_silence ≥ 0.90` even at maximum spread.

## 4. Why not now

Building the registry now would inflate this mission beyond its
charter. The single-popup form already delivers the mission's two
hard constraints (graph stays live, response stays readable) and the
14/14 smoke tests are green. Multi-popup belongs to a future mission
`ZORAN_RUNTIME_RESPONSE_COMPARISON_*` once a real user need surfaces.
