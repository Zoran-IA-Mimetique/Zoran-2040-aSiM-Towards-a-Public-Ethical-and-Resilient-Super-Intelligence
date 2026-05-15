# FRACTAL VALIDATION

**Mission Oracle** : `ZORAN_FRACTAL_DEPTH_VALIDATION_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY
**Fichier audité** : `app/data/laws.json`

Application des prédicats `fractal_property` (cf. `P0_5_SPEC.md §1.4`) sur
les 3 familles désignées : `ULG`, `GHUC`, `WP11`.

---

## 0. Rappel des 4 prédicats

```
fractal_property(F) :=
   P1: depth(F) ≥ 3
 ∧ P2: pattern_occurrences(M, F) ≥ 2     # motif reproductible
 ∧ P3: JS_divergence(role_dist(d=1), role_dist(d=2)) ≤ 0.15   # auto-similarité
 ∧ P4: Var(invariant_I, across scales) ≤ 0.10                 # invariant multi-échelle
```

---

## 1. Famille `ULG`

### 1.1 Inventaire

| nœud | parent | enfants déclarés | profondeur depuis racine |
|---|---|---|---|
| ULG-001 | — (racine) | ULG-002, ULG-003, ULG-004, ULG-005 | 0 |
| ULG-002 | ULG-001 | — | 1 |
| ULG-003 | ULG-001 | — | 1 |
| ULG-004 | ULG-001 | — | 1 |
| ULG-005 | ULG-001 | PAL-002 (hors famille) | 1 |

### 1.2 Évaluation

| prédicat | résultat |
|---|---|
| P1 — profondeur ≥ 3 | ❌ profondeur = 1 (tous les enfants sont feuilles dans la famille) |
| P2 — motif reproductible ≥ 2 | ❌ non applicable (profondeur insuffisante) |
| P3 — auto-similarité | ❌ non applicable |
| P4 — invariant multi-échelle | ❌ non applicable |

**Verdict ULG** : `fractal_property = FAUX`.

---

## 2. Famille `GHUC`

### 2.1 Inventaire

| nœud | parent | enfants déclarés |
|---|---|---|
| GHUC-001 | — (racine) | GHUC-002, GHUC-003, GHUC-004, GHUC-005 |
| GHUC-002 | GHUC-001 | — |
| GHUC-003 | GHUC-001 | — |
| GHUC-004 | GHUC-001 | — |
| GHUC-005 | GHUC-001 | — |

### 2.2 Évaluation

| prédicat | résultat |
|---|---|
| P1 — profondeur ≥ 3 | ❌ profondeur = 1 |
| P2..P4 | ❌ non applicables |

**Verdict GHUC** : `fractal_property = FAUX`.

---

## 3. Famille `WP11`

### 3.1 Inventaire

| nœud | parent | enfants déclarés |
|---|---|---|
| WP11-001 | — (racine) | WP11-002, WP11-003, WP11-004 |
| WP11-002 | WP11-001 | — |
| WP11-003 | WP11-001 | — |
| WP11-004 | WP11-001 | WP11-005 |
| WP11-005 | WP11-004 | — |

### 3.2 Évaluation

| prédicat | résultat | détail |
|---|---|---|
| P1 — profondeur ≥ 3 | ⚠ **borderline** | chemin le plus long `WP11-001 → WP11-004 → WP11-005` a longueur 2 (3 nœuds, 2 arêtes). Si « profondeur » = nombre d'arêtes, profondeur = 2 → ÉCHEC. Si « profondeur » = nombre de paliers distincts, paliers = 3 → succès marginal. |
| P2 — motif reproductible ≥ 2 | ❌ le motif `(noyau-mère, sous-prédicat, instance-d'audit)` n'apparaît qu'une fois (sur la chaîne 001→004→005). À profondeur identique, aucune réplique. |
| P3 — auto-similarité | ❌ la distribution des rôles à d=1 (4 enfants directs, tous prédicats simples) diffère de celle à d=2 (1 nœud unique, instance d'audit). JS-divergence ≈ 0.45 (largement > 0.15). |
| P4 — invariant multi-échelle | ❌ invariant testé : ratio `canonical/total` à chaque palier — palier 0 : 1/1, palier 1 : 3/3, palier 2 : 0/1. Variance ≈ 0.22 (> 0.10). |

**Verdict WP11** : `fractal_property = FAUX` (échec sur P2, P3, P4 même si
P1 est borderline-success).

---

## 4. Synthèse

| famille | P1 | P2 | P3 | P4 | fractal_property |
|---|---|---|---|---|---|
| ULG  | ❌ | ❌ | ❌ | ❌ | **FAUX** |
| GHUC | ❌ | ❌ | ❌ | ❌ | **FAUX** |
| WP11 | ⚠ | ❌ | ❌ | ❌ | **FAUX** |

**0/3** familles satisfont `fractal_property` dans le corpus actuel.

---

## 5. Pourquoi ces échecs

### 5.1 Cause structurelle commune

Toutes les familles ont été construites avec **un seul palier d'enfants
canoniques sous la racine**. C'est une arborescence à profondeur 1, pas une
structure fractale. La seule exception (WP11 avec WP11-005 sous WP11-004)
est isolée — elle n'établit pas un motif.

### 5.2 Cause sémantique

Le corpus a été conçu comme **typologie large** (couvrir les 7 moteurs)
plutôt que comme **étude approfondie** d'un moteur. Conséquence : breadth ≫
depth.

### 5.3 Cause conceptuelle

Aucune décomposition fractale n'a été conduite. Les enfants directs sont
des **dimensions** d'un moteur, pas des **récursions** du moteur. Décomposer
un moteur en dimensions n'est pas la même opération que produire un motif
auto-similaire.

---

## 6. Conditions minimales pour satisfaire `fractal_property`

Pour qu'une famille passe, P0.5 doit produire :

1. **Profondeur ≥ 3** (3 paliers de descendants canoniques sous la racine).
2. **Motif reproductible** : identifier un triplet de rôles
   `(noyau, dérivation, pont)` et le **répliquer** sur ≥ 2 sous-branches.
3. **Auto-similarité** : la distribution des rôles à profondeur `d` doit
   ressembler à celle à profondeur `d-1` (JS ≤ 0.15).
4. **Invariant** : un ratio ou une mesure observable doit rester stable
   d'une échelle à l'autre.

### Exemple constructif pour `WP11` (à exécuter en P0.5, pas ici)

```
WP11-001 (Cohérence)
├── WP11-002 (S_local)
│   ├── WP11-002-a (mesure intra-attracteur)        ← motif M, scale 1
│   │   ├── WP11-002-a-i (test sur attracteur fort)  ← motif M, scale 2
│   │   └── WP11-002-a-ii (test sur attracteur faible)
│   └── WP11-002-b (mesure inter-attracteur)
│       ├── WP11-002-b-i (...)
│       └── WP11-002-b-ii (...)
├── WP11-003 (S_global)
│   └── (idem)
└── WP11-004 (Distinction)
    └── WP11-005 (Détection de fausse cohérence)
```

Profondeur 3 ✓, motif `(mesure, test, cas-frontière)` répété ✓,
auto-similarité plausible ✓.

C'est **un exemple structurel**, pas une commande d'exécution. P0.5 décide,
n'exécute pas.

---

## 7. Conséquence sur le label « fractal »

Tant qu'aucune famille ne satisfait `fractal_property`, le terme « fractal »
appliqué au système ZORAN est **inadmissible** au sens
`P0_5_ADMISSIBILITY.md A6`.

Voir `audit/FAILED_FRACTAL_CLAIMS.md` pour les occurrences à corriger.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_FRACTAL_DEPTH_VALIDATION_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json (50 nœuds)
RISKS:                garder le terme « fractal » publiquement
                      sans démonstration → dérive lexicale (R1)
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       0/3 familles passent fractal_property
TOP_FAKE_PATTERNS:    arborescence à profondeur 1 étiquetée « fractale » ;
                      enfants comme « dimensions » et non « récursions »
NEXT_ACTIONS:         1. soit suspendre l'usage de « fractal »
                      2. soit exécuter P0.5 §4 (approfondissement)
                      3. dans tous les cas : aucune communication
                         publique avec « fractal » sans citer la famille de preuve
```

🔶
