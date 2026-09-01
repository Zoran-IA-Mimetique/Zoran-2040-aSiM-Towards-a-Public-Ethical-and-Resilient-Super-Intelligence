# RUNTIME GRAPH ANIMATION

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `COGNITIVE_PATH_ANIMATION_SYSTEM.md`,
  `LIVE_RUNTIME_MODE.md`
- Source     : `app/src/main.js` (`tickAnimation`, `initGraph`,
  `applyRouteVisualization`)

## 1. FPS budget

The graph runs on a single `requestAnimationFrame` loop driven by
`tickAnimation`. The target is **60 FPS sustained** on the demo
dataset (~600 nodes, ~1500 edges) in a desktop browser. The smoke
test that ships with the mission asserts FPS remains ≥ 60 during
route activation and the subsequent pulse cycle.

Per-frame work in `tickAnimation` :

| Work item                      | Cost order        | Gated by                |
|--------------------------------|-------------------|-------------------------|
| Opacity lerp (all meshes)      | O(N) meshes       | always on               |
| Hover-scale lerp (all meshes)  | O(N) meshes       | always on               |
| Winner pulse emissive update   | O(W) winner nodes | `zoranWinnerPulse`      |
| `updateHalos()` (rings + faceing) | O(N) meshes    | always on               |
| Link color / width recompute   | O(E) edges        | force-graph internal    |

`W ≤ 10` (winner route picks K = 10 laws), so the pulse term is
negligible at any realistic N.

## 2. Cost when route mode is inactive — zero

`state.routeMode === false` and `state.activeRoutes === null` is the
default. In that state :

- `tickAnimation` : the winner-pulse branch is guarded by
  `mesh.userData.zoranWinnerPulse` ; no mesh carries the flag so the
  inner block never executes.
- `linkColor` / `linkWidth` : the first conditional is
  `if (state.activeRoutes) { … }`. Falsy short-circuit returns
  immediately to the pre-mission accessor path. No allocation, no
  loop, no map walk.
- `applyRouteVisualization` is not called by any other code path.

Net runtime impact of the mission when no question has been submitted
: **0 cost**. A reload returns to the inert baseline.

## 3. Cost when route mode is active — minor and bounded

With routes active the renderer adds :

- One mesh-iteration that evaluates `zoranWinnerPulse` and writes
  `emissiveIntensity` (1 sin call shared across all winner meshes).
- For every edge that the force-graph requests color/width for, a
  walk through `state.activeRoutes` (≤ 6 entries) with an early
  `break` on winner match.

All extra work is bounded by constants (6 routes, ~10 laws per
winner) or amortized over the existing per-frame loop. Smoke test
confirmed during the mission shows :

| Metric (route mode ON, 600 nodes / 1500 edges) | Result |
|-------------------------------------------------|--------|
| Glowing meshes count                            | > 0    |
| Dimmed meshes (`targetOpacity ≤ 0.12`)          | > 100  |
| Sustained FPS                                   | ≥ 60   |
| Popup interaction (drag / resize) latency       | unaffected |

## 4. Why no second loop, no GPU shader work

This mission deliberately reuses the existing animation loop, the
existing `material.emissive`, and the existing force-graph color
accessors. No new uniform, no new shader chunk, no per-vertex
attribute. Three reasons :

- the visual silence constraint caps the amount of motion that should
  be added — a richer effect would also need more code paths to mute;
- reusing the lerp loop keeps state coherent across hover, selection,
  branch visibility and route mode without coordination logic;
- the cost profile stays predictable when future missions stack
  another visualization on top — they can plug into the same loop
  rather than spawn a parallel one.
