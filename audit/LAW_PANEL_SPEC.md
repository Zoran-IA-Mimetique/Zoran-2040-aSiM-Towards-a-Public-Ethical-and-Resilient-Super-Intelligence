# LAW PANEL SPEC

**Mission** : `ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515`
**Timestamp** : `2026-05-15T19:24:00+02:00`
**Mode** : spec

Spécification du **panneau de loi** ouvert au clic sur une sphère. Le
panneau existe déjà (`app/src/panel.js`). Cette spec liste les **améliorations
ciblées** sans inflation.

---

## 1. Anatomie cible

```
┌──────────────────────────── × ┐
│ TITRE                         │
│ id · famille · weight         │
│ [tag canonique] [tag μ0] [..] │
│                               │
│ Description (1–3 paragraphes) │
│                               │
│ ┌─────────┐  ┌─────────┐      │
│ │ S_local │  │ S_global│      │
│ │  0.98   │  │ proxy:.94│     │
│ └─────────┘  └─────────┘      │
│                               │
│ ÉQUATIONS                     │
│   ULG(x) = lim …              │
│                               │
│ EXEMPLES                      │
│  • …                          │
│                               │
│ INVARIANT DE FAMILLE          │
│   préservation de I_struct …  │
│                               │
│ PARENT     → ULG-001 (...)   │
│ ENFANTS    → 4 items          │
│ ISOMORPHISMES → SDE-001 (...) │
│ CONTRADICTIONS → UDE-003 (..) │
│ RELIÉES    → 2 items          │
│ ABSORBE    → ULG-002          │
│                               │
│ DOI (si présent)              │
└───────────────────────────────┘
```

Statut existant : tout déjà implémenté dans `panel.js` post-P0.5 exec.
Cette spec ajoute la **finition** ci-dessous.

---

## 2. Améliorations ciblées

### 2.1 Affichage proxy S_global

Quand le S_global publié globalement est `proxy:...`, marquer également la
case S_global de la loi avec un petit indicateur `proxy` (visuel
discret, infobulle "S_global non encore composé — voir audit/S_GLOBAL_RULES.md").

### 2.2 Invariant de relation

Pour les liens `iso`, afficher l'invariant entre parenthèses (déjà fait
post-P0.5 exec via `<span class="inv">`). Pour les liens `contradicts`,
afficher le domaine. Pour `related`, afficher le `reason`.

### 2.3 Tier badge sur attractor

Si `node.attractor_tier`, afficher un badge proéminent avant le titre :

```html
<span class="z-tier-badge">μ0</span>
```

style :
```css
.z-tier-badge {
  display: inline-block;
  background: var(--accent);
  color: #07080c;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
  font-family: ui-monospace, monospace;
}
```

### 2.4 Compositions opératoires (si applicable)

Si le nœud est un attracteur μ0 et apparaît dans `dataset.compositions`,
ajouter une section :

```
COMPOSITIONS OPÉRATOIRES
  • GHUC ∘ DVE : préserve traçabilité ; ΔS_global = 0.00 — admissible
  • GHUC ∘ UDE : préserve maximisation ; ΔS_global = +0.01 — admissible
```

### 2.5 Fractalité (si applicable)

Si la famille du nœud a `fractality_demonstrated: true`, ajouter à la fin de
la section "Invariant de famille" :

```
✓ Fractalité démontrée — motif : (opérateur, cas-A, cas-B) répété à 3 échelles
  Profondeur ≥ 3 sur la branche GHUC-002.
  Voir audit/FRACTAL_VALIDATION.md.
```

---

## 3. Comportement

| comportement | spec |
|---|---|
| ouverture | slide-in 250 ms depuis la droite, ne masque PAS le graphe |
| fermeture | Esc, clic ×, clic background, ou nouveau clic sur même nœud |
| largeur | 380 px desktop, 100vw mobile (sheet en bas) |
| max-height | `calc(100vh - 100px)` desktop ; `50vh` mobile |
| scroll | interne ; le graphe reste interactif derrière |
| backdrop | aucun (jamais de modal opaque) |
| lien cliquable interne | clic = sélection du nœud cible (navigation, pas ouverture nouvelle) |
| historique | chaque navigation interne empile dans `history.js` |

---

## 4. Lisibilité

- Hiérarchie typographique :
  - h2 (titre) — 16 px, 600 weight
  - h4 (sections) — 10 px, uppercase, letter-spacing 1px, couleur `fg-2`
  - body — 12 px, 1.5 line-height
  - code/équations — 11 px, monospace, fond `#060810`
- Aucun élément en italique sauf `.inv` (invariants/reasons).
- Aucune couleur saturée en plein texte ; les couleurs servent uniquement
  aux tags et badges.

---

## 5. Mobile

- Sur viewport < 720 px : panneau passe en bottom-sheet, `border-radius:
  12px 12px 0 0`, drag-handle visuel en haut.
- Slide-in depuis le bas, max-height 50vh, scroll interne.
- Le canvas 3D reste visible et interactif au-dessus du sheet.

---

## 6. Performance

| coût | mesure |
|---|---|
| renderDetail() pour 1 nœud | ~2 ms |
| event listeners sur relations | ~0.4 ms par binding × N |
| reflow CSS | ~3 ms |
| **ouverture totale** | **~6 ms** |

Acceptable. Aucun budget particulier nécessaire.

---

## 7. Tests d'acceptation

| test | critère |
|---|---|
| TP1 — ouverture | clic → panneau visible en < 80 ms |
| TP2 — graphe interactif | rotation graphe avec panneau ouvert fonctionne |
| TP3 — navigation interne | clic sur lien relation = nouvelle sélection sans rechargement |
| TP4 — historique | Alt+← revient au précédent panneau |
| TP5 — mobile sheet | bottom-sheet correctement disposé, scroll interne, drag-handle |
| TP6 — fermeture | Esc, clic ×, clic background : tous fonctionnent |
| TP7 — proxy badge | si S_global publié `proxy:`, case du panneau le signale |
| TP8 — composition | sur GHUC-001, section "Compositions opératoires" s'affiche |
| TP9 — fractalité | sur GHUC-*, section "Fractalité démontrée" présente |

---

## 8. Non-buts

- ❌ multi-panneaux ouverts en parallèle
- ❌ tabs dans le panneau
- ❌ édition en place
- ❌ animation de contenu (les sections apparaissent toutes en même temps)
- ❌ markdown rich avec images

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515
TIMESTAMP:            2026-05-15T19:24:00+02:00
FILES_ANALYZED:       app/src/panel.js, app/style.css
RISKS:                ajouter "compositions" + "fractalité" + tier badge
                      peut allonger le panneau et nuire à la lisibilité mobile ;
                      backdrop-filter coûteux sur mobile bas-de-gamme
S_LOCAL:              n/a (spec UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    multi-tabs ; rich content ; édition inline
NEXT_ACTIONS:         à l'exécution : étendre panel.js avec
                      sections compositions + fractalité ;
                      ajouter z-tier-badge ; tester mobile
```

🔶
