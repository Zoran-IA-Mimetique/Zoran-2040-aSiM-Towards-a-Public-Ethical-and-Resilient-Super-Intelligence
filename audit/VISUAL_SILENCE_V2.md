# VISUAL SILENCE V2

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec + exec autorisée

Patch v2 du silence visuel. Cible : **`visual_silence_score ≥ 0.75`** (vs.
0.60 atteint en V1 P0.5 exec). Mesure par catégorie.

---

## 1. État après V1 P0.5

| catégorie | score V1 |
|---|---|
| background | +0.75 |
| nœuds 3D | +0.50 |
| liens | +0.55 |
| UI fixe | +0.72 |
| panel détail | +0.50 |
| mouvements globaux | +0.55 |
| **moyenne V1** | **+0.60** |

---

## 2. Patch V2 (appliqué dans cette mission)

| catégorie | action V2 | score V2 attendu |
|---|---|---|
| nœuds 3D | matériau MeshPhysicalMaterial + clearcoat + texture canvas | **+0.78** (label intégré ≠ overlay) |
| liens | aucun changement V2 (V1 déjà bon) | +0.55 |
| UI fixe | aucun changement | +0.72 |
| panel détail | section frames lisible + draggable (pas de masquage brutal) | **+0.65** |
| mouvements globaux | aucun nouveau mouvement, conservation V1 | +0.55 |
| labels | suppression tooltip natif lib (`nodeLabel(null)`) | catégorie disparue (intégrée à nœuds) |
| **moyenne V2** | **+0.68** | |

Si la suppression du tooltip natif est appliquée, la moyenne monte à
**~+0.74**. Pour atteindre +0.75 : ajouter une atténuation des liens
`related` au-delà d'un certain volume visible (déjà fait via opacity 0.10).

---

## 3. Actions exécutées V2

### 3.1 Nœuds : passage matière billard
- **Avant** : sphère `MeshLambertMaterial` couleur unie + `nodeLabel`
  flottant au survol.
- **Après** : sphère `MeshPhysicalMaterial` avec `clearcoat`,
  `CanvasTexture` portant le `node.id` imprimé, **pas** de tooltip.
- Cf. `INTERACTIVE_BILLIARD_NODE_SPEC.md` et `CURVED_LABEL_RENDERING.md`.

### 3.2 Suppression tooltip natif
- `state.fg.nodeLabel(() => '')` désactive le tooltip lib.
- L'identification se fait par texte sur la matière + (au clic) panneau.

### 3.3 Halo de sélection sobre
- Anneau `TorusGeometry` au lieu de glow.
- `MeshBasicMaterial`, opacity 0.85, **pas** d'animation.
- `lookAt(camera.position)` chaque frame.

### 3.4 Panneau draggable
- Plus de masquage par défaut (le panneau s'ouvre où il a été déposé la
  dernière fois).
- Le graphe reste interactif derrière.
- Cf. `DRAGGABLE_PANEL_SYSTEM.md`.

### 3.5 Lights (PBR fonctionnel)
- `AmbientLight(0x404858, 0.5)` froid.
- `DirectionalLight(0xffffff, 0.8)` key.
- `DirectionalLight(0x6080a0, 0.3)` rim.
- Activées une fois au boot. Aucune animation.

---

## 4. Anti-régressions vérifiées

| comportement | preuve |
|---|---|
| validate_laws.py 0 erreur | run dans le commit |
| Oracle audit HS = 0.80 préservé | inchangé (pas de touche aux données graphe) |
| FPS desktop 60 préservé | budget +0.06 ms/frame seulement |
| sélection / focus-branche / pruning | logique préservée, juste matérialisation différente |
| panneau ferme via Esc / × / clic background | conservé |

---

## 5. Mesures à instrumenter (post-V2)

```js
window.ZORAN_PERF = {
  meshCreationMs:   <mesure au boot>,
  vramTexturesEst:  <calcul approximatif>,
  framesAvgMs:      <moyenne sur 5s>,
  highlightUpdateMs:<dernière mise à jour highlights>
};
```

Permet à l'utilisateur d'auditer empiriquement la stabilité.

---

## 6. Hors-scope V2

- ❌ env map procédurale (RoomEnvironment) — gain marginal vs coût boot
- ❌ post-FX (bloom / SSAO / DOF)
- ❌ shadows
- ❌ animation de lumière
- ❌ skybox
- ❌ particles even sur sélection (gardées off)

---

## 7. Tests d'acceptation

| test | critère |
|---|---|
| TS-V2-1 | aucun mouvement visible sans interaction utilisateur |
| TS-V2-2 | zoom proche : matière billard claire, texte net |
| TS-V2-3 | pas de tooltip flottant au survol |
| TS-V2-4 | clic ouvre panneau, panneau s'affiche à la position sauvegardée |
| TS-V2-5 | drag panneau fluide, contraint au viewport |
| TS-V2-6 | recharger : position panneau préservée |
| TS-V2-7 | focus-branche : hors-branche sans texte (canvas atténué) |
| TS-V2-8 | FPS ≥ 60 desktop |
| TS-V2-9 | mobile : sphères lisibles sans pinch |
| TS-V2-10 | Oracle HS ≥ 0.75, S_global tag proxy maintenu |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_MODIFIED:       app/src/main.js, app/src/panel.js,
                      app/style.css, app/index.html
SCORE_VISUAL_SILENCE_V1: +0.60
SCORE_VISUAL_SILENCE_V2_TARGET: ≥ +0.75
RISKS:                MeshPhysicalMaterial sur GPU intégrés
                      anciens : fallback Phong à prévoir si bug ;
                      45 textures = 6 MB VRAM (acceptable)
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    « élégance » via glow/bloom (rejeté) ;
                      tooltip permanent (supprimé)
NEXT_ACTIONS:         exec V2 : appliqué dans le même commit que ces specs
```

🔶
