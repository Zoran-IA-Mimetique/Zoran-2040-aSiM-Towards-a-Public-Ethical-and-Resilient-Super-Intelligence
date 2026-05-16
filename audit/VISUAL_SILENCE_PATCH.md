# VISUAL SILENCE PATCH

**Mission** : `ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515`
**Timestamp** : `2026-05-15T19:24:00+02:00`
**Mode** : patch spec + statut

Patch ciblé pour porter le `visual_silence_score` de **+0.40 (état P0)** à
**≥ +0.75 (cible P0.5 INT)**.

---

## 1. État actuel post-P0.5 exec (Phase A déjà appliquée)

| élément | état avant P0 | état actuel | action restante |
|---|---|---|---|
| particules directionnelles permanentes | présentes sur tous les `parent` | **désactivées par défaut**, n'apparaissent que sur la sélection (2 par lien highlighté) | ✅ fait |
| glow SVG dans preview statique | présent | **conservé seulement pour la preview**, pas dans l'app live | ✅ ok |
| linkOpacity uniforme 0.6 | uniforme | différencié par kind (related 0.10, iso 0.55, etc.) | ✅ fait |
| label permanent au survol natif | natif lib | à remplacer par CSS2DRenderer | ⚠ pending |
| matériau Phong/Lambert | non-PBR | clearcoat léger | ⚠ pending |
| halo sélection (glow lib) | léger flicker | anneau dédié | ⚠ pending |

---

## 2. Score visual_silence par élément (recalculé après Phase A)

| catégorie | score avant P0 | score après Phase A | cible P0.5 INT |
|---|---|---|---|
| background | +0.75 | +0.75 | +0.75 |
| nœuds 3D | +0.42 | +0.50 | +0.70 (clearcoat) |
| liens | -0.05 | **+0.55** | +0.60 |
| UI fixe | +0.70 | +0.72 | +0.75 |
| panel détail | +0.45 | +0.50 | +0.60 (tier badge + invariant) |
| mouvements globaux | +0.10 | **+0.55** | +0.65 |
| **moyenne** | **+0.40** | **+0.60** | **≥ +0.75** |

Gain Phase A déjà réalisé : **+0.20** par désactivation des particules par
défaut.

Gain Phase INT projeté : **+0.15** par clearcoat + halo dédié + labels
silencieux.

---

## 3. Patch Phase INT (à exécuter sur autorisation)

### 3.1 Patch matériau

Voir `VISUAL_MATERIAL_GUIDE.md`. 1 fichier modifié : `app/src/main.js` —
remplacement de l'`onNodeThreeObject` pour injecter le mesh PBR.

### 3.2 Patch labels

Voir `LABEL_SYSTEM.md`. 2 fichiers : `app/src/main.js` (init CSS2DRenderer
+ nodeThreeObject), `app/style.css` (classes `.zoran-label`,
`.zoran-tooltip`).

### 3.3 Patch panel

Voir `LAW_PANEL_SPEC.md` §2. 2 fichiers : `app/src/panel.js`
(sections compositions + fractalité + tier badge), `app/style.css`
(classes `.z-tier-badge`).

### 3.4 Patch éclairage

1 fichier : `app/src/main.js` — accès au `scene` exposé par
`3d-force-graph` (`fg.scene()`) pour ajouter les 3 lights.

---

## 4. Anti-régressions

Liste des comportements **NE DEVANT PAS** régresser pendant Phase INT :

| comportement | preuve |
|---|---|
| FPS ≥ 60 desktop | mesure `requestAnimationFrame` |
| validate_laws.py passe | `python3 tools/validate_laws.py` exit 0 |
| HS ≥ 0.75 | Oracle audit |
| audit Oracle silencieux (aucune nouvelle issue) | comparaison audit before/after |
| navigation Alt+←/→ | smoke test manuel |
| pruning P | smoke test |
| focus F | smoke test |
| recherche tokenisée | smoke test |
| panneau ouvre en < 80 ms | mesure perf.now() |

---

## 5. Mesures à instrumenter

Avant Phase INT, ajouter des mesures dans `main.js` :

```js
const PERF = {
  frameTimeAvg: 0,
  labelUpdateAvg: 0,
  clickToOpenLatency: 0
};
// instrumentation simple, exposée sur window.ZORAN_PERF
window.ZORAN_PERF = PERF;
```

Permet à l'utilisateur de constater empiriquement la stabilité.

---

## 6. Tests d'acceptation Phase INT

| test | critère |
|---|---|
| TS1 — silence au repos | aucun mouvement visible sans interaction (caméra/curseur) |
| TS2 — score silence | recompute via méthode `VISUAL_SILENCE_REPORT.md` ≥ +0.75 |
| TS3 — pas de bloom | aucun débordement lumineux |
| TS4 — pas de flicker | sélection/désélection ne fait pas clignoter |
| TS5 — clarté à 1080p | les labels sont nets, pas de subpixel rendering flou |
| TS6 — clarté mobile | textes lisibles sans pinch-to-zoom |
| TS7 — perf | FPS desktop ≥ 60, mobile ≥ 30 |
| TS8 — Oracle | HS inchangé ou en hausse |

---

## 7. Hors-scope explicite Phase INT

- ❌ ajout de loi
- ❌ ajout de famille
- ❌ modification du graphe relationnel
- ❌ shaders custom
- ❌ post-processing (bloom, FXAA, etc.)
- ❌ animation de caméra périodique
- ❌ son
- ❌ thèmes alternatifs (light mode, etc.)

---

## 8. Estimation effort exec

| patch | LoC modifiées | risque |
|---|---|---|
| matériau PBR + lights | ~40 lignes `main.js` | bas |
| CSS2DRenderer + labels | ~80 lignes `main.js` + ~40 lignes CSS | moyen |
| panel compositions + tier | ~30 lignes `panel.js` + ~20 lignes CSS | bas |
| anneau sélection | ~20 lignes `main.js` | bas |
| instrumentation perf | ~15 lignes `main.js` | bas |
| **total** | **~245 lignes** | **moyen** |

Une seule passe d'exécution. Pas de refactor. Pas de migration.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515
TIMESTAMP:            2026-05-15T19:24:00+02:00
FILES_TO_PATCH:       app/src/main.js, app/src/panel.js, app/style.css
RISKS:                régression FPS si labels mal optimisés ;
                      env map procédurale au boot ;
                      WebGL2 requis pour MeshPhysicalMaterial sur certains mobiles
S_LOCAL:              n/a (UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a (patch propre, pas d'impact graphe relationnel)
TOP_FAKE_PATTERNS:    « interactivité » = particules ; « profondeur » = bloom
NEXT_ACTIONS:         autoriser exécution Phase INT (1 passe, ~245 lignes,
                      anti-régression Oracle audit avant/après)
                      OU itérer la spec sur un point précis
```

🔶
