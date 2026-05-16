# GLOBAL_RUNTIME_COUNTERS — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `MULTI_CORE_PATTERN_ENGINE.md`, `RUNTIME_ADMISSIBILITY_ENGINE.md`,
`app/src/main.js` (lignes 325-348, `setStatus()`)

---

## 1. Ligne enrichie du statusbar

La barre de statut publie désormais **9 compteurs** synchronisés
sur la vue courante (`state.graphView`), une seule ligne :

```
nodes 241 · links 397 · fam 8 · ★29 · frugal 65 · toxic 3 · sandbox 120 · runtime 101 · cores 8
```

Chaque compteur est dérivé à chaque appel de `setStatus()` — recalcul
O(n) sur 241 nœuds, négligeable à 60 FPS. Les compteurs `sandbox` et
`cores` sont hydratés au boot depuis des fichiers JSON externes
(`laws_sandbox.json`, `cores.json`) puis cachés dans `state`.

## 2. Filtres et sources

| compteur   | source / filtre                                                    | run |
|------------|--------------------------------------------------------------------|----:|
| `nodes`    | `state.graphView.nodes.length`                                     | 241 |
| `links`    | `state.graphView.links.length`                                     | 397 |
| `fam`      | `state.graphView.families?.length`                                 |   8 |
| `★`        | `superior_law_candidate === true`                                  |  29 |
| `frugal`   | `(frugality_score ?? 0) >= 0.65`                                   |  65 |
| `toxic`    | `experimental_classes.includes('toxique_propagationnelle')`        |   3 |
| `sandbox`  | `state.sandboxCount` (← `app/data/laws_sandbox.json` au boot)      | 120 |
| `runtime`  | `threshold_admissibility === true`                                 | 101 |
| `cores`    | `state.coresDetected` (← `app/data/cores.json.core_count` au boot) |   8 |

## 3. Intégration boot

Lors du chargement de l'app, deux fetch JSON peuplent les caches :

```js
state.sandboxCount   = sandbox.laws?.length ?? 0;   // 120
state.cores          = await fetch('./data/cores.json').then(r => r.json());
state.coresDetected  = state.cores.core_count;      // 8
```

`setStatus()` est appelé après chaque mutation de vue (pruning,
oracle, sélection de branche). Les compteurs `sandbox` et `cores`
restent stables sur toute la session — invariants externes.

## 4. Sémantique opérationnelle

Les compteurs forment une **carte d'identité runtime** lisible
d'un coup d'œil :

- `★29 / 241 = 12.0%` → fraction de lois supérieures candidates.
- `frugal 65 / 241 = 27.0%` → masse frugale (seuil 0.65).
- `runtime 101 / 241 = 41.9%` → admissibles publication.
- `sandbox 120` → bassin expérimental hors-graphe principal.
- `cores 8` → couches émergentes actives (cf. Layer Manager).
- `toxic 3` → lois marquées propagation toxique (verrouillage runtime).

L'opérateur peut diagnostiquer une dérive (ex. `toxic` qui grimpe,
`★` qui chute) sans ouvrir un seul panneau détaillé.
