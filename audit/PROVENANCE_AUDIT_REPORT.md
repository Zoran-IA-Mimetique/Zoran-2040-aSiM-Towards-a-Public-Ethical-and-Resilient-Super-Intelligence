# PROVENANCE AUDIT REPORT

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T13:14:37+00:00`
**Cross-refs** : `LAW_PROVENANCE_ENGINE.md`, `SHA512_TRACEABILITY_SYSTEM.md`,
`LAW_VERSIONING_PROTOCOL.md`, `PROVENANCE_AUDIT_REPORT.json`

Rapport d'audit de provenance — version markdown lisible du JSON
`audit/PROVENANCE_AUDIT_REPORT.json`. Décrit le format et résume les
résultats du dernier run.

---

## 1. Format du rapport

```jsonc
{
  "mission_id": "ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516",
  "timestamp": "<ISO>",
  "canonical": {
    "label": "canonical",
    "total":          N,    // nb de lois canoniques
    "hashed":         N,    // SHA512 calculés
    "collisions":     N,    // collisions SHA (cible: 0)
    "versioned":      N,    // bumps de version
    "new_provenance": N,    // 1ère annotation
    "untraced":       N     // sans parent ET pas fondateur
  },
  "sandbox": { ... idem ... },
  "objectives": {
    "untraceable_laws": N,  // miroir canonical.untraced
    "sha_collisions":   0,  // ZÉRO impératif
    "orphan_laws":      0   // ZÉRO impératif
  }
}
```

---

## 2. Résultats du run actuel

### 2.1 Corpus canonique (`laws.json`)

| métrique | valeur |
|---|---:|
| total | **241** |
| hashed | 241 |
| collisions | **0** |
| versioned | 0 |
| new_provenance | 241 |
| untraced (≠ fondateur) | 241 |

### 2.2 Corpus sandbox (`laws_sandbox.json`)

| métrique | valeur |
|---|---:|
| total | **120** |
| hashed | 120 |
| collisions | **0** |
| versioned | 0 |
| new_provenance | 120 |
| untraced (≠ fondateur) | 70 |

### 2.3 Objectifs

| objectif | valeur | seuil | statut |
|---|---:|---:|---|
| `sha_collisions` | 0 | 0 | OK |
| `orphan_laws` | 0 | 0 | OK |
| `untraceable_laws` | 241 | — | à câbler (cf. §3) |

---

## 3. Lecture du `untraced = 241`

Le compteur `untraced` recense les lois qui :
- n'ont **aucun parent** (`parent_laws == []`)
- ET ne sont pas marquées `attractor_tier == "fondateur"`

Le résultat 241 / 241 reflète l'état **t₀** : les champs `mother_id`,
`parent_id`, `derives_from` ne sont pas encore systématiquement remplis
dans le corpus historique. C'est attendu pour ce premier run et **non
un échec** : `sha_collisions = 0` et `orphan_laws = 0` restent les KPI
durs.

Action P+1 : annoter les `mother_id` à partir des arêtes du
`CanonicalGraph` pour faire descendre `untraced` vers son vrai
plancher (≈ nombre de fondateurs réels, typiquement 10–20).

Le corpus sandbox montre déjà un meilleur taux de traçabilité : 70/120
untraced ⇒ 50 lois sandbox ont une filiation explicite.

---

## 4. Référence JSON

Le rapport machine-readable est dans :
- `audit/PROVENANCE_AUDIT_REPORT.json` (compteurs)
- `audit/LAW_PROVENANCE_ARCHIVE.json` (snapshot `id → sha_short`)

Régénérés à chaque exécution de `tools/law_provenance_engine.py`.

---

## SIGNATURE

```
CANONICAL_COUNT:      241
SANDBOX_COUNT:        120
SHA_COLLISIONS:       0  (objectif tenu)
ORPHAN_LAWS:          0  (objectif tenu)
UNTRACED_CANONICAL:   241 (à réduire en P+1 via annotation mother_id)
UNTRACED_SANDBOX:     70
ORACLE_VALIDATION:    { sha_unique: 361, version_consistent: 361,
                        filiation_traceable: variable, auditable: 361 }
JSON_REPORT:          audit/PROVENANCE_AUDIT_REPORT.json
ARCHIVE:              audit/LAW_PROVENANCE_ARCHIVE.json
```

🔶
