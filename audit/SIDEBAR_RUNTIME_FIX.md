# SIDEBAR_RUNTIME_FIX — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `FULL_HAND_NAVIGATION_SPEC.md`, `REAL_HAND_NAVIGATION_FIX.md`,
`app/src/main.js` (lignes 866-890, `applySidebarState`)

---

## 1. Problème runtime

Le toggle sidebar (mode immersif) n'animait pas correctement la
transition CSS ni le redimensionnement du canvas 3D : le `<main
id="graph">` restait à `left:300px` après masquage, créant une bande
vide à gauche. Mission corrective : garantir transition propre,
resize automatique, état persisté entre sessions.

## 2. Mécanique CSS + JS

Classe pivot sur `<body>` : `body.sidebar-hidden`. Trois règles CSS
coordonnées :

```css
body.sidebar-hidden #sidebar { transform: translateX(-100%); opacity: 0 }
body.sidebar-hidden #graph   { left: 0 }
#sidebar, #graph             { transition: all 200ms ease-out }
```

Le `transform` (au lieu de `display:none`) préserve la structure DOM
et l'état interne des `<ul>` (scroll positions, focus). L'opacité 0
combinée au `translateX(-100%)` empêche tout flash de re-rendu.

## 3. Logique runtime

```js
const applySidebarState = () => {
  document.body.classList.toggle('sidebar-hidden', state.sidebarHidden);
  sidebarBtn.textContent = state.sidebarHidden ? '⇥' : '⇤';
  setTimeout(() => {                              // 220ms > 200ms transition
    state.fg.width(el.clientWidth);
    state.fg.height(el.clientHeight);
  }, 220);
};
```

Le délai `220ms` assure que le `<canvas>` lit `clientWidth` **après**
la fin de la transition CSS, sinon `width()` capture la valeur
intermédiaire et le graphe reste sous-dimensionné jusqu'au prochain
resize fenêtre.

## 4. Triggers + persistance

| trigger              | action                                            |
|----------------------|---------------------------------------------------|
| Clic bouton `⇤`/`⇥`  | toggle + `localStorage['zoran.sidebar.hidden']`   |
| Touche `S`           | `$('#btn-sidebar').click()` (cf. keydown handler) |
| Boot                 | lecture `localStorage` → restaure dernier état    |

État sérialisé `'0'` ou `'1'`. Fallback `try/catch` autour de
`localStorage` pour environnements restreints (mode privé Firefox,
sandbox iframe). Tooltip dynamique : `"Afficher sidebar (S)"` ou
`"Masquer sidebar (S) — mode immersif"`.

Smoke test (`tools/smoke_test.mjs::sidebar_toggle`) confirme les
3 transitions visible → cachée → visible, avec capture
`app/preview-immersive.png` (sidebar masquée, graphe pleine largeur)
et `app/preview-superior.png` (sidebar visible, ★ rings visibles).
