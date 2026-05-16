# WINNER ROUTE VISUALIZATION

- Mission ID : `ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `DRAGGABLE_RUNTIME_RESPONSE_POPUP.md`,
  `REALTIME_ROUTE_VISUALIZATION_ENGINE.md`,
  `COGNITIVE_PATH_ANIMATION_SYSTEM.md`,
  `ORACLE_ELIMINATION_VISUALS.md`
- Source     : `app/src/main.js` (`activateRoutes`,
  `applyRouteVisualization`, `linkColor`, `linkWidth`, `tickAnimation`)

## 1. Winner detection

The winner is decided upstream by `compete()` in `chat.js` (sort
survivors by `selection_score`, take head). The result is propagated
to `activateRoutes(result)` which compares each route id to
`result.winner` :

```
state.activeRoutes.set(r.route_id, {
  // ...
  winner: r.route_id === winner,
  // ...
});
```

A node carries `userData.zoranWinnerPulse = true` if and only if it
belongs to **at least one route** whose dominance selection — winner
first, else max strength — resolves to a winner route. The flag is
the sole bridge between visualization layer and animation layer.

## 2. Mesh treatment

| Property            | Value                                       |
|---------------------|---------------------------------------------|
| `material.color`    | original color lerped 55 % toward route hex |
| `material.emissive` | route hex (winner color)                    |
| `emissiveIntensity` | `0.20` at activation, then pulsed by tick   |
| `zoranWinnerPulse`  | `true`                                      |
| `targetOpacity`     | `1.0`                                       |

The pulse spec (1.5 Hz, ±0.10 around 0.20 base) is implemented in
`tickAnimation` and documented in `COGNITIVE_PATH_ANIMATION_SYSTEM.md`.

## 3. Edge treatment — `linkColor` priority

The link color accessor implements an explicit precedence so that an
edge shared by several routes always picks the most semantically
important color :

```
linkColor(l):
  if state.activeRoutes:
    winnerColor    = null
    anyRouteColor  = null
    anyEliminatedOnly = true
    for route in state.activeRoutes:
      if route.edges.has(l):
        anyRouteColor = route.color.css
        if not route.eliminated: anyEliminatedOnly = false
        if route.winner: { winnerColor = route.color.css; break }
    if winnerColor:    return winnerColor          # 1. winner wins outright
    if anyRouteColor:  return anyEliminatedOnly ? grey-10 : anyRouteColor
    return 'rgba(120,130,150,0.02)'                # 3. background dust
```

`break` on the winner match short-circuits the loop the moment a
winner edge is recognized — no further routes can downgrade it.

## 4. Edge width hierarchy

`linkWidth` follows the same precedence shape :

| Edge class                    | Width |
|-------------------------------|-------|
| Winner route edge             | `2.2` |
| Surviving non-winner route    | `1.0` |
| Eliminated route only         | `0.3` |
| Unaffiliated (route mode on)  | `0.2` |
| Default (route mode off)      | `0.4` (highlight `1.6`) |

The 2.2 / 1.0 / 0.3 spread keeps the winner backbone immediately
readable against the dimmed background without resorting to glow on
edges. Combined with the mesh pulse this is the only winner-specific
amplification — the rest of the scene loses contrast rather than the
winner gaining flash.
