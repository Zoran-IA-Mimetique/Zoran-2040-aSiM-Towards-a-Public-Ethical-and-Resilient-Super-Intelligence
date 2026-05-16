# MULTI ROUTE PROPAGATION RENDERER

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `WINNER_ROUTE_VISUALIZATION.md`,
  `ORACLE_ELIMINATION_VISUALS.md`,
  `LIVE_RUNTIME_MODE.md`
- Source     : `app/src/main.js` (`activateRoutes`,
  `applyRouteVisualization`, `linkColor`, `linkWidth`)

## 1. Data model

After `activateRoutes(result)` two derived structures coexist :

- **`state.activeRoutes`** — `Map<route_id, { color, laws:Set,
  edges:Set, eliminated, winner, rank, strength }>` capped at the top
  6 routes ranked by `selection_score`. Edge sets are precomputed
  once at activation by scanning `state.graphView.links` for
  `source ∈ laws ∧ target ∈ laws`.
- **`nodeRoutes`** — local to `applyRouteVisualization`, inverts the
  map to `Map<law_id, route[]>` so per-mesh dominance can be picked in
  O(routes) rather than O(routes × laws).

Together they let every renderer accessor answer **two questions in
constant time** : "is this entity in any route?" and "which route
should dominate visually?".

## 2. Per-edge resolution

`linkColor` and `linkWidth` walk `state.activeRoutes` in insertion
order — which equals descending `selection_score` because
`activateRoutes` sorts before inserting. The walk applies a fixed
priority :

```
winnerColor   > any active route color  > eliminated-only grey  > dust
2.2 (winner)  > 1.0 (survivor route)    > 0.3 (eliminated only)  > 0.2
```

The `break` on winner match is the only short-circuit ; otherwise the
loop completes so an edge claimed by both a survivor and an
eliminated route picks the survivor's color, never the eliminated
grey. This is what makes elimination a **local** signal — it never
contaminates surviving propagation paths.

## 3. Per-node dominance via `nodeRoutes`

```
for route in state.activeRoutes:
  for lawId in route.laws:
    nodeRoutes[lawId].push(route)

for mesh in state.meshes:
  involved = nodeRoutes[mesh.id]
  if involved:
    dom = involved.find(r => r.winner)
       || involved.reduce((a, b) => a.strength >= b.strength ? a : b)
    tint(mesh, dom.color, 0.55)
    if dom.winner: emissive=dom.color, intensity=0.20, pulse=true
    elif dom.eliminated: emissive=dom.color, intensity=0.0
    else: emissive=dom.color, intensity=0.08
    targetOpacity = dom.eliminated ? 0.30 : 1.0
  else:
    restore orig color, kill emissive, targetOpacity = 0.12
```

`strength` is `max(0.3, route.selection_score)` — the floor avoids
zero-strength ties on very weak routes. Winner trumps strength so a
winning route with a marginal score still owns its members visually.

## 4. Cap and invariants

- **Hard cap : 6 routes**. `activateRoutes` slices the sorted list at
  6 before building the map. Even though `STRATEGIES` defines exactly
  6 entries today, the cap protects the renderer if future missions
  add more strategies — color allocation, tint blending and edge
  enumeration all stay bounded.
- **Single dominance per node, per edge**. No multi-color stippling,
  no gradient shading, no concentric rings. The mission constraint
  `visual_silence` forbids multi-route superpositions that would
  produce noise.
- **Idempotent re-activation**. Submitting a second question
  overwrites `state.activeRoutes` and re-runs
  `applyRouteVisualization()` ; `zoranOrigColor` is only captured
  when absent, so re-tints always blend from the true original, not
  from the previous route color.
