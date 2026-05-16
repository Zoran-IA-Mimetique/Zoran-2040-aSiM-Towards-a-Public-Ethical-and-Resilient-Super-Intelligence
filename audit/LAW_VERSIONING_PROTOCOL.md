# LAW VERSIONING PROTOCOL

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T13:14:37+00:00`
**Cross-refs** : `LAW_PROVENANCE_ENGINE.md`, `SHA512_TRACEABILITY_SYSTEM.md`,
`PROVENANCE_AUDIT_REPORT.md`

Protocole de versionnage des lois : règles d'incrément, préservation
temporelle, garde-fous anti-cycle, archivage snapshot.

---

## 1. Règles de version

| règle | comportement |
|---|---|
| init | `version = 1` à la première annotation |
| mutation contenu | `version++` si `sha512` change |
| mutation métadata | version **inchangée** (timestamps, scores) |
| max increment / run | 1 (idempotent sur même contenu) |

```
SI sha512_old ∧ sha512_old ≠ sha512_new :
    version = version + 1
SINON SI ¬sha512_old :
    version = 1
SINON :
    version unchanged
```

Sur le run actuel : **0 versioned** (tous nouveaux), **241 new_provenance**
canoniques + **120 new_provenance** sandbox.

---

## 2. Préservation temporelle

| champ | mise à jour |
|---|---|
| `creation_epoch` | jamais (immuable, fixé au premier run) |
| `timestamp_utc` | jamais (création originelle préservée) |
| `last_modified_utc` | à chaque run engine |

Cette dissociation permet à l'audit de répondre à :
- **« Quand cette loi est-elle née ? »** → `creation_epoch`
- **« Quand a-t-elle muté pour la dernière fois ? »** → `last_modified_utc`
  conjugué à `version`

---

## 3. Chaîne de dérivation et garde-fou cycle

```
derivation_chain = [parent₀, parent₁, ..., parentₙ]
max_depth = 10                # plafond strict
cycle_guard: if p ∈ chain: break
```

L'algorithme `derive_chain()` remonte l'ancêtre primaire (premier parent
chronologique) jusqu'à :
1. atteindre une racine (`parent_laws == []`)
2. atteindre `max_depth = 10` couches
3. détecter un cycle (parent déjà visité)

→ Garantie : **aucune boucle infinie**, **aucune explosion mémoire**.

---

## 4. Archive snapshot

À chaque run, `LAW_PROVENANCE_ARCHIVE.json` est régénéré :

```jsonc
{
  "mission_id": "ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516",
  "snapshot_utc": "2026-05-16T13:14:37.278901+00:00",
  "canonical_count": 241,
  "sandbox_count": 120,
  "canonical_hashes": {
    "ULG-001": "dc93c298a9ee",
    "ULG-002": "3dbb33b53ec6",
    ...
  }
}
```

→ Rollback possible : tout `sha_short` archivé peut être recroisé avec
`git log` de `laws.json` pour reconstituer l'état exact d'une loi à une
date donnée.

---

## SIGNATURE

```
PROTOCOL:             version starts at 1, ++ on content mutation
PRESERVED_FIELDS:     creation_epoch, timestamp_utc (immuables)
MAX_CHAIN_DEPTH:      10
CYCLE_GUARD:          actif (parent ∈ chain → break)
SNAPSHOT_FILE:        audit/LAW_PROVENANCE_ARCHIVE.json
```

🔶
