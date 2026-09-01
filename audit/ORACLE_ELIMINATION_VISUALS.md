# ORACLE ELIMINATION VISUALS

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `WINNER_ROUTE_VISUALIZATION.md`,
  `MULTI_ROUTE_PROPAGATION_RENDERER.md`
- Source     : `app/src/chat.js` (`oracleEliminate`),
  `app/src/main.js` (`applyRouteVisualization`, `linkColor`, `linkWidth`)

## 1. Where elimination is decided

`oracleEliminate(s)` in `chat.js` returns an array of failure reasons
for a route's score vector. A route is eliminated as soon as **any**
of the following holds :

| Threshold                              | Reason tag        |
|----------------------------------------|-------------------|
| `hallucination_risk > 0.55`            | `hallucination`   |
| `noise_generated > 0.55`               | `bruit`           |
| `runtime_cost > 0.80`                  | `coût runtime`    |
| `runtime_path_efficiency < 0.20`       | `gain trop bas`   |
| `temporal_stability < 0.40`            | `instabilité`     |

The boolean `route.eliminated` flows unchanged from chat.js into
`state.activeRoutes` and gates every visual rule below.

## 2. Mesh treatment for eliminated route members

When a node belongs to an eliminated route (and only to eliminated
routes — see §4 below for mixed membership) the per-mesh contract in
`applyRouteVisualization` is :

| Property            | Value                                                 |
|---------------------|-------------------------------------------------------|
| `material.color`    | original color lerped 55 % toward route hex (kept)    |
| `material.emissive` | route hex, but `emissiveIntensity = 0.0`              |
| `zoranWinnerPulse`  | `false`                                               |
| `targetOpacity`     | `0.30`                                                |

The 55 % tint is **not** undone : the user still reads which strategy
proposed this law, but the law itself fades into the back of the
scene. Killing emissive ensures eliminated nodes never carry any
glow — only winner survivors do. Combined with the 0.30 opacity (vs
1.0 for survivors and 0.12 for non-involved) eliminated nodes occupy
a clear middle plane.

## 3. Edge treatment for eliminated routes

```
linkColor : if every route claiming an edge is eliminated
            → 'rgba(120,130,150,0.10)'    (cold grey, near transparent)
linkWidth : if route.eliminated and not winner
            → 0.3                          (vs 1.0 survivor, 2.2 winner)
```

The grey color `rgba(120,130,150,0.10)` is intentionally neutral —
not red, not "danger" — so the eliminated route reads as **set
aside**, not as **wrong**. The Oracle is a filter, not a judge of
truth.

## 4. Mixed membership — saved by precedence

Some laws are picked by multiple routes, including a survivor and an
eliminated one. The dominance pick in `applyRouteVisualization`
chooses the **strongest non-eliminated** route via :

```
dom = winner || argmax(strength) over involved routes
```

For edges the precedence is encoded in `linkColor` :

1. winner edge color
2. any **non-eliminated** route color
3. eliminated-only grey
4. unaffiliated dust

Net effect : a node touched by both a survivor and an eliminated
route looks like the survivor; an edge in the same situation looks
like the survivor. Eliminated visuals never bleed onto surviving
material. This keeps the elimination signal local — visible where it
is unique, invisible where it would mislead.
