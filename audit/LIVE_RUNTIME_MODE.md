# LIVE RUNTIME MODE

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `RUNTIME_GRAPH_ANIMATION.md`

## 1. The `state.routeMode` flag

`state.routeMode` is a boolean lifted into the global graph state
object in `app/src/main.js`. It encodes a single question : **is the
graph currently displaying a path competition result?** The flag is
toggled exclusively by the route lifecycle :

| Transition | Site                                | Effect                  |
|------------|-------------------------------------|-------------------------|
| `false → true`  | `activateRoutes(result)`        | enables route rendering |
| `true → false`  | `deactivateRoutes()`            | restores baseline graph |

The flag is read by the rendering pipeline as a fast gate. The
authoritative data lives in `state.activeRoutes` (the `Map` built by
`activateRoutes`); `state.routeMode` exists so other modules can ask
the cheap question "should I act differently right now?" without
walking the map.

## 2. How it modifies graph rendering

When `state.routeMode === true` (equivalently `state.activeRoutes !==
null`) the following overrides take effect in `initGraph()` accessors :

- **`linkColor(l)`** — branch enters route-mode path : iterate
  `state.activeRoutes`, pick winner edge color > any active route
  color > grey `rgba(120,130,150,0.10)` for eliminated-only > grey
  `rgba(120,130,150,0.02)` for unaffiliated edges.
- **`linkWidth(l)`** — winner edge `2.2`, normal route edge `1.0`,
  eliminated route edge `0.3`, unaffiliated edge `0.2`.
- **Node tint** — mesh color is the 55 % blend computed once at
  activation (see `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`).
- **Opacity targets** — overridden via `state.targetOpacity` :
  involved survivor `1.0`, eliminated member `0.30`, non-involved
  `0.12`. The per-frame lerp in `tickAnimation()` carries the
  transition at `0.18` ease-in factor.
- **Emissive** — winner-route members carry `zoranWinnerPulse = true`,
  picked up by the animation tick.

## 3. Entry and exit conditions

**Entry** — a single trigger : the user submits a question and the
chat module calls back into `main.js` with the competition result.

```
chat.js : submit() ──► onCompete(result) ──► activateRoutes(result)
```

**Exit** — a single trigger : the user closes the response popup.
`main.js : setupDraggableChatPopup()` wires the close button :

```
closeBtn.addEventListener('click', () => {
  if (typeof deactivateRoutes === 'function') deactivateRoutes();
});
```

There is no timeout, no auto-exit on idle, no exit on background
click. The user is in control of when the runtime view disappears.
A subsequent question simply rebuilds the registry — `activateRoutes`
overwrites `state.activeRoutes` and re-applies the visualization.

## 4. Persistence — none

`state.routeMode` is **runtime only**. It is not written to
`localStorage`, not encoded into a URL fragment, not echoed into
`state.lastAudit`. A page reload always returns to the inert graph.
This is deliberate :

- the competition result is cheap to recompute (`compete()` is
  synchronous, sub-100 ms on the demo dataset);
- persisting visual route state across reloads would create stale
  views that don't match what the user just typed;
- the mission `visual_silence` constraint favours quiet defaults — the
  graph should not boot into an alarming colored state.

The only persistent side-effect during the live session is the
`mesh.userData.zoranOrigColor` snapshot, which is needed to make
`deactivateRoutes()` a clean inverse. That snapshot is kept until the
mesh is disposed, but never serialized.
