# P0.5 — ADMISSIBILITY

**Mission Oracle** : `ZORAN_P0_5_HONESTY_AUDIT_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Critères d'admissibilité formels. Chaque objet structurel du graphe ZORAN
(nœud, lien, famille, claim) reçoit un prédicat booléen. Audit du corpus
actuel `app/data/laws.json` contre ces prédicats.

---

## A1. Admissibilité d'un **nœud-loi**

Un nœud `n` est admissible **ssi** tous les prédicats suivants passent :

```
A1_id_unique(n)
A1_family_canonique(n)       # n.family ∈ {ULG, DVE, UDE, GHUC, WP11, WP12, SDE, PAL}
A1_S_local_range(n)          # n.S_local ∈ [0, 1]
A1_S_global_range(n)         # n.S_global ∈ [0, 1]
A1_description_min(n)        # len(n.html_description) ≥ 40
A1_grounding_min(n)          # |n.equations| ≥ 1 ∨ |n.examples| ≥ 1
A1_parents_resolved(n)       # ∀p ∈ n.parents : p ∈ Nodes
A1_no_self_loop(n)           # n.id ∉ (n.parents ∪ n.children ∪ n.related ∪ n.contradictions)
```

### Audit du corpus actuel (50 nœuds)

| prédicat | passes | échecs |
|---|---|---|
| A1_id_unique | 50/50 | — |
| A1_family_canonique | 40/50 | 10 (VAR-* + ISO-*) |
| A1_S_local_range | 50/50 | — |
| A1_S_global_range | 50/50 | — |
| A1_description_min | 50/50 | — |
| A1_grounding_min | 50/50 | — |
| A1_parents_resolved | 50/50 | — |
| A1_no_self_loop | 50/50 | — |

**Verdict** : 40/50 nœuds admissibles. 10 inadmissibles (VAR-001..005 et
ISO-001..005) au titre de `A1_family_canonique`. Ils doivent être convertis
en arêtes (cf. `EDGE_SYSTEM_SPEC.md`).

---

## A2. Admissibilité d'un **lien (relation)**

Un lien `l` est admissible **ssi** :

```
A2_endpoints_resolved(l)     # l.source, l.target ∈ Nodes
A2_kind_known(l)             # l.kind ∈ {parent, derives, iso, contradicts, related, absorbed_into, depends}
A2_no_self_loop(l)           # l.source ≠ l.target
A2_no_duplicate(l)           # ¬∃l' : (l'.source, l'.target, l'.kind) = (l.source, l.target, l.kind)
A2_iso_requires_invariants(l)# l.kind = 'iso' ⇒ l.invariants : string[] non vide
A2_contradicts_symmetric(l)  # l.kind = 'contradicts' ⇒ ∃l' inverse OU déclaré asymétrique
A2_parent_forms_DAG(l)       # ajout du lien parent ne crée pas de cycle
```

### Audit du corpus actuel (106 liens)

| prédicat | passes | échecs / observations |
|---|---|---|
| A2_endpoints_resolved | 106/106 | — |
| A2_kind_known | 106/106 | actuellement seulement `parent`/`related`/`contradiction` utilisés |
| A2_no_self_loop | 106/106 | — |
| A2_no_duplicate | ~104/106 | 2 doublons potentiels (related symétriques) |
| A2_iso_requires_invariants | n/a | aucun lien typé `iso` actuellement (les iso sont des nœuds) |
| A2_contradicts_symmetric | 0/1 | 1 contradiction unique non-réciproque (WP11-005→UDE-003 sans réciproque) |
| A2_parent_forms_DAG | 106/106 | DAG validé |

**Verdict** : 1 violation explicite (`A2_contradicts_symmetric`), 2
quasi-violations à confirmer. Après refactor §3 du SPEC, le critère
`A2_iso_requires_invariants` devient applicable et **doit** être respecté.

---

## A3. Admissibilité d'une **famille**

Une famille `F` est admissible **ssi** :

```
A3_canonical_root_unique(F)  # ∃!r ∈ F : r.canonical = true ∧ r.parents = []
A3_invariant_declared(F)     # F.invariant : string non vide
A3_min_size(F)               # |F| ≥ 3 (1 racine + 2 enfants au minimum)
A3_max_size_loose(F)         # |F| ≤ 12 (au-delà : famille à splitter)
A3_internal_coherence(F)     # moyenne S_local sur F ≥ 0.75
A3_external_bridges(F)       # F a ≥ 1 lien (parent/iso/related) sortant vers ≠ F
```

### Audit du corpus actuel (10 familles)

| famille | A3_canonical_root | A3_invariant | A3_min_size | A3_max_size | A3_internal | A3_bridges |
|---|---|---|---|---|---|---|
| ULG  | ✅ | ❌ (non déclaré) | ✅ (5) | ✅ | ✅ (0.91) | ✅ |
| DVE  | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.90) | ✅ |
| UDE  | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.87) | ✅ |
| GHUC | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.91) | ✅ |
| WP11 | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.94) | ✅ |
| WP12 | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.90) | ✅ |
| SDE  | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.88) | ✅ |
| PAL  | ✅ | ❌ | ✅ (5) | ✅ | ✅ (0.85) | ✅ |
| VAR  | ❌ (5 racines, pas une famille) | ❌ | — | — | — | — |
| ISO  | ❌ (5 racines, pas une famille) | ❌ | — | — | — | — |

**Verdict** :
- 8 familles canoniques **valides après ajout de l'invariant déclaré**
  (déjà spécifié dans `P0_5_SPEC.md §2`).
- 2 familles (VAR, ISO) **inadmissibles** : à dissoudre en arêtes.

---

## A4. Admissibilité d'un **claim** (énoncé propriété)

Une affirmation `C` portant sur le graphe est admissible **ssi** :

```
A4_predicate_attached(C)     # C est lié à un prédicat formel vérifiable
A4_evidence_pointer(C)       # C cite ≥ 1 source (nœud, lien, mesure) du graphe
A4_falsifiable(C)            # il existe une configuration où C serait faux
A4_no_inference_jump(C)      # C ne déduit pas S_global de S_local (WP11-004)
A4_scope_declared(C)         # C précise sa portée (local / famille / global)
```

### Audit des claims actuels

| claim | source | A4 status |
|---|---|---|
| « Arbre Fractal des Lois » | README.md, index.html | ❌ A4_predicate_attached échoue (aucun prédicat formel n'est attaché à « fractal ») |
| « Topologie de cohérence » | README.md | ❌ A4_predicate_attached échoue |
| « 50 lois canoniques » | MISSION_LOG.md | ⚠ A4_evidence_pointer OK mais « canoniques » imprécis (10/50 le sont strictement) |
| « S_global = 0.779 » | UI statusbar | ❌ A4_no_inference_jump : moyenne présentée comme cohérence systémique |
| « Attracteur majeur ISO-005 » | laws.json description | ❌ A4_predicate_attached : palier d'attracteur non déclaré, invariant absent |
| « Variante absorbée VAR-003 » | laws.json | ✅ A4 OK (claim local, prédicat clair) |
| « Détection de fausse cohérence (WP11-005) » | laws.json | ✅ A4 OK |

**Verdict** : 4 claims publics inadmissibles, 1 ambigu, 2 OK. Les 4
inadmissibles dégradent S_global directement par dérive lexicale (cf. `R1`
dans `P0_5_RISKS.md`).

---

## A5. Admissibilité du label **« attracteur »**

Le terme « attracteur » est admissible sur un nœud `n` **ssi** :

```
A5_tier_declared(n)          # n.attractor_tier ∈ {μ0, μ1, μ2}
A5_predicate_tier(n)         # cf. P0_5_SPEC §1.3 — prédicat du palier passe
A5_no_inflation(n)           # n n'est pas simultanément déclaré μ0 sans 2 citations canoniques
```

### Audit corpus actuel

Le champ `attractor_tier` n'existe pas dans `laws.json`. **Donc aucun usage
actuel du mot « attracteur » dans le corpus n'est admissible au sens
formel.**

Usages actuels :
- `GHUC-001` : « Attracteur majeur » (description) — à reformuler en
  `attractor_tier: 'μ0'` une fois le champ ajouté.
- `PAL-001` : « Attracteur palieronique » — idem.
- `ISO-005` : « Méta-isomorphisme global » — claim suspect, statut à
  trancher (`P0_5_SPEC.md §6`).

---

## A6. Admissibilité du label **« fractal »**

Voir `audit/FAILED_FRACTAL_CLAIMS.md` pour audit détaillé. Synthèse :

```
A6_fractal(scope)            # ssi fractal_property(scope) = vrai
                             # cf. P0_5_SPEC §1.4
