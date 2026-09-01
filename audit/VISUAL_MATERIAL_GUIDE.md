# VISUAL MATERIAL GUIDE

**Mission** : `ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515`
**Timestamp** : `2026-05-15T19:24:00+02:00`
**Mode** : spec

Matériel visuel des sphères. Objectif : **boules de billard haut de gamme**,
calme, élégance scientifique. Pas de néon, pas de SF, pas de plastique.

---

## 1. Choix de matériau

| matériau Three.js | retenu ? | raison |
|---|---|---|
| `MeshBasicMaterial`     | ❌ | aucune réaction à la lumière |
| `MeshLambertMaterial`   | ❌ | mat, sans reflet |
| `MeshPhongMaterial`     | ⚠ | reflet possible mais aspect plastique |
| `MeshStandardMaterial`  | ✅ alternative | PBR léger |
| `MeshPhysicalMaterial`  | ✅ **retenu** | PBR + clearcoat → aspect billard |

**Décision** : `MeshPhysicalMaterial` avec clearcoat léger.

---

## 2. Paramètres cibles

Pour chaque nœud, instancier :

```js
new THREE.MeshPhysicalMaterial({
  color: node.color,        // couleur de la palette (cf. colors.js)
  metalness: 0.15,          // léger métal pour densité de matière
  roughness: 0.45,          // surface fine, pas de miroir
  clearcoat: 0.35,          // couche de vernis légère
  clearcoatRoughness: 0.20, // vernis propre mais pas miroir
  reflectivity: 0.30,
  envMapIntensity: 0.8,
  transparent: false,
  opacity: 1.0
});
```

Valeurs justifiées :
- `metalness: 0.15` : nuance — pas un métal (pas dauphin chromé) mais une
  matière dense (résine pigmentée pleine).
- `roughness: 0.45` : reflet doux, pas de hot-spot agressif.
- `clearcoat: 0.35` : vernis perceptible quand la lumière passe en
  rasance, invisible de face → précis sans surcharge.
- `envMapIntensity: 0.8` : si une env map est fournie, intensité modérée.

---

## 3. Éclairage de scène

L'app ne déclare pas explicitement de lumières (le moteur 3d-force-graph
utilise une lumière par défaut). Pour profiter du PBR/clearcoat il faut :

```js
const ambient = new THREE.AmbientLight(0x202838, 0.45);
const key     = new THREE.DirectionalLight(0xffffff, 0.7);
key.position.set(60, 80, 40);
const rim     = new THREE.DirectionalLight(0x6080a0, 0.25);
rim.position.set(-40, -20, -60);
scene.add(ambient, key, rim);
```

- `ambient` froid pour ne pas écraser les couleurs.
- `key` chaud-neutre légèrement décalé en haut à droite.
- `rim` froid en contre-jour pour la séparation des sphères du fond sombre.

Pas de point light décoratif. Pas de spotlights animés.

---

## 4. EnvMap optionnelle

Pour pousser l'aspect billard, charger une env map procédurale simple :

```js
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;
```

`RoomEnvironment` (importable depuis `three/examples/jsm/environments/`) est
une env neutre par procédure. Coût ~5 ms au boot, ensuite 0.

Si la complexité de chargement est un blocage, sauter l'env map : les
clearcoats fonctionnent sans, juste moins éclatants.

---

## 5. Différenciation par tier

Les attracteurs μ0 et μ1 reçoivent un **boost subtil** de clearcoat :

| tier | clearcoat | clearcoatRoughness | reflectivity |
|---|---|---|---|
| `μ0` | 0.55 | 0.15 | 0.40 |
| `μ1` | 0.45 | 0.18 | 0.35 |
| autre canonique | 0.35 | 0.20 | 0.30 |
| autre | 0.25 | 0.25 | 0.20 |

L'œil perçoit les μ0 comme « plus polis », sans dorure agressive.

---

## 6. Géométrie

- `SphereGeometry(radius, 32, 16)` : 32 segments horizontaux, 16
  verticaux. Suffisant pour silhouette propre à toutes distances utiles.
