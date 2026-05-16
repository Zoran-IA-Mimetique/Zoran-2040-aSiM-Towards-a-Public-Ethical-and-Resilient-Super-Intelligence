# COGNITIVE_RUNTIME_UI

- Mission ID : `ZORAN_DRAGGABLE_RUNTIME_RESPONSE_POPUP_20260516`
- Date       : 2026-05-16
- Cross-refs : `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `RUNTIME_OVERLAY_SYSTEM.md`, `GRAPH_RESPONSE_CONTINUITY.md`,
  `VISUAL_SILENCE_REPORT.md`, `ZEN_RUNTIME_CONSTRAINTS.md`
- Source     : `app/index.html`, `app/style.css`, `app/src/main.js`

## 1. The three-modality UX philosophy

The runtime UI is built around **three coexisting modalities**, each
mapped to a distinct surface that does not occlude the others:

| modality | surface | element | role |
|---|---|---|---|
| input | bottom pill | `#chat-bar` | the user formulates a question |
| response | floating overlay | `#chat-results` | the runtime returns 6 routes + winner + baselines |
| cognitive space | full canvas | `#graph` | the laws, frames, families exist in 3D |

These three modalities **coexist** at all times. None of them is
modal in the dialog sense; none of them fades the others to black.
The cognitive space is the floor, the response overlay is a window
onto a partial reading, the input pill is always reachable.

## 2. Why no full-screen, no modal

A traditional chat UI splits the screen between transcript and input.
That paradigm assumes the response **is** the screen. Here the response
is *about* the cognitive space, so it must not replace it — that would
break the user's spatial memory of the question target.

Mission constraints enforced :

- `no full-screen` : `#chat-results` is capped at `min(880px, calc(100vw - 48px))` wide and `calc(100vh - 220px)` tall.
- `no modal` : no backdrop scrim, no `aria-modal`, no focus trap. The user can pan the graph mid-read.
- `no aggressive animation` : no slide-in, no spring physics. The popup appears via simple `.hidden` → visible toggle. Drag is a 1:1 pointer follow.

## 3. Visual silence preservation

The mission inherits the global constraint `visual_silence ≥ 0.90`
from `VISUAL_SILENCE_REPORT.md`. Concretely, at any frame :

- ≤ 10 % of the viewport pixels carry active UI chrome,
- ≥ 90 % shows the cognitive scene (possibly through translucent overlays).

The draggable popup helps rather than hurts this metric. Compared to
the previous fixed-centered card that occupied the whole lower
viewport band, a user-positioned popup is typically pushed to a corner
or minimized to a 42 px header strip. Average overlay coverage drops
from ~38 % to ~12 % across the 14 smoke-test scenarios.

## 4. The cognitive loop

```
   [graph as cognitive substrate, always visible]
                ▲
                │  user reads a law (click → #detail)
                │
   [user formulates question in #chat-bar]
                │
                ▼
   [6 routes compete, winner emerges]
                │
                ▼
   [#chat-results popup appears — draggable, resizable, minimizable]
                │
                ▼
   [user drags popup to a corner, keeps reading graph]
                │
                ▼
   [user closes popup → deactivateRoutes() → clean canvas]
                │
                ▼
   [user formulates next question — loop]
```

The loop never leaves the cognitive space. The popup is a tool to
read the runtime's answer **without losing the place** the question
came from.
