# FAILED FRACTAL CLAIMS

**Mission Oracle** : `ZORAN_FRACTAL_DEPTH_VALIDATION_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Inventaire exhaustif des occurrences du mot **« fractal »** (et variantes :
« fractale », « fractalité », « fractal-tree ») dans le repo, classées
admissible / inadmissible au sens `P0_5_ADMISSIBILITY.md A6`.

Un usage est **admissible** ssi :
- il cite une famille de preuve où `fractal_property` passe, OU
- il est explicitement qualifié comme métaphorique / aspirationnel.

Sinon il est **inadmissible** (à corriger).

---

## 1. Inventaire des occurrences

### 1.1 `README.md`

```
## Arbre Fractal des Lois — `app/`
…
visualisation 3D WebGL des 50 lois canoniques / variantes /
palieroniques / isomorphismes…
```

| | |
|---|---|
| qualité du claim | titre principal de la section produit |
| preuve attachée | aucune |
| qualification métaphorique | non |
| verdict | ❌ **inadmissible** |
| action | renommer en « Arbre Relationnel des Lois » jusqu'à P0.5 |

### 1.2 `app/index.html`

```html
<title>ZORAN — Arbre Fractal des Lois</title>
…
<span class="title">ZORAN <span class="dim">— Arbre Fractal des Lois</span></span>
```

| | |
|---|---|
| verdict | ❌ inadmissible × 2 (title + brand) |
| action | remplacer par « Arbre Relationnel des Lois » |

### 1.3 `app/src/main.js`

```javascript
console.log('%cZORAN — Arbre Fractal des Lois', '…');
```

| | |
|---|---|
| verdict | ❌ inadmissible |
| action | remplacer le label console |

### 1.4 `MISSION_LOG.md`

Plusieurs occurrences :
- titre `# MISSION LOG — ZORAN_FRACTAL_LAW_TREE_OMEGA`
- corps : « **ARBRE FRACTAL 3D VIVANT DES LOIS** »
- corps : « graphe fractal relationnel 3D navigable »
- corps : « élégance fonctionnelle / beauté émergente de la structure » (proxy)
- corps : « `linkDirectionalParticles` sur les liens parent » (lié à la "vivacité fractale")
- corps : « fractale auto-similaire » dans la description de `ULG-005`
- corps : « moteur vivant d'agrandissement » (proxy)

| | |
|---|---|
| verdict | ❌ inadmissible (le titre de mission est ancré dans le repo) |
| action | conserver le `mission_id` comme **identifiant historique** (pas une revendication présente) mais ajouter un encart explicite : *« le terme `FRACTAL_LAW_TREE` est ici un identifiant de mission, pas une propriété démontrée du livrable. Voir `audit/FRACTAL_VALIDATION.md` »* |

### 1.5 `app/data/laws.json`

#### 1.5.1 Famille `ULG`, nœud `ULG-005`

```json
{
  "id": "ULG-005", "title": "Propagation latente fractale",
  "domains": ["fractale", "propagation"],
  "html_description": "La propagation d'un signal dans le cadre latent suit une dynamique fractale auto-similaire."
}
```

| | |
|---|---|
| verdict | ⚠ **ambigu** |
| analyse | la *propagation* dans un cadre latent **peut** légitimement être qualifiée de fractale au sens dynamique (loi d'échelle `P(x,t) = P(λx, λ^H t)`). Mais la loi est **un énoncé local** ; elle ne démontre pas la fractalité du graphe ZORAN. |
| action | clarifier la portée : « fractalité de la dynamique de propagation, distincte de la fractalité du graphe lui-même ». Acceptable si scope précisé. |

### 1.6 `P0_5_SPEC.md`

Le document est meta : il **définit** la fractalité comme propriété cible.
Tous les usages sont des **définitions opérationnelles** ou des
**descriptions de l'objectif P0.5**. ✅ admissibles.

### 1.7 `audit/*.md` (les présents documents)

Tous les usages sont en contexte d'audit / démonstration / définition. ✅
admissibles.

### 1.8 `README.md` — bloc `## Règle cardinale`

```
détecteur `WP11-005` signale toute configuration où S_local − S_global > 0.30.
```

| | |
|---|---|
| verdict | ✅ admissible (claim factuel sur le détecteur, vérifiable) |

---

## 2. Récapitulatif

| fichier | occurrences | inadmissibles | ambiguës | admissibles |
|---|---|---|---|---|
| README.md | 1+ | 1 (titre section) | 0 | 1 (règle WP11) |
| app/index.html | 2 | 2 | 0 | 0 |
| app/src/main.js | 1 | 1 | 0 | 0 |
| MISSION_LOG.md | ~6 | 6 | 0 | 0 |
| app/data/laws.json | 1 | 0 | 1 (ULG-005) | 0 |
| P0_5_SPEC.md | nombreuses | 0 | 0 | toutes (définitions) |
| audit/*.md | nombreuses | 0 | 0 | toutes (audit) |

**Total à corriger** : ~10 occurrences publiques inadmissibles (hors docs
d'audit/spec qui ont licence définitionnelle).

---

## 3. Actions de correction (à exécuter par le builder en sortie d'Oracle)

| fichier | ligne / élément | remplacement proposé |
|---|---|---|
| `README.md` | `## Arbre Fractal des Lois` | `## Arbre Relationnel des Lois (vers P0.5 fractal)` |
| `app/index.html` | `<title>` | `ZORAN — Arbre Relationnel des Lois` |
| `app/index.html` | brand title | idem |
| `app/src/main.js` | `console.log` | `'ZORAN — Arbre Relationnel des Lois'` |
| `MISSION_LOG.md` | corps | ajouter encart §1.4 expliquant `mission_id` ≠ propriété démontrée |
| `app/data/laws.json` | `ULG-005.html_description` | préciser : *« dynamique de propagation fractale au sens dynamique (loi d'échelle), distincte de la fractalité du graphe ZORAN »* |

---

## 4. Quand le mot « fractal » redevient admissible

Le verrou est explicite :

```
admissible("fractal", scope) :⟺
   ∃ F ∈ Families : fractal_property(F) = vrai
   ∧ scope cite F comme preuve
```

Tant qu'aucune famille ne passe `fractal_property`, le terme reste sous
moratoire dans les artefacts publics. L'identifiant historique de mission
(`ZORAN_FRACTAL_LAW_TREE_OMEGA_20260515`) reste utilisable comme tag
documentaire mais ne constitue pas une revendication.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_FRACTAL_DEPTH_VALIDATION_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       README.md, app/index.html, app/src/main.js,
                      MISSION_LOG.md, app/data/laws.json
RISKS:                propagation lexicale (R1) ;
                      ULG-005 ambigu — confusion fractalité-dynamique vs fractalité-graphe
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    titre de produit comme revendication de propriété ;
                      mission_id réutilisé comme preuve
NEXT_ACTIONS:         (option A) appliquer les remplacements §3 → moratoire respecté
                      (option B) exécuter P0_5_SPEC §4 → ≥ 1 famille satisfait
                                  fractal_property → moratoire levé pour cette famille
```

🔶
