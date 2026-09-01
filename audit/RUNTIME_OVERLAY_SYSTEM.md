# RUNTIME_OVERLAY_SYSTEM

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `GRAPH_RESPONSE_CONTINUITY.md`
- Source     : `app/style.css` (z-index declarations),
  `app/index.html` (DOM order)

## 1. Layered z-index stack

The runtime UI is a strict 6-layer stack. Each layer answers a
different need; none of them takes the whole viewport.

| layer | element | z-index | role |
|---|---|---|---|
| 0 | `#graph` (canvas) | 0 (implicit) | cognitive scene, always painted |
| 5 | `#sidebar` | 5 | navigation : legends, filters, lists |
| 10 | `#topbar` | 10 | global controls : search, mode toggles |
| 15 | `#chat-bar` | 15 | input modality, bottom-centered pill |
| 16 | `#chat-results` | 16 | response modality, draggable popup |
| 20 | `#detail` | 20 | law inspector, draggable panel |

The graph is the floor; `#detail` is the ceiling. Everything in
between is **frame chrome**, not a substitute for the scene.

## 2. Why each layer

- **0 — graph** : the cognitive substrate. Never hidden, never masked
  by an opaque rectangle. This is the mission's hard constraint.
- **5 — sidebar** : opaque but bounded (240 px wide). Coexists side-by-side
  with the graph.
- **10 — topbar** : 48 px tall, translucent. The graph is still visible
  through it thanks to `backdrop-filter: blur(6px)`.
- **15 — chat-bar** : a 32 px pill bottom-center. Holds focus for input
  but occupies almost no surface.
- **16 — chat-results** : sits *just above* the chat-bar so a popup
  drag never has to fight the bar for pointer events, *just below* the
  detail panel so opening a law from a route card raises a clear
  context above the popup.
- **20 — detail** : highest because it is the deepest read context
  (full law, all relations, all frames). Also draggable.

## 3. Backdrop blur preserves graph visibility

Every panel above z=0 uses `backdrop-filter: blur(N px)` with a
translucent `rgba(13,16,24,0.92)` background:

- `#topbar` : `blur(6px)`
- `#chat-bar` : `blur(10px)`
- `#chat-results` : `blur(10px)`

This is the technical answer to the mission constraint. The graph
**bleeds through** every overlay; the user never loses spatial
reference. No fade-to-black, no full-screen modal, no aggressive
animation. `visual_silence ≥ 0.90` is preserved by construction.

## 4. Invariants

| rule | enforcement |
|---|---|
| no layer ever fills the viewport | sizes capped (`max-height: calc(100vh - 220px)` on `#chat-results`) |
| no layer is opaque | all backgrounds use `rgba(..., 0.92)` |
| no layer disables graph rendering | `#graph` keeps its render loop regardless of overlay state |
| layer order is data-driven | z-index numbers reflect cognitive depth, not paint order accidents |