```

**Audit immédiat** : aucune famille du corpus actuel ne satisfait
`fractal_property`. Donc **aucun usage actuel du mot « fractal » n'est
admissible**, en attente d'exécution P0.5.

---

## Synthèse globale

| dimension | passes | échecs | action |
|---|---|---|---|
| nœuds-lois | 40/50 | 10 | dissoudre VAR/ISO en arêtes |
| liens | ~104/106 | 2+1 | normaliser contradictions, ajouter `invariants` |
| familles | 8/10 | 2 | retirer VAR/ISO du registre |
| claims publics | 2/7 | 4 (+1 ambigu) | reformuler ou purger |
| label « attracteur » | 0/3 | 3 | ajouter `attractor_tier` au schéma |
| label « fractal » | 0/N | tous | suspendre l'usage jusqu'à P0.5 |

**Taux d'admissibilité global** : `(40+104+8+2+0+0) / (50+106+10+7+3+N≈10)` ≈ **77%**.

P0.5 cible **≥ 95%**.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_P0_5_HONESTY_AUDIT_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json, README.md, app/index.html,
                      MISSION_LOG.md, P0_5_SPEC.md, app/src/main.js
RISKS:                inadmissibilité étendue des claims publics (« fractal »,
                      « attracteur », « S_global = 0.78 »)
S_LOCAL:              n/a (audit binaire d'admissibilité)
S_GLOBAL:             n/a
TOP_COLLISIONS:       VAR/ISO en familles ; ISO-005 sans palier déclaré
TOP_FAKE_PATTERNS:    label « fractal » sans prédicat attaché ;
                      label « attracteur » sans palier ;
                      claim « S_global » présenté comme mesure systémique
NEXT_ACTIONS:         1. dissoudre VAR/ISO en arêtes
                      2. ajouter `family.invariant` aux 8 familles canoniques
                      3. ajouter `node.attractor_tier` au schéma
                      4. suspendre l'usage de « fractal » jusqu'à P0.5
                      5. afficher `S_global = proxy` tant que C_composition < 3/N
```

🔶
