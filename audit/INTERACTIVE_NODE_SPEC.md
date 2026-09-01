# INTERACTIVE NODE SPEC

**Mission** : `ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515`
**Timestamp** : `2026-05-15T19:24:00+02:00`
**Mode** : spec ; exécution gated sur autorisation utilisateur

Transformation des sphères 3D en **points d'accès cognitifs vivants** vers
les lois. Aucune inflation. Aucun ajout de loi.

---

## 1. États d'un nœud

Un nœud passe par 5 états visuels distincts. Tout effet, toute information,
toute interaction est rattachée à un état précis.

| état | déclencheur | feedback visuel | feedback informationnel |
|---|---|---|---|
| `idle` | défaut | sphère couleur famille, opacité 0.94 | aucun |
| `proximity` | caméra à `< 80 units` ou `< 1/3 viewport` | apparition douce du label (300ms) | nom + tier |
| `hover` | curseur sur sphère | léger gonflement (×1.10) + tooltip enrichi (400ms) | nom + tier + famille + invariant |
| `selected` | clic | halo subtil + branche connectée mise en valeur | panneau latéral complet |
| `dimmed` | mode `focus-branche` actif sur autre branche | opacité 0.20, sans label | aucun |

**Aucun état brutal** : pas de changement instantané sauf pour `selected`
(clic = action explicite).

---

## 2. Transitions

| transition | durée | easing |
|---|---|---|
| `idle → proximity` | 300 ms | ease-out (lent au début, rapide à la fin) |
| `proximity → idle` | 200 ms | ease-in |
| `idle → hover` | 120 ms | ease-out |
| `hover → idle` | 180 ms | ease-in |
| `any → selected` | 150 ms | ease-out |
| `any → dimmed` | 250 ms | ease |
| sphère grow factor | de 1.0 à 1.10 | spring lente |

Pas de bounce, pas d'overshoot, pas de pulsation périodique.

---

## 3. Hitbox & accessibility

- Le nœud accepte le clic sur la sphère **ET** sur son label (étendu en
  bounding-rect).
- Taille minimale de hitbox : 24×24 pixels effectifs, indépendamment du
  zoom (label garantit la cible touchable sur mobile).
- `aria-label` injecté sur l'élément 2D du label avec `{n.title} —
  {n.id} — famille {n.family}`.
- Focus clavier : `Tab` parcourt l'index sidebar ; `Enter` sur item
  équivaut à clic nœud.

---

## 4. Information hiérarchie au survol

Quatre paliers d'information selon la proximité caméra :

```
distance > 200u         : aucun label
80u  < distance ≤ 200u  : label minimal      "GHUC-001"
30u  < distance ≤  80u  : label tier         "GHUC-001 · μ0"
       distance ≤  30u  : label complet      "GHUC-001 · μ0 · Consolidation"
```

L'apparition d'information est **progressive**, jamais saturée.

---

## 5. Règles d'apparition de label

| règle | énoncé |
|---|---|
| R-L1 | jamais plus de 12 labels affichés simultanément |
| R-L2 | si > 12 candidats, sélection : attractors μ0 > μ1 > nœud sélectionné > top weight |
| R-L3 | aucun chevauchement d'étiquettes (collision detection avec quadtree écran 2D) |
| R-L4 | un label `dimmed` est masqué entièrement |
| R-L5 | si l'utilisateur clique sur un label : équivaut à clic nœud |

---

## 6. Composants UI

| composant | rôle |
|---|---|
| `NodeMesh`     | sphère 3D + matériau (cf. `VISUAL_MATERIAL_GUIDE.md`) |
| `NodeLabel`    | étiquette 2D ancrée au-dessus de la sphère (cf. `LABEL_SYSTEM.md`) |
| `NodeHalo`     | anneau subtil en mode `selected` |
| `BranchOverlay`| dim global quand `focus-branche` actif |
| `LawPanel`     | panneau latéral (cf. `LAW_PANEL_SPEC.md`) |

---

## 7. Performance budget

| métrique | cible | seuil de dégradation |
|---|---|---|
| FPS soutenu sur 45 nœuds | ≥ 60 | dégrader rendu à 30 FPS si <50 trois fois consécutivement |
| latence clic → panneau | < 80 ms | warn si > 150 ms |
| labels rendus / frame | ≤ 12 | jamais > 18 |
| transition `proximity` | ne bloque pas le fil principal | offload sur requestIdleCallback |

---

## 8. Non-buts

P0.5 interactive **ne fait PAS** :
- ❌ animation décorative permanente sur les nœuds
- ❌ pulsation/rotation des sphères au repos
- ❌ trails / glow / lens flare
- ❌ son
- ❌ vibration mobile
- ❌ panneau modal qui bloque la 3D

---

## 9. Tests d'acceptation

Voir aussi `VISUAL_SILENCE_PATCH.md` §6.

| test | critère pass |
|---|---|
| T1 — proximité | s'approcher d'un nœud fait apparaître le label sans flash |
| T2 — hover | survoler agrandit doucement, tooltip enrichi |
| T3 — clic | panneau ouvre en < 80 ms |
| T4 — focus-branche | F masque tout sauf branche du sélectionné |
| T5 — pas de chevauchement | aucune étiquette ne se superpose |
| T6 — silence au repos | 0 mouvement quand aucune interaction utilisateur |
| T7 — mobile | tap équivalent clic, pinch zoom fonctionne |
| T8 — FPS | ≥ 60 sur desktop moyenne, ≥ 30 sur mobile moyenne |

---

## 10. Statut implémentation

| comportement | actuel | spec P0.5 |
|---|---|---|
| clic → panneau | ✅ existe | conserve, polish via `LAW_PANEL_SPEC.md` |
| hover tooltip | ⚠ tooltip natif minimal (lib) | remplacer par `NodeLabel` (cf. `LABEL_SYSTEM.md`) |
| labels distance-based | ❌ absent | à implémenter §4 |
| focus-branche | ✅ touche `F` (intégrée après mission précédente) | conserve, polish dim contrast |
| matériau clearcoat | ❌ MeshLambert/Phong actuels | à introduire (cf. `VISUAL_MATERIAL_GUIDE.md`) |
| particules permanentes | ✅ désactivées par défaut (P0.5 patch déjà appliqué) | maintenu |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515
TIMESTAMP:            2026-05-15T19:24:00+02:00
FILES_ANALYZED:       app/src/main.js, app/src/panel.js, app/style.css
RISKS:                surcharge labels si R-L1..R-L3 non respectées ;
                      régression FPS si CSS2DRenderer mal optimisé
S_LOCAL:              n/a (spec UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       collision étiquettes ↔ ligne d'horizon visuelle ;
                      hover-grow ↔ d3-force layout (le grossissement ne doit
                      pas perturber les forces)
TOP_FAKE_PATTERNS:    « interactivité » réduite à hover natif ;
                      tooltip = label
NEXT_ACTIONS:         1. autoriser exécution P0.5_INT (CSS2DRenderer + clearcoat)
                      2. OU itérer la spec sur les paliers d'information §4
```

🔶
