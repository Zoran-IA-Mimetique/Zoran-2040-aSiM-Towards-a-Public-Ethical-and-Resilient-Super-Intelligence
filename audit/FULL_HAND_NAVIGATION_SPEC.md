# FULL_HAND_NAVIGATION — Spec

**Mission**: `ZORAN_FULL_HAND_NAVIGATION_AND_ADAPTIVE_UI_20260516`

## Objectif

Donner à l'opérateur le contrôle complet du graphe 3D :
**translation libre**, **zoom**, **rotation**, **focus**, **mode immersif**
(sidebar masquable). Aucune zone du modèle ne doit être inatteignable.

## Contrôles caméra

| Action            | Geste                                    |
|-------------------|------------------------------------------|
| Rotation orbite   | Clic gauche + drag                       |
| **Translation**   | **Clic droit + drag (orbit controls)**   |
| Zoom              | Molette                                  |
| Focus sur sélection | Double-clic sur canvas                 |
| Reset caméra      | `Space` (zoomToFit 800ms)                |
| Recentrer         | bouton ⌖ ou `R`                          |

Choix technique : `ForceGraph3D({ controlType: 'orbit' })` (au lieu de
`trackball` par défaut). OrbitControls.enablePan = true. Le menu contextuel
natif est intercepté (`contextmenu → preventDefault`) pour libérer le clic
droit.

## Mode immersif

| Action                  | Geste                  |
|-------------------------|------------------------|
| Toggle sidebar          | bouton ⇤ ou `S`        |
| État persisté           | `localStorage['zoran.sidebar.hidden']` |
| Transition CSS          | 200ms ease-out         |
| Resize 3D auto          | après 220ms (post-transition) |

CSS : `body.sidebar-hidden #sidebar { transform: translateX(-100%); opacity: 0 }`
et `body.sidebar-hidden #graph { left: 0 }`.

## Vérification empirique

`tools/smoke_test.mjs` (Playwright) — toutes vertes :
- `sidebar_toggle` : 3 états vérifiés (visible → cachée → visible)
- `pan_right_drag` : API OrbitControls (`enablePan=true`, `controls.update()`
  déplace cam de 36 unités et target de 36 unités)
- captures : `app/preview-immersive.png` (sidebar masquée),
  `app/preview-superior.png` (★ rings visibles)

## Stabilité

- Aucune dépendance ajoutée (orbit controls fournis par 3d-force-graph)
- Garde `try/catch` autour de l'accès `state.fg.controls()` (renderer pas
  toujours prêt synchrone)
- 0 console error, 0 page error sur 241 nœuds
