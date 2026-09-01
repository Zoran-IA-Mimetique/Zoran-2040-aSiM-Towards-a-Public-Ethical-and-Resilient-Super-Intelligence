# EDGE SYSTEM SPEC

**Mission Oracle** : `ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Spécification formelle du système d'arêtes typées qui remplace la
catégorisation actuelle (où relations sont déguisées en nœuds-familles).

Référence machine-readable : `audit/edge_types.json`.

---

## 1. Vue d'ensemble

Le graphe ZORAN devient un **graphe orienté multi-typé** :

```
G = (N, E)  où  E ⊆ N × N × K × M
            avec K = ensemble des kinds (§2)
                 M = métadonnées (§3)
```

Aucun lien n'est anonyme. Chaque lien porte un `kind` validé.

---

## 2. Taxonomie des 7 kinds

| kind | direction | sémantique | obligatoire |
|---|---|---|---|
| `parent` | child → root | dérivation hiérarchique stricte. Doit former un DAG global. | oui |
| `derives` | derived → base | variante ou spécialisation non-hiérarchique. N'entre pas dans le DAG parent. | oui |
| `iso` | non-orienté (canonisé en source.id < target.id) | isomorphisme structurel avec invariants préservés explicitement déclarés. | oui |
| `contradicts` | non-orienté (idem) | contradiction logique entre énoncés. Doit être réciproque. | oui |
| `related` | non-orienté | proximité sémantique faible. Utilisation parcimonieuse (densité plafonnée). | optionnel |
| `absorbed_into` | absorbed → absorber | la loi source est marquée comme absorbée par GHUC dans la loi cible. La source persiste pour traçabilité (audit) mais n'est plus active. | optionnel |
| `depends` | dependent → prerequisite | dépendance opératoire (différent de `parent` : c'est une *condition d'exécution*, pas une *dérivation*). | optionnel |

---

## 3. Métadonnées par kind

Schéma JSON (machine-readable dans `edge_types.json`) :

```jsonc
{
  "parent": {
    "required": ["source", "target", "kind"],
    "optional": ["weight"],
    "constraints": {
      "must_form_DAG": true,
      "weight_range": [0, 1],
      "default_weight": "target.weight"
    }
  },
  "derives": {
    "required": ["source", "target", "kind"],
    "optional": ["weight", "stability", "status"],
    "constraints": {
      "stability_enum": ["stable", "instable", "absorbée", "under_review"],
      "default_weight": 0.50
    }
  },
  "iso": {
    "required": ["source", "target", "kind", "invariants"],
    "optional": ["weight"],
    "constraints": {
      "invariants_min_count": 1,
      "invariants_each_min_chars": 8,
      "default_weight": 0.65,
      "canonical_order": "source.id < target.id"
    }
  },
  "contradicts": {
    "required": ["source", "target", "kind"],
    "optional": ["weight", "domain"],
    "constraints": {
      "requires_reciprocal": true,
      "default_weight": 0.60
    }
  },
  "related": {
    "required": ["source", "target", "kind"],
    "optional": ["weight", "reason"],
    "constraints": {
      "default_weight": 0.30,
      "max_per_node": 4,
      "rationale_recommended": "remplir `reason` si pas évident"
    }
  },
  "absorbed_into": {
    "required": ["source", "target", "kind", "absorbed_at"],
    "optional": ["weight"],
    "constraints": {
      "target_must_be_canonical": true,
      "default_weight": 0.40
    }
  },
  "depends": {
    "required": ["source", "target", "kind"],
    "optional": ["weight"],
    "constraints": {
      "must_form_DAG": true,
      "default_weight": 0.55
    }
  }
}
```

---

## 4. Règles globales

### 4.1 Pas de doublon multi-kind

`∀ (u, v) ∈ N × N : |{ k : (u, v, k) ∈ E }| ≤ 2`.

Exemple admissible : `(WP11-004, WP11-005, parent)` et
`(WP11-004, WP11-005, depends)` peuvent coexister si l'un est dérivation
hiérarchique et l'autre dépendance opératoire.

Exemple inadmissible : 3 kinds différents entre les mêmes nœuds (signe
d'ambiguïté sémantique).

### 4.2 Symétries canoniques

Pour `iso`, `contradicts`, `related` : un seul tuple `(source, target, kind)`
est stocké, avec `source.id < target.id` (ordre lexico). Le moteur de
rendu/audit traite ces liens comme non-orientés.

### 4.3 Migration depuis l'ancien format

| ancien | nouveau |
|---|---|
| `n.parents: [p1, p2]` | pour chaque pᵢ : `{source: pᵢ, target: n.id, kind: 'parent'}` |
| `n.children: [c1, ...]` | dédupliqué (inverse de `parent`), pas re-stocké |
| `n.related: [r1, ...]` | pour chaque rᵢ : `{source: min(n.id, rᵢ), target: max(...), kind: 'related'}` |
| `n.contradictions: [c1, ...]` | comme related, en `kind: 'contradicts'`, avec création du tuple réciproque manquant |
| nœud VAR-NNN parent=[X] | supprimer le nœud, créer `{source: VAR-NNN-id-fantôme | X, kind: 'derives'}` … cf §5 |
| nœud ISO-NNN parents=[X, Y] | supprimer le nœud, créer `{source: X, target: Y, kind: 'iso', invariants: [...]}` |

### 4.4 Validation

L'Oracle (côté `tools/validate_laws.py` et `app/src/oracle.js`) doit
appliquer :

```
∀ e ∈ E :
    e.kind ∈ {parent, derives, iso, contradicts, related, absorbed_into, depends}
    e.source, e.target ∈ N
    e.source ≠ e.target
    schema_for(e.kind).required ⊆ keys(e)
    schema_for(e.kind).constraints respected
