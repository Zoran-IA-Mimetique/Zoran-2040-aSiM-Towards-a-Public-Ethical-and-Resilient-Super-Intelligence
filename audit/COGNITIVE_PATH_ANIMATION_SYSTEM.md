# COGNITIVE PATH ANIMATION SYSTEM

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `LIVE_RUNTIME_MODE.md`, `WINNER_ROUTE_VISUALIZATION.md`,
  `RUNTIME_GRAPH_ANIMATION.md`
- Source     : `app/src/main.js` (`tickAnimation`, `applyRouteVisualization`)

## 1. Why this exists

Once the path competition has settled and `activateRoutes()` has tinted
the meshes, the graph is still static. To answer the implicit user
question — *"so which route actually won?"* — we attach a single
animated signal to winner-route members. The constraint inherited from
the parent mission is `visual_silence` : the animation must be
**sober, slow, stable**. No strobe, no rainbow, no video-game cue.
Just enough motion that the eye lands on the winner before reading the
popup.

## 2. Pulse specification

A single sinusoidal modulation of `material.emissiveIntensity` :

```
emissiveIntensity(t) = 0.20 + sin(t · 1.5 · 2π) · 0.10
```

| Parameter        | Value     | Justification                                 |
|------------------|-----------|-----------------------------------------------|
| Frequency        | `1.5 Hz`  | Slow enough to read as breathing, fast enough to be perceived as alive. |
| Amplitude        | `±0.10`   | Stays under perceptual flicker threshold even on bright displays. |
| Base intensity   | `0.20`    | Identical to the static value set in `applyRouteVisualization` so activation is seamless. |
| Range            | `[0.10, 0.30]` | Never crosses zero (no apparent on/off blink) and never saturates. |
| Color            | route hex | Winner's strategy color from `ROUTE_COLORS`. |

Non-winner survivor members carry a **flat** emissive at `0.08` and
are explicitly excluded from the pulse (`zoranWinnerPulse = false`).
Eliminated members carry emissive `0`.

## 3. Implementation in `tickAnimation`

The animation runs inside the existing `requestAnimationFrame` loop —
no second loop is allocated for this mission.

```
function tickAnimation() {
  const t = performance.now() * 0.001;
  const winnerPulse = 0.20 + Math.sin(t * 1.5 * Math.PI * 2) * 0.10;
  for (const [id, mesh] of state.meshes.entries()) {
    // ... opacity lerp, hover scale lerp ...
    if (mesh.userData.zoranWinnerPulse && mesh.material && mesh.material.emissive) {
      mesh.material.emissiveIntensity = winnerPulse;
    }
  }
  updateHalos();
  requestAnimationFrame(tickAnimation);
}
```

Three properties of this design :

- **gated** — when `state.routeMode === false` no mesh carries
  `zoranWinnerPulse`, so the inner branch is never taken;
- **shared clock** — the global `t` is computed once per frame and
  reused for every winner mesh, guaranteeing all winner-route nodes
  pulse in phase;
- **idempotent** — overwriting `emissiveIntensity` each frame replaces
  whatever value an earlier subsystem may have set, so no per-mesh
  reset bookkeeping is required.

## 4. Why no easing / no second animation

Halos, hover-scale lerp, and route winner pulse share the same tick.
Any additional animation (camera shake, edge particles for winner,
node bloom) was explicitly rejected for this mission to honor the
visual silence contract. The animation contract is one line and one
sinusoid. If future missions need extra motion they add a new
`userData` flag, not a new global loop.
