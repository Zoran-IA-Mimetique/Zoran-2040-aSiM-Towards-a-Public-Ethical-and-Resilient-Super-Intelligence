# TOPOLOGY AUDIT

**Mission Oracle** : `ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY
**Fichier audité** : `app/data/laws.json` (rev `6f8f699`)

Audit ciblé de la **topologie relationnelle réelle** : faux clusters,
faux attracteurs, inflation, redondances, collisions, branches mortes,
liens décoratifs.

---

## 0. Inventaire

| objet | count |
|---|---|
| nœuds | 50 |
| liens parent | ~45 |
| liens related | ~38 |
| liens contradictions | 1 |
| liens iso (implicites) | 5 (les nœuds ISO-* + leurs parents) |
| densité brute | 2.12 liens/nœud |
| familles déclarées | 10 |
| familles structurellement valides | 8 |

---

## 1. Faux clusters

### 1.1 « VAR » (5 nœuds)

| nœud | « parent » réel | conclusion |
|---|---|---|
| VAR-001 | DVE-002 | variante de DVE-002, pas membre d'une famille VAR |
| VAR-002 | DVE-003 + UDE-003 | pont DVE/UDE, pas membre |
| VAR-003 | ULG-002 + GHUC-002 | absorption, pas membre |
| VAR-004 | SDE-004 | variante de SDE-004 |
| VAR-005 | WP11-005 | variante de WP11-005 |

Aucune cohésion interne. Aucun moteur canonique racine. Aucun invariant
partagé. **Cluster artificiel** créé par l'étiquetage.

### 1.2 « ISO » (5 nœuds)

Idem. Chaque ISO-* est une relation entre 2 lois de familles distinctes.
Les regrouper sous une famille ISO crée un cluster qui n'existe pas
structurellement — chaque ISO appartient sémantiquement aux **deux** familles
qu'il relie, pas à un troisième cluster.

**Verdict** : VAR et ISO sont des **faux clusters de typage**. À dissoudre.

---

## 2. Faux attracteurs

### 2.1 ISO-005 — Méta-isomorphisme global

| critère | valeur |
|---|---|
| weight déclaré | 0.99 |
| related vers | 7 moteurs canoniques |
| invariants déclarés | aucun |
| démonstration de méta-isomorphisme | aucune |
| palier d'attracteur déclaré | aucun |

C'est l'archétype du **faux attracteur** : un nœud qui agglomère par
proximité déclarative sans démonstration. Effet gravitationnel sur la
topologie : toute future loi sera tentée de pointer vers lui.

**Verdict** : suspect critique. Voir `P0_5_SPEC.md §6`.

### 2.2 GHUC-001 — attracteur revendiqué

| critère | valeur |
|---|---|
| weight | 1.0 |
| description | « attracteur majeur » |
| palier déclaré | aucun |
| nombre de citations canoniques externes | 0 (aucune autre racine canonique ne le cite dans `related`) |

GHUC-001 est probablement un vrai attracteur méta (μ0 au sens
`P0_5_SPEC.md §1.3`) **mais le prédicat n'est pas vérifié**. L'absence de
citation externe canonique est une faiblesse : la consolidation
revendiquée doit être référencée par d'autres moteurs pour être un vrai μ0.

**Verdict** : reclassifier en μ1 (attracteur fort de famille) tant que la
condition `≥ 2 citations canoniques externes` n'est pas satisfaite.

### 2.3 PAL-001 — attracteur palieronique

Même problématique que GHUC-001. Reclassifier μ1.

---

## 3. Inflation structurelle

### 3.1 Inflation catégorielle

10/50 nœuds (20%) sont en réalité des relations promues en nœuds.
**Inflation = 20%**.

### 3.2 Inflation par templating

Chaque famille canonique a *exactement* 5 nœuds (1 racine + 4 enfants).
Cette uniformité est trop régulière pour être émergente. Probable artefact
de génération initiale.

**Conséquence** : la mesure `|F|` perd son pouvoir indicatif (toutes
identiques). Aucune famille n'est ni « petite » ni « grande ». Information
nulle.

### 3.3 Inflation par `related` same-family

Le champ `related` est utilisé entre nœuds de la même famille dans plusieurs
cas (ex. `WP11-002 related: ['WP11-004']`). Ces liens sont déjà capturés
par la hiérarchie `parent` et **dupliquent l'information**.

**Estimation** : ~12 liens `related` redondants sur 38 (~32% des `related`).

---

## 4. Redondances explicites

| paire | redondance |
|---|---|
| `ULG-001 → ULG-002 (parent)` ∧ `ULG-001 → ULG-005 (parent)` ∧ `ULG-005 → PAL-002 (children)` | chemin parallèle vers PAL via ULG suspect ; structure de pontage légitime mais à confirmer |
| `WP11-002 related WP11-004` ∧ `WP11-004 parent WP11-002` | identique, redondant |
| `WP11-003 related WP11-004` ∧ `WP11-004 parent WP11-003` | identique, redondant |
| `DVE-002 → VAR-001` ∧ `VAR-001 parent DVE-002` | la même relation vue deux fois |

**Verdict** : ~5–8 redondances explicites à nettoyer.

---

## 5. Collisions structurelles

Voir `audit/RELATIONAL_COLLISIONS.md` pour la liste exhaustive.

Synthèse ici :
- **C1** : VAR-002 multi-parent cross-family (DVE-003 + UDE-003) — collision
  catégorielle si VAR reste une famille.
- **C2** : VAR-003 multi-parent cross-family (ULG-002 + GHUC-002) — idem.
- **C3** : ISO-005 related vers 7 moteurs — gravité.
- **C4** : 1 seule contradiction sur 50 — sous-représentation (collision avec
  WP12-005 qui exige validation croisée multi-cadres).

---

## 6. Branches mortes

Critère : nœud sans enfants, weight < 0.50, et aucun related entrant.

| nœud | weight | children | related entrant |
|---|---|---|---|
| VAR-001 | 0.55 | aucun | aucun | — admissible si converti en arête
| VAR-002 | 0.42 | aucun | aucun | branche morte (mais utile comme exemple de fausse cohérence)
| VAR-003 | 0.30 | aucun | aucun | absorbée, à convertir en `absorbed_into`
| VAR-004 | 0.38 | aucun | aucun | branche morte instable
| VAR-005 | 0.50 | aucun | aucun | en cours, à clarifier
| WP12-003 | 0.69 | aucun | aucun | bord
| WP12-004 | 0.66 | aucun | aucun | bord

**Verdict** : 5/50 (10%) en zone morte. Acceptable après refactor (les VAR
disparaissent).

---

## 7. Liens décoratifs

Critère : lien qui n'ajoute pas d'information topologique (déjà déductible).

Estimation : ~8–10 liens (essentiellement des `related` between siblings
intra-famille).

---

## 8. Métriques topologiques (synthèse)

| métrique | valeur | seuil mou | seuil dur |
|---|---|---|---|
| densité (links/nodes) | 2.12 | 2.8 | 3.5 |
| inflation_ratio | 0.20 | 0.10 | 0.20 |
| `related` / `parent` | 0.84 | 0.7 | 1.0 |
| iso sans invariants | 5/5 (100%) | < 0.2 | 0 |
| contradictions / nodes | 0.02 | 0.04 (plancher) | 0.20 (plafond) |
| branches mortes / total | 0.10 | 0.10 | 0.20 |

**Status** : 4 métriques sur 6 sont **hors seuil mou** (inflation, iso sans
invariants, `related/parent`, contradictions/nodes plancher). Topologie en
zone d'avertissement, pas critique.

---

## 9. Honnêteté topologique (score)

```
HT = 1
   − 0.30 · (inflation_ratio > 0.15)
   − 0.20 · (iso sans invariants > 0.30)
   − 0.15 · (related/parent > 0.7)
   − 0.10 · (contradictions/nodes < 0.04)
   − 0.10 · (branches_mortes > 0.10)
   − 0.10 · (faux_attracteurs présents)