```

Tout `e` ne satisfaisant pas → **rejet au chargement** (pas warning).

---

## 5. Migration des 10 nœuds VAR/ISO

### VAR

| ancien nœud | nouveau lien | nœud à créer ? |
|---|---|---|
| VAR-001 | `(DVE-002-v1, DVE-002, derives, stability=stable)` | oui si on garde la variante comme entité — sinon supprimer purement |
| VAR-002 | `(DVE-003-v1, DVE-003, derives, stability=instable)` + flag `false_coherence` sur l'arête | conservé comme exemple pédagogique |
| VAR-003 | `(ULG-002, GHUC-002, absorbed_into, absorbed_at=2026-05)` | non — le nœud disparaît |
| VAR-004 | `(SDE-004-v1, SDE-004, derives, stability=instable)` | comme VAR-002 si pertinent |
| VAR-005 | `(WP11-005-v1, WP11-005, derives, status=under_review)` | comme ci-dessus |

**Recommandation** : ne garder que les variantes qui satisfont
`A1_grounding_min` (équations ou exemples). Sinon **suppression simple**
(pas de migration de nœud).

### ISO

| ancien nœud | nouveau lien |
|---|---|
| ISO-001 (ULG ↔ SDE) | `(SDE-001, ULG-001, iso, invariants=['structure morphologique','symétrie du regard'])` |
| ISO-002 (WP-11 ↔ WP-12) | `(WP11-001, WP12-001, iso, invariants=['co-validation cohérence-admissibilité'])` |
| ISO-003 (UDE ↔ DVE) | `(DVE-001, UDE-001, iso, invariants=['conjugaison opératoire découverte-génération'])` |
| ISO-004 (GHUC ↔ attracteurs) | `(GHUC-001, UDE-002, related, reason='bouclage récursif déclaré, non démontré')` — **rétrogradé** |
| ISO-005 (méta-isomorphisme) | **supprimé**. Voir `P0_5_SPEC.md §6`. |

---

## 6. Conséquences quantitatives

| métrique | avant | après refactor (pré-approfondissement) |
|---|---|---|
| nœuds | 50 | 40 (suppression 5 VAR + 5 ISO) |
| liens parent | ~45 | ~38 (suppression des parents pointant vers VAR/ISO) |
| liens iso typés | 0 | 3 (ISO-001, ISO-002, ISO-003) |
| liens absorbed_into | 0 | 1 (ULG-002 → GHUC-002) |
| liens contradicts | 1 | 2 (ajout du réciproque) |
| liens related | ~38 | ~26 (purge des intra-famille redondants) |
| densité | 2.12 | ~1.75 |
| inflation_ratio | 0.20 | 0.00 |

---

## 7. Hook validateur

`tools/validate_laws.py` (extension nécessaire en exécution P0.5) :

```python
EDGE_SCHEMAS = json.load(open('audit/edge_types.json'))['edge_types']

def validate_edge(e):
    schema = EDGE_SCHEMAS[e['kind']]
    for k in schema['required']:
        if k not in e: raise ValueError(f"{e}: missing {k}")
    if e['kind'] == 'iso' and (not e.get('invariants') or len(e['invariants']) < 1):
        raise ValueError(f"{e}: iso requires non-empty invariants")
    if e['kind'] == 'contradicts':
        # vérifier réciprocité
        ...
```

P0.5 SPEC est en mode read-only — code de validation à exécuter **après**
autorisation de sortie d'Oracle.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json, P0_5_SPEC.md
RISKS:                migration partielle qui laisserait des nœuds VAR/ISO orphelins ;
                      perte de l'invariant si iso converti sans invariants déclarés
S_LOCAL:              n/a (spec)
S_GLOBAL:             n/a
TOP_COLLISIONS:       3 kinds simultanés entre même paire (à interdire) ;
                      iso sans invariants (à rejeter)
TOP_FAKE_PATTERNS:    related intra-famille qui duplique parent ;
                      iso comme nœud-famille
NEXT_ACTIONS:         1. exécuter §5 (migration VAR/ISO)
                      2. ajouter validate_edge dans tools/validate_laws.py
                      3. ajouter EDGE_SCHEMAS dans app/src/graph.js
                      4. consommer audit/edge_types.json
```

🔶
