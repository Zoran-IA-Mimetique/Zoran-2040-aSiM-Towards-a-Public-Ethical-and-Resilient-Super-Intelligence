# REAL_HAND_NAVIGATION_FIX — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `FULL_HAND_NAVIGATION_SPEC.md`, `SIDEBAR_RUNTIME_FIX.md`,
`app/src/main.js` (lignes 645-755)

---

## 1. Problème runtime

Le pan caméra (translation latérale du graphe 3D) ne fonctionnait
pas de manière fiable : selon le navigateur et le mode tactile, le
clic droit ne déclenchait pas OrbitControls.PAN, et aucun fallback
clavier n'existait. Mission corrective : **garantir 6 méthodes de
translation distinctes**, dont au moins une opérationnelle sur tout
device (souris, trackpad, tactile, clavier).

## 2. Les 6 méthodes câblées

| # | méthode                          | trigger                                  |
|---|----------------------------------|------------------------------------------|
| a | OrbitControls native             | clic droit + drag (`MOUSE.RIGHT=PAN`)    |
| b | Manual pan SHIFT+gauche          | `pointerdown` si `button=0 && shiftKey`  |
| c | Manual pan middle-click          | `pointerdown` si `button=1`              |
| d | Manual pan right-button backup   | `pointerdown` si `button=2`              |
| e | Touch 2-finger                   | `touchstart` avec `touches.length === 2` |
| f | Clavier WASD + flèches           | `keydown` (sans Alt/Ctrl/Meta)           |

OrbitControls config explicite : `noPan=false`, `enablePan=true`,
`panSpeed=1.2`, `screenSpacePanning=true`. Menu contextuel intercepté
sur `#graph` et sur le `<canvas>` interne (`contextmenu →
preventDefault`) pour libérer le clic droit.

## 3. Calcul world-units du pan manuel

`doManualPan(x, y)` traduit le delta pixel en delta monde en
fonction de la distance caméra-cible :

```js
const dist   = cam.position.distanceTo(ctrl.target);
const factor = dist * 0.002;                          // unité monde / pixel
const right  = new THREE.Vector3();
const up     = new THREE.Vector3();
cam.matrix.extractBasis(right, up, new THREE.Vector3());
const offset = right.multiplyScalar(-dx * factor)
                    .add(up.multiplyScalar(dy * factor));
cam.position.add(offset);
ctrl.target.add(offset);                              // sinon orbit recadré
ctrl.update();
```

Le pas clavier `STEP = 60 px` se traduit en world-units variables
selon le zoom (proche → micro-pan ; loin → macro-pan). La caméra et
sa cible bougent **du même offset** : OrbitControls reste cohérent
(pas de saut de rotation après pan).

## 4. Smoke test runtime

`tools/smoke_test.mjs` confirme via Playwright :

| test                    | méthode                  | delta caméra (world units) |
|-------------------------|--------------------------|---------------------------:|
| `pan_zoran_api`         | `window.__zoranPan(20,0)`|  `dcam ≈ 40`               |
| `pan_right_drag`        | OrbitControls right-drag |  `dcam ≈ 4880`             |

L'API debug `window.__zoranPan(dx, dy)` est exposée pour scripts de
test et console : appel direct `startManualPan(0,0) →
doManualPan(dx,dy) → endManualPan()`. Aucune dépendance ajoutée ;
fallback `try/catch` autour de `state.fg.controls()` car renderer
pas toujours prêt au boot synchrone.
