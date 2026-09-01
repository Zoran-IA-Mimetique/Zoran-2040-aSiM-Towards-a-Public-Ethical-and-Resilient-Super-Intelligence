# CURVED LABEL RENDERING

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec + exec autorisée

Rendu du nom de la loi **directement sur la matière de la sphère**. Aucun
label flottant, aucune étiquette HTML par-dessus. Le texte fait partie de
la sphère.

---

## 1. Choix technique : Canvas Texture + UV mapping standard

Three.js applique la `SphereGeometry` avec un mapping UV cylindrique :
- `u ∈ [0, 1]` parcourt la longitude (0 à 2π)
- `v ∈ [0, 1]` parcourt la latitude (pôle nord à pôle sud)

Conséquence : un texte rendu horizontalement sur une bande équatoriale du
canvas apparaît comme **une bande de texte autour de l'équateur de la
sphère**. C'est exactement le rendu « numéro de boule de billard ».

Avantages :
- Rendu natif Canvas — police nette, kerning correct.
- Aucune géométrie supplémentaire (pas de TextGeometry coûteuse).
- Texture mise en cache (mais unique par nœud à cause du label).
- Réagit au matériau (clearcoat, lumière) — le texte « brille » avec la sphère.

---

## 2. Spécification canvas

```
canvas.width  = 512
canvas.height = 256        // ratio 2:1 → wrap propre
ctx.imageSmoothingEnabled = true
```

### Background : couleur du nœud + dégradé radial subtil

```js
const grad = ctx.createRadialGradient(256, 128, 30, 256, 128, 280);
grad.addColorStop(0.0, lighten(baseColor, 0.10));
grad.addColorStop(0.7, baseColor);
grad.addColorStop(1.0, darken(baseColor, 0.20));
ctx.fillStyle = grad;
ctx.fillRect(0, 0, 512, 256);
```

Le dégradé radial crée l'illusion d'une matière 3D sous-jacente, **avant**
même que la lumière physique du shader n'opère. Très subtil.

### Bande équatoriale (zone du label)

Une bande horizontale légèrement plus claire pour isoler optiquement le
texte :

```js
const bandGrad = ctx.createLinearGradient(0, 80, 0, 176);
bandGrad.addColorStop(0.0, "rgba(255,255,255,0.00)");
bandGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
bandGrad.addColorStop(1.0, "rgba(255,255,255,0.00)");
ctx.fillStyle = bandGrad;
ctx.fillRect(0, 80, 512, 96);
```

### Texte (nom de la loi)

Pour les nœuds canoniques (`canonical=true`) : taille **80 px** ; sinon
**60 px** (les sous-lois sont plus petites par radius — le texte plus
petit reste proportionné).

```js
const isCanonical = node.canonical;
const fontSize = isCanonical ? 80 : 60;
ctx.font = `700 ${fontSize}px "JetBrains Mono", "Menlo", monospace`;
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.shadowColor = "rgba(0,0,0,0.45)";
ctx.shadowBlur = 4;
ctx.shadowOffsetY = 2;

// Couleur de texte contrastante par rapport au baseColor
const textColor = pickContrastingColor(baseColor);  // noir profond ou blanc cassé
ctx.fillStyle = textColor;
ctx.fillText(node.id, 256, 128);
ctx.shadowColor = "transparent";
```

### Petit indicateur tier (μ0 / μ1) optionnel, en haut

```js
if (node.attractor_tier) {
  ctx.font = '600 22px "Inter", sans-serif';
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(node.attractor_tier, 256, 50);
}
```

---

## 3. Choix de couleur de texte

```js
function pickContrastingColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#0a0d14" : "#f0f3fa";
}
```

- Sur fond clair (jaune attractor, vert variant clair) → texte noir profond.
- Sur fond sombre (bleu canonical, violet palieronic) → texte presque blanc.

Maximise la lisibilité sans utiliser de halo ou outline criards.

---

## 4. Construction du Texture Three.js

```js
const tex = new THREE.CanvasTexture(canvas);
tex.colorSpace  = THREE.SRGBColorSpace;
tex.anisotropy  = renderer.capabilities.getMaxAnisotropy();
tex.minFilter   = THREE.LinearMipMapLinearFilter;
tex.magFilter   = THREE.LinearFilter;
tex.needsUpdate = true;
```

`anisotropy` rend le texte net même à angle rasant.

---

## 5. Cache et invalidation

- Une texture par `node.id` (45 textures total).
- Cache persistant : `Map<id, CanvasTexture>` ; pas de re-création à
  chaque `refresh()`.
- Invalidation : si la couleur change (ex. attractor_tier change), la
  texture est régénérée.

---

## 6. Lisibilité multi-distance

| zoom | rendu attendu |
|---|---|
| très loin (> 200u) | sphère colorée, texte illisible (mais visible comme indice) |
| moyen (50–200u) | texte commence à devenir lisible |
| proche (< 50u) | texte parfaitement lisible, brillance clearcoat visible |

Pas de bascule de label : la matière est unique. La lisibilité émerge
naturellement du zoom.

---

## 7. Pas d'animation périodique

- La texture est statique.
- Aucune rotation forcée de la sphère pour exposer le texte.
- L'utilisateur tourne la caméra — c'est lui qui révèle le label.

---

## 8. Mobile / DPR

```js
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width  = 512 * dpr;
canvas.height = 256 * dpr;
ctx.scale(dpr, dpr);
```

Garantit la netteté sur écran HiDPI sans gonfler la VRAM sur mobile
bas-de-gamme (clamp à 2×).

---

## 9. Performance

| opération | coût |
|---|---|
| construction d'un canvas 512×256 + dessin | ~0.6 ms |
| upload texture GPU | ~1 ms |
| ×45 nœuds | ~70 ms total **au boot** |
| ensuite : 0 ms (cache) | — |

Acceptable. Boot total reste sous 200 ms.

---

## 10. Non-buts

- ❌ texte 3D (TextGeometry) — coûteux et illisible à distance moyenne
- ❌ texte via shader fragment custom — maintenance et risque GPU
- ❌ texte SVG plaqué — moins net que canvas natif
- ❌ texte qui suit la position du curseur (parasite)
- ❌ texte qui change de contenu au zoom (incohérence)

---

## 11. Tests d'acceptation

| test | critère |
|---|---|
| TC1 — netteté | au zoom proche, texte sans aliasing |
| TC2 — contraste | lisible sur toutes les couleurs de la palette |
| TC3 — équateur | texte bien centré sur l'équateur géométrique |
| TC4 — pas de débordement | aucune lettre ne déborde du canvas |
| TC5 — anisotropy | net même à angle rasant |
| TC6 — DPR HiDPI | net sur Retina |
| TC7 — perf boot | total boot ≤ 250 ms |
| TC8 — VRAM | < 12 MB total textures |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_MODIFIED:       app/src/main.js (makeBilliardTexture helper)
RISKS:                pickContrastingColor binaire — peut produire un texte
                      moyennement contrasté sur certains tons ;
                      DPR clampé à 2 — perte légère sur 3× HiDPI rares
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    label HTML floating ; texte 3D coûteux
NEXT_ACTIONS:         exec dans main.js : helper makeBilliardTexture +
                      cache Map<id, texture>
```

🔶