- Pas de bevel, pas d'icosaèdre stylisé.
- Rayon : `2 + (n.weight ?? 0.5) * 10` (déjà appliqué actuellement).

---

## 7. État `selected` — halo

Pas de glow externe. À la place : un **anneau** mince autour de la sphère
sélectionnée :

```js
const ringGeom = new THREE.TorusGeometry(radius * 1.18, 0.08, 8, 32);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xffcc4d, transparent: true, opacity: 0.9
});
const ring = new THREE.Mesh(ringGeom, ringMat);
ring.lookAt(camera.position); // toujours face caméra
```

Mise à jour de l'orientation à chaque frame. Aucune animation, juste un
anneau toujours face caméra. Disparaît à désélection.

---

## 8. État `hover` — grossissement

Cf. `INTERACTIVE_NODE_SPEC.md §2`. Implémentation :

```js
const targetScale = isHovered ? 1.10 : 1.0;
mesh.scale.x += (targetScale - mesh.scale.x) * 0.15;
mesh.scale.y += (targetScale - mesh.scale.y) * 0.15;
mesh.scale.z += (targetScale - mesh.scale.z) * 0.15;
```

Interpolation linéaire chaque frame ; converge en ~150 ms. Pas de spring,
pas d'overshoot.

---

## 9. Liens (lignes)

Pas de matériau physique sur les arêtes : `LineBasicMaterial` suffit.
Largeur : déjà spécifiée dans `main.js`. Pas de glow. Pas de tube 3D
(coûteux et bruyant). Pas de gradient le long du lien.

---

## 10. Interdictions absolues

| interdit | raison |
|---|---|
| ❌ effet bloom / post-FX | bruit lumineux |
| ❌ god rays | esthétique SF agressive |
| ❌ chromatic aberration | distraction inutile |
| ❌ lens flare | NFT-galaxy |
| ❌ DOF (depth of field) | masque la lisibilité à distance |
| ❌ animation matériel (color shift, breathing) | bruit permanent |
| ❌ shaders custom complexes | maintenance coûteuse pour gain minimal |

---

## 11. Coût performance estimé

| élément | coût frame |
|---|---|
| 45 `MeshPhysicalMaterial` | ~0.6 ms (matériau partagé non possible si couleurs différentes — mais matériau peut être instancié par tier) |
| clearcoat shader | +0.2 ms vs Phong |
| env map sampling | +0.3 ms |
| 3 directional lights | +0.1 ms |
| anneau sélection (×1) | négligeable |
| **total surcoût** | **~1.2 ms** par frame |

Budget OK. Le surcoût est faible et **statique** : pas d'animation.

---

## 12. Tests d'acceptation

| test | critère |
|---|---|
| TM1 — apparence billard | reflet doux visible en rotation lente, pas miroir |
| TM2 — pas de plastique | matière dense, fond sombre sans halo plastique |
| TM3 — couleurs préservées | la palette reste lisible sous clearcoat |
| TM4 — μ0 visible | les μ0 se distinguent par leur poli sans dorure outrancière |
| TM5 — halo sélection | anneau présent, face caméra, ni clignotant ni rotatif |
| TM6 — hover grow | grossissement perçu mais discret (1.10×) |
| TM7 — pas de bloom | aucun débordement lumineux entre nœuds proches |
| TM8 — FPS | ≥ 60 desktop maintenu |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_LAW_NODES_P0_5_20260515
TIMESTAMP:            2026-05-15T19:24:00+02:00
FILES_ANALYZED:       app/src/main.js, 3d-force-graph CDN
RISKS:                clearcoat shader coûteux sur GPU intégré ;
                      env map procédurale au boot peut blanker 100 ms ;
                      45 matériaux distincts non poolables
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       MeshPhysicalMaterial demande WebGL2 (à vérifier
                      sur cibles mobile anciennes) ; fallback Phong
TOP_FAKE_PATTERNS:    « élégance » via glow ; « profondeur » via DOF
NEXT_ACTIONS:         à l'exécution : créer matériau par tier (4 instances,
                      pas 45) avec color override ; ajouter 3 lights ;
                      env map en fonction des perf
```

🔶
