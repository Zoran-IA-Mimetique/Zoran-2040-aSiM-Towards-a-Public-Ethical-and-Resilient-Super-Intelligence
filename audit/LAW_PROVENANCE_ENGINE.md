# LAW PROVENANCE ENGINE

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T13:14:37+00:00`
**Cross-refs** : `SHA512_TRACEABILITY_SYSTEM.md`, `LAW_VERSIONING_PROTOCOL.md`,
`PROVENANCE_AUDIT_REPORT.md`

Spec principale du moteur de provenance. Chaque loi (241 canoniques +
120 sandbox) reçoit une signature complète, traçable et auditable.

---

## 1. Structure de provenance injectée

Chaque nœud `laws.json` / `laws_sandbox.json` est annoté avec :

| champ | type | rôle |
|---|---|---|
| `sha512` | str(128) | hash contenu stable |
| `sha_short` | str(12) | préfixe affiché UI |
| `version` | int ≥ 1 | incrémentée si SHA change |
| `timestamp_utc` | ISO 8601 | création (préservée) |
| `last_modified_utc` | ISO 8601 | dernier run engine |
| `creation_epoch` | int | epoch création (immuable) |
| `parent_laws` | list[id] | lois mères directes |
| `child_laws` | list[id] | lois filles directes |
| `derivation_chain` | list[id] | chaîne ancêtres (max_depth=10) |
| `origin_engine` | str | engine créateur |
| `canonical_status` | enum | `canonical` / `canonical_foundational` / `canonical_superior` / `canonical_variant` / `sandbox` |
| `runtime_status` | enum | `high_priority` / `admissible` / `marginal` / `below_threshold` |
| `oracle_validation` | dict | 4 flags d'audit |

---

## 2. Process

```
1. stable_content(node)  → extrait HASH_FIELDS uniquement
2. compute_sha512(node)  → SHA512(json.dumps(stable, sort_keys=True))
3. derive_parent_laws()  → via mother_id / parent_id / derives_from
4. derive_child_laws()   → balayage inverse
5. derive_chain(max=10)  → ancêtres jusqu'à racine ou cycle
6. version++ si sha512 ≠ sha512_précédent
7. oracle_validation = { sha_unique, version_consistent,
                         filiation_traceable, auditable }
```

### HASH_FIELDS (14 champs contenus stables)

```
id, title, description, html_description, family, domains, tags,
equations, examples, weight, S_local, S_global,
kind, attractor_tier, superior_law_candidate
```

Les listes de strings sont triées avant hash → ordre indépendant.

---

## 3. Versioning rule

```
SI old_sha existe ET old_sha ≠ new_sha :
    version = old_version + 1   (mutation détectée)
SINON SI pas de old_sha :
    version = 1                  (provenance initiale)
SINON :
    version inchangée            (contenu identique)
```

`last_modified_utc` mis à jour à chaque run. `creation_epoch` et
`timestamp_utc` initiaux **préservés à vie**.

---

## 4. Garanties

- 241 / 241 lois canoniques avec SHA512 unique
- 120 / 120 lois sandbox avec SHA512 unique
- 0 collisions SHA détectées
- 0 lois orphelines (orphan_laws = 0)
- Rollback complet possible via `derivation_chain` + `LAW_PROVENANCE_ARCHIVE.json`

---

## SIGNATURE

```
ENGINE:               tools/law_provenance_engine.py
CANONICAL_HASHED:     241/241 (0 collisions)
SANDBOX_HASHED:       120/120 (0 collisions)
ARCHIVE:              audit/LAW_PROVENANCE_ARCHIVE.json
REPORT:               audit/PROVENANCE_AUDIT_REPORT.json
```

🔶
