# LAW_VERSIONING_PROTOCOL — Spec

**Mission**: `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Implémentation**: `tools/law_provenance_engine.py`
**Archive**: `audit/LAW_PROVENANCE_ARCHIVE.json`
**Cross-refs**: `LAW_PROVENANCE_ENGINE.md`, `SHA512_TRACEABILITY_SYSTEM.md`

## Règles de versioning

Le versioning ZORAN est **content-driven** : une loi n'incrémente que si
son contenu sémantique stable change (i.e. son `sha512` change). Les
modifications de scores runtime, timestamps ou statuts dérivés
n'incrémentent pas la version.

```
version_initial   = 1                       # nouvelle loi
version_t+1       = version_t + 1           # si sha512_t+1 != sha512_t
version_t+1       = version_t               # sinon (idempotent)
```

## Champs temporels

| Champ                | Comportement                                       |
|----------------------|----------------------------------------------------|
| `creation_epoch`     | Epoch UNIX, **préservé** une fois posé             |
| `timestamp_utc`      | ISO-8601 création, **préservé** une fois posé      |
| `last_modified_utc`  | ISO-8601, **réécrit à chaque run** du moteur       |
| `version`            | Int monotonique, incrémenté sur changement contenu |

Cette séparation permet :
- audit d'âge d'une loi (`creation_epoch`)
- audit de fréquence de touch (`last_modified_utc`)
- audit de fréquence de mutation réelle (`version`)

## Chaîne de dérivation

```
derivation_chain : string[]    # ordonnée ancêtres → racine
max_depth        : 10          # garde-fou anti-cycle
```

Construction par `derive_chain()` :
1. Part du nœud courant
2. Récupère `parent_laws[0]` (parent chronologique)
3. Si parent déjà dans la chaîne → **STOP** (cycle détecté)
4. Sinon ajoute, descend, max 10 hops

Garantit terminaison + détection cycles + reconstruction filiation.

## Snapshot d'archive

À chaque run, `LAW_PROVENANCE_ARCHIVE.json` est réécrit :

```json
{
  "mission_id": "ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516",
  "snapshot_utc": "2026-05-16T13:14:37.278901+00:00",
  "canonical_count": 241,
  "sandbox_count": 120,
  "canonical_hashes": { "ULG-001": "dc93c298a9ee", ... }
}
```

Cette archive sert de **point de rollback** : toute divergence future
entre `laws.json` et le snapshot est détectable hash-par-hash.

## État courant (run 2026-05-16)

| Compteur                       | Valeur |
|--------------------------------|--------|
| Lois canoniques versionnées++  | 0      |
| Lois sandbox versionnées++     | 0      |
| Nouvelles provenance posées    | 361    |
| Cycles dérivation détectés     | 0      |

Toutes les lois sont en `version = 1` (premier run d'initialisation).
Les runs suivants ne ré-incrémenteront que sur changement effectif.

## SIGNATURE

```
TRIGGER:        sha512 delta
MAX_DEPTH:      10
RESET_FIELDS:   last_modified_utc
PRESERVED:      creation_epoch, timestamp_utc
ARCHIVE:        LAW_PROVENANCE_ARCHIVE.json
```
