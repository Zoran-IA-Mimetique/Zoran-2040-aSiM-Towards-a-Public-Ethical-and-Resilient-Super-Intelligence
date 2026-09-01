# REALTIME ROUTE VISUALIZATION ENGINE

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`, `MULTI_ROUTE_RUNTIME_SYSTEM.md`,
  `COGNITIVE_PATH_ANIMATION_SYSTEM.md`, `LIVE_RUNTIME_MODE.md`
- Source     : `app/src/main.js` (sections `activateRoutes`,
  `applyRouteVisualization`, `deactivateRoutes`, `linkColor`, `tickAnimation`)

## 1. Why this exists

The sibling mission `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE` computes
six cognitive routes when a user submits a question via the chat bar.
Until this mission, the result lived **only** in the popup card. The
graph stayed inert. This engine pushes the competition outcome **into
the 3D graph itself** so the user sees, in the same view, which laws
each strategy retained, which route won, and which routes the Oracle
eliminated. The constraint is `visual_silence` : sober, slow, stable —
not a video-game.

## 2. Color palette

Six fixed colors, one per strategy. Order matches `STRATEGIES` in
`app/src/chat.js`.

| Strategy            | Hex     | CSS        | Tone   |
|---------------------|---------|------------|--------|
| `frugale`           | 0x3ad17a | `#3ad17a` | vert   |
| `anti_hallucination`| 0xff6b6b | `#ff6b6b` | rouge  |
| `runtime_rapide`    | 0x4dd6ff | `#4dd6ff` | cyan   |
| `propagation_forte` | 0xb86bff | `#b86bff` | violet |
| `temporal_survival` | 0xff9c2e | `#ff9c2e` | orange |
| `structurelle`      | 0x4ea3ff | `#4ea3ff` | bleu   |

Defined once in `ROUTE_COLORS` (main.js). Unknown strategies fall back
to `0xcccccc` via `routeColorOf()`. The palette stays constant across
sessions so users build muscle memory.

## 3. Tint blend formula

For each node belonging to a route, the original mesh color is blended
toward the route color at **55 %** in linear RGB :

```
final = orig.lerp(routeColor, 0.55)
```

55 % is enough that the route color dominates perception while the
original family/role color stays readable underneath. A 100 % replace
would erase the structural identity of the node; below 40 % the route
becomes invisible against multi-color families. The blend is applied
exactly once per activation; the per-frame loop only modulates
emissive intensity (see `COGNITIVE_PATH_ANIMATION_SYSTEM.md`).

When a node belongs to **multiple** routes, the dominant route is
selected by `applyRouteVisualization()` :

```
dominant = winner_route || argmax(strength) where strength = max(0.3, selection_score)
```

## 4. Activation / deactivation lifecycle

```
chat submit (chat.js : submit())
   │
   ▼
compete(q, nodes)         ── returns { routes, baselines, winner }
   │
   ▼
activateRoutes(result)    ── main.js
   ├── build state.activeRoutes : Map<route_id, { color, laws:Set, edges:Set,
   │                                              eliminated, winner, rank, strength }>
   ├── for each link : tag membership when source & target ∈ route.laws
   ├── cap : top 6 routes by selection_score
   ├── set state.routeMode = true
   └── applyRouteVisualization()
         ├── save mesh.userData.zoranOrigColor (once)
         ├── tint involved meshes (55 % lerp)
         ├── set emissive on winner-route members, flag zoranWinnerPulse
         ├── soft glow (0.08) on non-winner survivor members
         ├── eliminated members : opacity 0.30
         └── non-involved nodes : opacity 0.12, emissive 0

popup close (chat-results-close button)
   │
   ▼
deactivateRoutes()
   ├── restore zoranOrigColor on every mesh
   ├── clear emissive, drop zoranWinnerPulse flag
   ├── state.activeRoutes = null
   ├── state.routeMode = false
   └── recomputeOpacityTargets() + fg.refresh()
```

The cycle is fully reversible — no leak into the persistent graph
state, no localStorage entry. Closing the popup is the single exit
point.
