# SHA512_TRACEABILITY_SYSTEM — Spec

**Mission**: `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Implémentation**: `tools/law_provenance_engine.py` (fonction `compute_sha512`)
**Archive**: `audit/LAW_PROVENANCE_ARCHIVE.json`
**Cross-refs**: `LAW_PROVENANCE_ENGINE.md`, `LAW_VERSIONING_PROTOCOL.md`

## Principe

Chaque loi ZORAN doit posséder une empreinte cryptographique forte,
**déterministe et reproductible** sur n'importe quelle machine, à partir
de son contenu sémantique stable. SHA512 a été choisi pour sa résistance
aux collisions et sa marge sur la croissance future du corpus (cible
> 10 000 lois).

## Algorithme

```python
content    = stable_content(node)          # filtre sur HASH_FIELDS
serialized = json.dumps(content,
                        sort_keys=True,    # ordre déterministe
                        ensure_ascii=False,
                        separators=(',', ':'))   # zéro whitespace
sha512     = hashlib.sha512(serialized.encode("utf-8")).hexdigest()
sha_short  = sha512[:12]
```

### Pourquoi ces options

| Option                   | Raison                                              |
|--------------------------|-----------------------------------------------------|
| `sort_keys=True`         | Ordre stable des clés JSON → hash reproductible     |
| `separators=(',',':')`   | Pas d'espace → pas de drift de whitespace           |
| `ensure_ascii=False`     | Préserve caractères UTF-8 (accents, mathématiques)  |
| Listes triées            | Ordre `tags` / `domains` indifférent au hash        |

## Affichage

`sha_short` (12 premiers caractères) est exposé dans le panneau loi UI
pour identification rapide. Exemples extraits de
`LAW_PROVENANCE_ARCHIVE.json` :

| ID         | sha_short      |
|------------|----------------|
| ULG-001    | `dc93c298a9ee` |
| GHUC-001   | `11f669e13a1d` |
| WP11-001   | `28dbaafedb17` |
| WP12-001   | `80cec39d5011` |
| DVE-001    | `61fc6ec5ad09` |

Le SHA512 complet reste stocké dans `app/data/laws.json` pour audit.

## Garanties mesurées

| Métrique                       | Valeur cible | Valeur observée |
|--------------------------------|--------------|-----------------|
| SHA512 canoniques uniques      | 241 / 241    | **241 / 241**   |
| SHA512 sandbox uniques         | 120 / 120    | **120 / 120**   |
| Collisions toutes catégories   | 0            | **0**           |
| Lois sans hash                 | 0            | **0**           |

Probabilité théorique de collision SHA512 sur 361 lois : `~ 2⁻⁵⁰⁰`.
Aucune collision observée sur 6 runs successifs.

## Recalcul indépendant

Toute partie tierce peut recalculer un hash en :
1. Lisant le nœud dans `laws.json`
2. Filtrant sur `HASH_FIELDS` (cf. `LAW_PROVENANCE_ENGINE.md`)
3. Sérialisant avec les mêmes options
4. Appliquant SHA512

Mismatch → preuve d'altération.

## SIGNATURE

```
ALGO:           SHA512 / JSON sort_keys / no whitespace
SHA_SHORT_LEN:  12 hex chars
COLLISIONS:     0 sur 361 lois
REPRO:          déterministe, multi-machine
```
