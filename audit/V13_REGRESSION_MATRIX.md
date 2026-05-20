# V13_REGRESSION_MATRIX — Matrice de non-régression

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **adopté le** : 2026-05-20T17:35:00Z
- **données** : `audit/REGRESSION_MATRIX_V13.json`

## Objectif

Chaque ajout ou modification doit préserver les acquis. La matrice recense, par
zone fonctionnelle, les surfaces à re-vérifier après tout changement.

## Zones suivies

| Zone | Surface protégée | Vérification |
|---|---|---|
| boot | démarrage app, graphe 3D 242 nœuds | `tools/smoke_test.mjs` → `boot_ok` |
| graphe | drag, focus, prune, pan, layers | smoke : `focus_branche`, `prune_toggle`, `manual_pan`, `layer_toggle` |
| panneau | ouverture loi, drag, minimize | smoke : `click_open_panel`, `drag_panel`, `popup_*` |
| chat | compétition routes, viz routes | smoke : `chat_routes_compete`, `route_viz_in_graph` |
| scoring | `superiority.js` + moteurs branchés | benchmarks `audit/*.json` |
| rendering | `superiority_render.js`, CTA inline | `tools/cta_v13_runtime_check.mjs` |
| cohérence | S_local / S_global / HS | smoke : `status coherence` |

## État de référence (baseline 2026-05-20)

- smoke_test : **13/14** (FAIL connu : `pan_right_drag`)
- console errors : 0 · page errors : 0
- nodes 242 · links 286 · S_local 0.86 · S_global proxy 0.90 · HS 1.00
- cta_v13_runtime_check : 7/7 PASS

Toute régression sous cette baseline = blocage commit.

## Procédure

1. Avant modification : exécuter `smoke_test.mjs` + runtime checks → noter l'état.
2. Après modification : ré-exécuter → comparer.
3. Toute différence non intentionnelle = régression → rollback ou correction
   avant commit.
4. Une amélioration d'un compteur (ex : `pan_right_drag` PASS) doit être
   documentée et devient la nouvelle baseline.

## FAIL connu — pan_right_drag

`pan_right_drag : false` est une régression tolérée non résolue. Statut :
**dette ouverte**. Autorisé en mode chirurgical (correction de bug). À traiter
avant le freeze septembre — un Core stable ne livre pas un smoke rouge.

## Lien

Données structurées et cases à cocher : `audit/REGRESSION_MATRIX_V13.json`.
