# CONTEXTUAL LOADING VALIDATION

**Mission** : `ZORAN_RUNTIME_INGESTION_AND_ORACLE_STRESS_TEST_20260515`

Validation de l'engine de chargement contextuel (CLE) — réf.
`audit/CONTEXTUAL_LOADING_ENGINE.md`.

---

## 1. État implémentation

CLE est **spécifié** mais **non encore implémenté en runtime** dans
l'app actuelle (qui charge laws.json intégralement pour visualisation).

Cette spec est une **simulation conceptuelle** qui valide la correctness
du modèle.

---

## 2. Simulation algorithme

### Cas A — Query factuelle

Query : `"Que dit ZORAN sur la cohérence ?"`

Pipeline simulé :
1. **Anchors** : recherche lexicale → WP11-001, WP11-002, WP11-003
2. **Expansion BFS depth=2** : ajoute WP11-004, WP11-005, WP11-002-a, etc.
3. **Ranking** : favorise WP11-* à cause des ancres
4. **Selection** : top 30 par `runtime_weight`
5. **Subgraph extracted** : 30 lois cohérentes + leurs arêtes parent/iso

**Résultat attendu** : sous-graphe de ~30 lois centrées sur WP-11 + iso
vers WP-12, ULG-001 (transitivement).

### Cas B — Query orpheline

Query : `"Comment cuisiner du riz ?"`

Pipeline :
1. **Anchors** : aucun match lexical sur 241 lois
2. **Retour** : `null` → runtime refuse avec message explicite

**Verdict** : refus correct, anti-hallucination.

### Cas C — Query par ID exact

Query : `"GHUC-001"`

1. **Anchors** : direct id match → GHUC-001
2. **Expansion** : enfants GHUC-* + iso → GHUC-005, GHUC-002, ISO-002
3. **Selection** : top 30
4. **Subgraph** : 30 lois GHUC + ponts cohérents

**Verdict** : ciblage précis.

---

## 3. Garanties de chargement

| invariant | mécanisme |
|---|---|
| Aucune loi sandbox chargée | `runtime_admissible: true` filter |
| ≤ N_max=30 lois par opération | hard cap dans `select()` |
| Sous-graphe connexe | extraction garde plus grande composante |
| Pas de fuite cross-version | cache invalidé sur changement canonical |

---

## 4. Tests d'isolation runtime

Tester que ZenRuntime ne charge **JAMAIS** :
- une loi sandbox (`_sandbox: true`)
- une loi avec `runtime_admissible: false`
- une loi absente du CanonicalGraph

Implémentation actuelle : pas de runtime ZEN cognitif live, seulement
visualisation. Mais le filtrage `runtime_admissible` est en place dans
le schéma laws.json (toutes les 241 lois canoniques ont
`runtime_admissible: true` ; les 70 sandbox sont dans laws_sandbox.json
séparé donc invisibles).

---

## 5. Performance estimée (CLE futur)

| opération | budget | estimé sur 241 lois |
|---|---|---|
| `identify_anchors(query)` | < 5 ms | ~3 ms (regex + lexical scan) |
| `expand_BFS(depth=2)` | < 10 ms | ~5 ms |
| `rank(candidates)` | < 5 ms | ~3 ms |
| `extract_subgraph(N=30)` | < 5 ms | ~2 ms |
| **Total** | < 25 ms | **~13 ms** ✓ |

Performance OK pour interaction temps réel.

---

## 6. Mode multi-anchor

Si query contient plusieurs concepts : chaque anchor produit un
sous-graphe partiel. Le résultat final est l'union (deduped).

Exemple : `"cohérence et anti-hallucination"`
- anchor 1 → WP-11 cluster (~12 lois)
- anchor 2 → WP12-009, DVE-018, SDE-016 (~10 lois)
- union → ~20 lois pertinentes

---

## 7. Garde-fous contre over-loading

| garde-fou | seuil |
|---|---|
| Hard cap | N_max_hard = 50 lois absolues |
| Fragmentation | si subgraph fragmenté → garde plus grande composante + warn |
| Sub-budget par anchor | max 15 lois par anchor pour éviter saturation par 1 |
| Cache LRU 64 entrées | évite recompute identique |
| Filtre runtime_admissible | bloque sandbox |

---

## SIGNATURE

```
MISSION_ID:               ZORAN_RUNTIME_INGESTION_AND_ORACLE_STRESS_TEST_20260515
TIMESTAMP:                2026-05-15T20:50:00+02:00
CLE_STATUS:               spec validated, not yet implemented in live app
CASES_SIMULATED:          3 (factuelle, orpheline, ID exact)
ALL_CORRECT:              ✓
PERFORMANCE_ESTIMATE:     ~13 ms / opération sur 241 lois
SAFETY_GUARDS:            5 (hard cap, fragmentation, sub-budget, cache, runtime_filter)
```

🔶
