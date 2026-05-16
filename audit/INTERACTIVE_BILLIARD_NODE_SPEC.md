# INTERACTIVE BILLIARD NODE SPEC

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec + exec autorisée

Transformation des sphères en **boules cognitives manipulables** : nom
imprimé sur la matière, matière billard, étiquette détaillée au clic
seulement.

---

## 1. Objet `BilliardNode`

Chaque nœud du graphe est rendu comme un `THREE.Mesh` :

```
BilliardNode = THREE.Mesh(
  geometry = SphereGeometry(radius, 32, 16),
  material = MeshPhysicalMaterial({
    map        : CanvasTexture(billiard_face_with_label),
    metalness  : 0.15,
    roughness  : 0.45,
    clearcoat  : tier_clearcoat,
    clearcoatRoughness : 0.20,
    reflectivity       : tier_reflectivity
  })
)
```

Où :
- `radius = 2 + (n.weight ?? 0.5) * 10`
- `tier_clearcoat` : 0.55 (μ0) · 0.45 (μ1) · 0.35 (autre canonique) · 0.25 (autre)
- `tier_reflectivity` : 0.40 (μ0) · 0.35 (μ1) · 0.30 (autre canonique) · 0.20 (autre)

---

## 2. Texture canvas (label imprimé)

Cf. `audit/CURVED_LABEL_RENDERING.md` pour détail. Synthèse :

- Canvas **512×256 pixels** (ratio 2:1 → wrap cylindrique sphère).
- Fond : couleur du nœud (palette).
- Texte central : `n.id` en majuscules, monospace bold, contrastant.
- Le texte est positionné une seule fois sur l'**équateur** de la sphère.

Le nom apparaît donc « écrit » sur la sphère, naturellement lisible quand
la face équatoriale est tournée vers la caméra. La face arrière est
absente de texte (canvas à fond uni). Pas de texte qui « tourne avec la
sphère » au sens animé — c'est statique sur la matière.

---

## 3. États d'interaction

| état | déclencheur | feedback visuel |
|---|---|---|
| `idle` | défaut | mesh standard, opacité 1.0 |
| `hover` | curseur sur sphère | gonflement smooth (×1.10), curseur main |
| `selected` | clic | anneau or face-caméra autour de la sphère |
| `branch_dimmed` | mode `focus-branche` actif et nœud hors branche | opacité 0.18, pas de label visible (canvas désactivé via material.opacity) |
| `highlight_dimmed` | sélection active mais nœud non voisin | opacité 0.32 |

---

## 4. Halo de sélection

Pas de glow / bloom. Halo = `THREE.Mesh` enfant :

```js
const ringGeom = new THREE.TorusGeometry(radius * 1.18, 0.10, 8, 48);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xffcc4d, transparent: true, opacity: 0.85,
  depthWrite: false
});
const ring = new THREE.Mesh(ringGeom, ringMat);
ring.lookAt(camera.position);  // refresh chaque frame
ring.visible = (state.selected?.id === n.id);
```

Anneau toujours face caméra. Aucune animation périodique, pas de pulsation.

---

## 5. Comportement clic-only

| événement | action |
|---|---|
| `mousemove` sur sphère | grow + cursor pointer ; **PAS** de tooltip |
| `mouseleave` | reset grow |
| `click` | `selectNode(n.id, true)` → ouvre panneau loi |
| `dblclick` | recentrage caméra sur le nœud |
| `right-click` | masque le nœud (P0.6, hors scope V2) |

**`nodeLabel(null)`** dans `3d-force-graph` pour désactiver le tooltip
natif. Le seul label permanent est sur la matière elle-même (texture).

---

## 6. Drag spatial

Le drag de nœud (`enableNodeDrag(true)`) reste actif. Pendant un drag :
- pas de halo (drag != selection)
- material.emissive temporairement `0x222222` pour signaler le grab
- au relâchement : retour normal, position figée par les forces

---

## 7. Mises à jour d'état

Comme les meshes sont créés une fois via `nodeThreeObject`, les transitions
d'opacité (highlight, branch-dimmed) doivent être gérées **dans la boucle
d'animation**.

Mécanisme :
- `state.targetOpacity[node.id] = computeTarget(node, state)` (calculé à
  chaque changement d'état explicite : selectNode, focus toggle, etc.).
- À chaque frame : `mesh.material.opacity += (target − current) * 0.18`
  jusqu'à convergence.
- `mesh.material.transparent = true` pour autoriser opacity < 1.

Coût : 45 lerps simples = ~0.05 ms / frame.

---

## 8. Index sidebar et focus famille (préservés)

L'index latéral et la sélection par famille restent inchangés, ils
appellent `selectNode(id, true)` qui cascade dans la nouvelle pipeline.

---

## 9. Compatibilité avec `prune` et `focus-branche`

Quand `prune` filtre des nœuds, `3d-force-graph` les retire — leurs meshes
sont disposés. À la sortie de prune, ils sont recréés. Pas de fuite.

Quand `focus-branche` active sans prune : tous les meshes restent en scène
mais opacité descend à 0.18 pour les hors-branche.

---

## 10. Performance

| coût | mesure |
|---|---|
| création de 45 BilliardNode (canvas + texture + material + mesh) | ~30 ms boot |
| 45 CanvasTextures uploadées GPU | ~6 MB VRAM |
| boucle d'opacité par frame | ~0.05 ms |
| halo update (1 mesh face caméra) | ~0.01 ms |
| **total surcoût** | **~0.06 ms / frame** post-boot |

Cible 60 FPS desktop maintenue.

---

## 11. Tests d'acceptation

| test | critère |
|---|---|
| TB1 — texture lisible | nom visible quand face équatoriale tournée vers caméra |
| TB2 — pas de tooltip | aucune étiquette flottante au survol |
| TB3 — clic ouvre panneau | latence < 80 ms |
| TB4 — halo sélection | anneau or présent, face caméra, sans clignotement |
| TB5 — hover grow | grossissement smooth ×1.10 sans overshoot |
| TB6 — focus-branche | hors-branche → opacité 0.18, pas de texte |
| TB7 — drag node | repositionnement libre, position préservée |
| TB8 — FPS | ≥ 60 desktop |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_MODIFIED:       app/src/main.js (nodeThreeObject + lights),
                      app/src/colors.js (no change),
                      app/src/panel.js (frames section)
RISKS:                MeshPhysicalMaterial nécessite WebGL2 ;
                      45 textures canvas = 6 MB VRAM ;
                      ringGeom face-caméra à mettre à jour proprement
S_LOCAL:              n/a (UX)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    « interactivité » via tooltip flottant ; halo via glow
NEXT_ACTIONS:         exec immédiate (autorisée par mission V2)
```

🔶
