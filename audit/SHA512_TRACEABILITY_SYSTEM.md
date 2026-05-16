# SHA512 TRACEABILITY SYSTEM

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T13:14:37+00:00`
**Cross-refs** : `LAW_PROVENANCE_ENGINE.md`, `LAW_VERSIONING_PROTOCOL.md`

Sous-système de hash déterministe garantissant qu'une loi a **une et une
seule** empreinte SHA512 stable dans le temps, indépendante du jitter de
sérialisation.

---

## 1. Spécification du hash

```
sha512 = SHA-512(
    json.dumps(
        stable_content(node),
        sort_keys=True,           # ordre déterministe
        ensure_ascii=False,       # UTF-8 préservé
        separators=(',', ':')     # zéro whitespace
    ).encode("utf-8")
)
```

Le contenu stable est extrait via `HASH_FIELDS` (14 champs définis dans
`LAW_PROVENANCE_ENGINE.md` §2). Les champs métadata (timestamps, scores
runtime, statuts) sont **exclus** : ils peuvent muter sans déclencher
une bump de version contenu.

### Normalisation des listes

```
SI list[str] :   sorted(list)     → ordre alphabétique stable
SINON       :   conservé tel quel  (ex: equations ordonnées)
```

---

## 2. Affichage UI

```
sha_short = sha512[:12]   # ex: "dc93c298a9ee"
```

Affiché dans le panel de loi pour identification rapide. Le SHA complet
reste disponible via clic / debug. Aucune collision constatée sur les
préfixes 12 caractères dans le corpus actuel (361 lois).

Exemples extraits de `LAW_PROVENANCE_ARCHIVE.json` :

```
ULG-001     → dc93c298a9ee
ULG-002     → 3dbb33b53ec6
DVE-001     → 61fc6ec5ad09
GHUC-001    → 11f669e13a1d
GHUC-002-a  → 44571358c7e5
```

---

## 3. Résultats de traçabilité

| corpus | total | hashed | uniques | collisions |
|---|---:|---:|---:|---:|
| canonique (`laws.json`) | 241 | 241 | 241 | **0** |
| sandbox (`laws_sandbox.json`) | 120 | 120 | 120 | **0** |
| **total** | **361** | **361** | **361** | **0** |

→ Espace SHA512 (2^512) très largement suffisant ; aucune collision
même probabiliste attendue sur des corpus 10^9× plus grands.

---

## 4. Détection de mutation

Toute modification d'un champ de `HASH_FIELDS` produit un SHA différent.
L'engine de provenance compare `old_sha` ↔ `new_sha` à chaque run :

```
SI new_sha ≠ old_sha :
   version += 1
   last_modified_utc = now()
   collision_check(new_sha ∈ hashes_seen)
```

→ Aucun changement silencieux possible. Le diff de contenu est
**immédiatement visible** dans `PROVENANCE_AUDIT_REPORT.json`
(`versioned` counter).

---

## SIGNATURE

```
ALGORITHM:        SHA-512 (FIPS 180-4)
SERIALIZATION:    json sort_keys + no whitespace + UTF-8
DISPLAY_SHORT:    first 12 hex chars
CANONICAL:        241/241 uniques, 0 collisions
SANDBOX:          120/120 uniques, 0 collisions
```

🔶