```

État actuel : `HT = 1 − 0.30 − 0.20 − 0.15 − 0.10 − 0.10 − 0.10 = 0.05`.

Score d'honnêteté topologique : **0.05 / 1.00**.

Après P0.5 (refactor + déclarations) : projection à **~0.80**.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json
RISKS:                inflation catégorielle 20% ; faux attracteur ISO-005 ;
                      iso sans invariants 100% ; redondance related/parent
S_LOCAL:              n/a (audit topologique)
S_GLOBAL:             n/a
TOP_COLLISIONS:       VAR-002 cross-family ; VAR-003 cross-family ; ISO-005 gravité ;
                      contradictions sous-représentées (calibration WP12-005 cassée)
TOP_FAKE_PATTERNS:    cluster VAR ; cluster ISO ; templating uniforme 5-par-famille ;
                      `related` intra-famille dupliquant `parent` ;
                      « attracteur » sans palier déclaré
NEXT_ACTIONS:         1. dissoudre VAR/ISO en arêtes (cf. EDGE_SYSTEM_SPEC.md)
                      2. nettoyer ~12 `related` redondants
                      3. statuer ISO-005
                      4. ajouter `attractor_tier` à GHUC-001, PAL-001, ULG-001
                      5. calibrer contradictions (≥ 3 supplémentaires)
```

🔶
