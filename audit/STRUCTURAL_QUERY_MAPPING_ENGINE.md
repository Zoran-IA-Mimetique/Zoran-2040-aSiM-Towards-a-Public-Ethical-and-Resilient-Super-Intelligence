# STRUCTURAL_QUERY_MAPPING_ENGINE

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `META_NOISE_REDUCTION_ENGINE.md`,
  `STRUCTURAL_RETRIEVAL_SYSTEM.md`, `REAL_WORLD_QUERY_MAPPING.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `BASELINE_COMPARISON_SYSTEM.md`
- Sources    : `app/src/structural_mapping.js::STRUCTURE_PATTERNS`,
  `mapStructural`, `structuralTopicBoost`,
  `app/src/chat.js::compete` (intégration `structMap`, banner structures).

## 1. Why this mission exists

Diagnostic réel du benchmark 2026-05-16. Question utilisateur :

> *« Un maître d'ouvrage veut supprimer plusieurs murs porteurs… »*

ZORAN a renvoyé `maxTopicRelevance = 0.023` → off-topic → 0 réponse.
CLAUDE brut a gagné trivialement. Cause racine : le matching `topicScore`
est purement lexical (tokens question ∩ tokens loi). La question BTP ne
contient aucun lexème ZORAN (« loi », « cadre », « S_local »…) mais elle
est **structurellement** une question de *risque + propagation +
temporalité + décision*. Le moteur ne voyait pas cette structure.

## 2. Les 11 structures cognitives détectées

Chaque clé de `STRUCTURE_PATTERNS` est un détecteur regex sémantique
français, tolérant (pluriels, accents optionnels, racines partielles).

| Structure              | Familles activées | Lois activées (échantillon)                                   |
|------------------------|-------------------|---------------------------------------------------------------|
| `risque`               | WP12              | WP12-002, WP12-004, WP12-009, WP12-021                        |
| `contradiction`        | WP11, DVE         | WP11-002, WP11-005, WP11-009, DVE-006                         |
| `hypothese_cachee`     | DVE, WP12         | DVE-020, DVE-021, WP12-009, WP12-010, WP11-011                |
| `propagation`          | GHUC, UDE         | GHUC-001, GHUC-002, GHUC-003, UDE-001                         |
| `temporalite`          | PAL, WP11         | PAL-001, PAL-002, WP11-013, WP11-015                          |
| `bornage`              | WP12              | WP12-028, WP12-031, WP12-035                                  |
| `auditabilite`         | WP12, GHUC        | WP12-007, WP12-008, WP12-019, GHUC-005                        |
| `decision_action`      | SDE, WP12         | SDE-001, SDE-009, WP12-034                                    |
| `compression_synthese` | GHUC              | GHUC-002, GHUC-002-a, GHUC-011                                |
| `comparaison`          | SDE, WP11         | SDE-002, WP11-017                                             |
| `causalite`            | SDE               | SDE-009                                                       |

## 3. `mapStructural(question)` — signature cognitive

```
mapStructural(question) → {
  structures             : [{ key, label, families, laws }],
  structural_match_score : 0..1,    // n_matched / max(3, 11/2)
  matched_laws           : Set<string>,
  matched_families       : Set<string>,
}
```

Le score est borné à 1.0 et calibré pour saturer dès ~5–6 structures
matchées — assez pour distinguer une question riche d'une question creuse,
sans pénaliser les questions courtes.

## 4. `structuralTopicBoost(node, map)` — boost du retrieval

```
boost = 0
if node.id          ∈ matched_laws     → boost += 0.40
if node.id.family   ∈ matched_families → boost += 0.15
return min(0.55, boost)
```

Le `topicScore` effectif dans `compete()` devient
`max(lexical_score, structural_boost)` (cf.
`STRUCTURAL_RETRIEVAL_SYSTEM.md`). L'off-topic est redéfini :

```
offTopic = maxTopic < 0.10
       AND qTokens.size > 0
       AND structMap.structures.length === 0
```

Une question avec ≥ 1 structure détectée n'est **jamais** off-topic, même
si aucun lexème ZORAN n'apparaît.

## 5. Limites honnêtes

- Les 11 `STRUCTURE_PATTERNS` sont **hard-coded** — aucun apprentissage
  depuis corpus. Toute structure absente du dictionnaire est invisible.
- Regex **français-centric** : pas de support multilingue, pas de
  tokenisation morpho. Un texte anglais matche peu ou pas.
- Les seuils `0.40` (loi) et `0.15` (famille) du boost sont **choisis à la
  main**, jamais entraînés. Cf. `STRUCTURAL_RETRIEVAL_SYSTEM.md` §3.
- `structural_match_score` n'est **pas** encore utilisé en aval (judge,
  composite) — c'est un signal exposé mais non encore exploité.
- Aucune mesure quantitative de précision sur dataset annoté ; les preuves
  runtime sont anecdotiques (cas BTP §1).
