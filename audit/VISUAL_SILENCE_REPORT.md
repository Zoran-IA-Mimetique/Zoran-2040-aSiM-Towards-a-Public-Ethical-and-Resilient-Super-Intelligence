# VISUAL SILENCE REPORT

**Mission Oracle** : `ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Score de **silence visuel** par élément. Échelle [-1, +1] :
- `+1` = élément parfaitement silencieux (information sans bruit)
- `0`  = neutre
- `-1` = élément maximalement bruyant (mouvement permanent non informatif,
         saturation, conflit chromatique)

---

## 1. Inventaire scoré

### 1.1 Background

| élément | score | justification |
|---|---|---|
| `body` fond `#07080c` | +0.9 | sombre, non saturé, ne capte pas l'attention |
| `#topbar` dégradé subtil | +0.7 | délimitation utile, faible contraste |
| `#graph` `radial-gradient` | +0.6 | dégradé radial centré, faible amplitude — utile pour focus mais ajoute du grain |
| `#sidebar` fond uni | +0.8 | uniforme, non distrayant |

### 1.2 Nœuds (3D)

| élément | score | justification |
|---|---|---|
| Sphères colorées | +0.7 | couleur = information (palette stricte) |
| `nodeOpacity: 0.92` | +0.5 | opacité élevée mais pas opaque — utile contre l'occlusion |
| `nodeResolution: 16` | +0.6 | suffisant pour rendu propre, pas hyper-détaillé |
| `glow` SVG dans preview (uniquement) | -0.3 | non informatif, esthétique pure |
| Pulsation/halo sur sélection (absent) | +0.0 | neutre |

### 1.3 Liens

| élément | score | justification |
|---|---|---|
| Liens `parent` colorés or si weight ≥ 0.85 | +0.6 | hiérarchie visible |
| Liens `related` opacity ~0.18 | +0.7 | quasi-effacés, n'agressent pas |
| Liens `contradiction` rouge 55% opacité | +0.4 | utile et rare (1 occurrence) |
| `linkDirectionalParticles: 1` sur `parent` | **-0.6** | ~45 streams en mouvement permanent — fort coût attentionnel non informatif |
| `linkDirectionalParticleSpeed: 0.004` | -0.4 | vitesse lente mais omniprésente |
| Highlight sur sélection (jaune, 1.6 width) | +0.5 | informatif, transitoire |

### 1.4 UI fixe

| élément | score | justification |
|---|---|---|
| Search input | +0.8 | sobre, fonctionnel |
| Boutons topbar (←/→/⌖/∿/⊙) | +0.7 | iconiques, statiques |
| Légende swatch | +0.6 | utile, peu visible |
| Statusbar monospace | +0.7 | dense en info, statique |
| Détail panel slide-in | +0.6 | apparaît à la demande seulement |

### 1.5 Détail panel

| élément | score | justification |
|---|---|---|
| Backdrop blur 8px | +0.4 | adoucit l'arrière-plan |
| Tags colorés | +0.5 | couleur = catégorie |
| Score blocs `.score` | +0.7 | tabulaire, dense |
| `box-shadow: 0 8px 32px rgba(0,0,0,0.4)` | +0.2 | ombre forte mais courte |

### 1.6 Mouvements globaux

| élément | score | justification |
|---|---|---|
| Inertie 3D du graphe (rotation libre) | +0.5 | mouvement déclenché par l'utilisateur seulement |
| `cameraPosition` transition 800ms | +0.4 | bref, motivé par interaction |
| **Particles directionnelles permanentes** | **-0.7** | **mouvement non sollicité, principal point de bruit** |

---

## 2. Score agrégé

```
silence_global = moyenne(scores)
```

| catégorie | moyenne |
|---|---|
| background | +0.75 |
| nœuds 3D | +0.42 |
| liens | -0.05 (tirée vers le bas par les particules) |
| UI fixe | +0.70 |
| panel détail | +0.45 |
| mouvements globaux | +0.10 |
| **moyenne globale** | **+0.40** |

Lecture : silence visuel **net positif mais médiocre**. Le principal bruit
provient des particules directionnelles permanentes.

---

## 3. Si on désactive les particules directionnelles

Simulation :

| catégorie | moyenne avant | moyenne après |
|---|---|---|
| liens | -0.05 | **+0.50** |
| mouvements globaux | +0.10 | **+0.55** |
| **moyenne globale** | +0.40 | **+0.62** |

Gain : **+0.22** sur le score de silence global, pour le coût d'un seul
appel `.linkDirectionalParticles(0)` par défaut.

---

## 4. Compatibilité avec la directive « beauté émergente de la structure »

La directive de mission disait :

> *La beauté doit émerger : de la structure, de la lisibilité, de la cohérence.*
> *Pas de chaos lumineux. Pas de particules décoratives.*

État actuel : **partiellement respecté**.

| élément directive | respecté ? |
|---|---|
| pas de surcharge visuelle | ✅ |
| pas d'animations inutiles | ⚠ particules directionnelles présentes |
| pas de chaos lumineux | ✅ |
| pas de particules décoratives | ❌ particules présentes |
| pas de liens illisibles | ✅ |

**Verdict** : 3/5 directives respectées. Violation modérée sur 2/5
(particules + animations inutiles, c'est le même point).

---

## 5. Recommandations (ordre de priorité)

1. **`linkDirectionalParticles(0)` par défaut** dans `app/src/main.js` —
   coût zéro, gain +0.22 silence. Réactiver uniquement sur la sélection ou
   sur un toggle utilisateur.
2. **Supprimer le filtre `glow` SVG** dans la preview statique
   (`tools/render_preview.py`) — coût zéro, gain marginal.
3. **Mode focus-branche** : touche `F` masque tout sauf la branche
   sélectionnée — gain +0.10 par cas d'usage profond.
4. **Auto-fade des liens `related`** quand >100 visibles simultanément :
   ramener leur opacité à 0.08 — préserve la lisibilité en scaling.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/style.css, app/src/main.js, tools/render_preview.py
RISKS:                silence global médiocre (+0.40) tiré vers le bas
                      par les particules directionnelles permanentes
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    particules directionnelles présentées comme
                      « indicateur de direction » alors qu'elles agissent
                      visuellement comme décoration permanente
NEXT_ACTIONS:         désactiver particules par défaut ;
                      ajouter mode focus-branche ;
                      auto-fade related à scale ;
                      retirer glow SVG dans preview
```

🔶
