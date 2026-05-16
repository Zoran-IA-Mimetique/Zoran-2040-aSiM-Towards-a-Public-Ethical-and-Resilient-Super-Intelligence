# LAW_PROVENANCE_ENGINE — Spec

**Mission**: `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Implémentation**: `tools/law_provenance_engine.py`
**Rapport runtime**: `audit/PROVENANCE_AUDIT_REPORT.json`
**Archive**: `audit/LAW_PROVENANCE_ARCHIVE.json`
**Cross-refs**: `SHA512_TRACEABILITY_SYSTEM.md`, `LAW_VERSIONING_PROTOCOL.md`,
`PROVENANCE_AUDIT_REPORT.md`

## Principe

Chaque loi du corpus (241 canoniques + 120 sandbox = 361 lois) doit être
**traçable, hashable, versionnée et auditable**. Aucune loi ne peut exister
sans provenance complète. Le moteur réécrit chaque nœud avec un bloc
provenance déterministe, recalculable à tout instant.

## Structure injectée par loi

| Champ                | Type      | Rôle                                                  |
|----------------------|-----------|-------------------------------------------------------|
| `sha512`             | hex(128)  | Empreinte SHA512 du contenu stable                    |
| `sha_short`          | hex(12)   | 12 premiers caractères, affichage panneau             |
| `version`            | int ≥ 1   | Incrémentée si `sha512` change run-to-run             |
| `timestamp_utc`      | ISO-8601  | Création initiale (immuable une fois posé)            |
| `last_modified_utc`  | ISO-8601  | Réécrit à chaque run                                  |
| `creation_epoch`     | int       | Epoch UNIX initial (immuable)                         |
| `parent_laws`        | string[]  | IDs des parents directs (mother / parent / derives)   |
| `child_laws`         | string[]  | IDs des enfants (résolus par scan inverse)            |
| `derivation_chain`   | string[]  | Chaîne ancêtres ordonnée (max_depth=10, anti-cycle)   |
| `origin_engine`      | enum      | Engine ayant produit la loi                           |
| `canonical_status`   | enum      | `canonical_foundational` / `canonical_superior` / ... |
| `runtime_status`     | enum      | `high_priority` / `admissible` / `marginal` / ...     |
| `oracle_validation`  | object    | 4 booléens d'audit (sha_unique, version_consistent…)  |

## Process

1. Lecture `app/data/laws.json` + `app/data/laws_sandbox.json`.
2. Pour chaque nœud : extraction `stable_content()` sur `HASH_FIELDS`.
3. `sha512 = SHA512(json.dumps(content, sort_keys=True, separators=(',',':')))`.
4. Comparaison `old_sha != new_sha` → `version += 1`.
5. Résolution parents (mother_id, parent_id, derives_from).
6. Scan inverse pour children.
7. Reconstruction `derivation_chain` (BFS bornée).
8. Détermination `canonical_status` + `runtime_status` + `oracle_validation`.
9. Snapshot dans `LAW_PROVENANCE_ARCHIVE.json`.
10. Rapport dans `PROVENANCE_AUDIT_REPORT.json`.

## HASH_FIELDS (contenu stable)

```
id, title, description, html_description, family, domains, tags,
equations, examples, weight, S_local, S_global,
kind, attractor_tier, superior_law_candidate
```

Listes de strings triées avant sérialisation pour hash déterministe.
Champs runtime (scores, status, timestamps) **exclus du hash** : seul le
contenu sémantique compte.

## Versioning rule

```
version_t+1 = version_t + 1   si sha512_t+1 != sha512_t
version_t+1 = version_t       sinon
new node    → version = 1
```

`creation_epoch` et `timestamp_utc` **préservés** entre runs.
`last_modified_utc` **toujours réécrit**.

## Garanties mission

- **241 / 241** SHA512 uniques canoniques
- **120 / 120** SHA512 uniques sandbox
- **0** collisions
- **0** lois sans hash
- Filiation 100 % reconstructible via `derivation_chain`

## SIGNATURE

```
MISSION_ID:       ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516
CANONICAL:        241 lois, 241 SHA512 uniques
SANDBOX:          120 lois, 120 SHA512 uniques
COLLISIONS:       0
```
