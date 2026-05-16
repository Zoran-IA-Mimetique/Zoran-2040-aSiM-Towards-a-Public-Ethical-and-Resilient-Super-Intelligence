# RUNTIME_QUALITY_EVALUATION

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RESPONSE_GRADING_SYSTEM.md`, `PRACTICAL_RELEVANCE_SCORING.md`,
  `ACTIONABILITY_ANALYSIS.md`, `ANTI_JARGON_PROTOCOL.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/llm.js::judgeResponses` (bloc *« POUR CHAQUE
  CANDIDAT, attribue les scores [0..1] »*),
  `app/src/superiority.js::runSuperiorityComparison` (enrichit chaque
  `delta` avec les 8 axes + métriques `jargon.js`).

## 1. Les huit axes juge — définitions

Tous flottants `[0..1]`, attribués par `judgeResponses` candidat par
candidat. Les quatre premiers reproduisent l'axiomatique du parent
`RUNTIME_SUPERIORITY_ENGINE` ; les quatre suivants sont nouveaux.

| # | Axe                    | Sens                                        | Convention      |
|---|------------------------|---------------------------------------------|-----------------|
| 1 | `precision`            | justesse factuelle apparente                | `+` = meilleur  |
| 2 | `hallucination`        | risque d'invention                          | `−` = meilleur  |
| 3 | `noise`                | verbosité inutile                           | `−` = meilleur  |
| 4 | `coherence`            | cohérence interne                           | `+` = meilleur  |
| 5 | `actionability_score`  | actions / étapes concrètes immédiates       | `+` = meilleur  |
| 6 | `practical_relevance`  | utilité réelle pour le user de la question  | `+` = meilleur  |
| 7 | `compression_quality`  | essentiel sans détails parasites            | `+` = meilleur  |
| 8 | `semantic_delta`       | écart sémantique vs autres candidats        | informatif      |

Axes 5 et 6 ont leur spec dédiée (`ACTIONABILITY_ANALYSIS.md`,
`PRACTICAL_RELEVANCE_SCORING.md`). L'axe 7 est *orthogonal à `noise`* :
une réponse peu bruyante mais creuse a `noise=0.1,
compression_quality=0.3`.

## 2. Comment ils nourrissent la note /20

Le prompt n'impose **pas** de formule. Il demande au juge de pondérer
intuitivement selon le domaine puis produit `argumented_grade_20`
directement. Le code de `runSuperiorityComparison` recopie la note
telle quelle dans `delta.argumented_grade_20`. En parallèle, un
composite `runtime_superiority` est calculé comme fallback de tri :

```js
runtime_superiority =
    0.25·(precision − base.precision) + 0.25·(base.hallu − hallu)
  + 0.15·(base.noise − noise)         + 0.15·(coherence − base.coherence)
  + 0.10·(concrete_runtime_alignment − base.concrete_runtime_alignment)
  + 0.10·(base.meta_noise − meta_noise)
```

Le tri fallback devient `10 + runtime_superiority * 10`. La note juge
reste la source de vérité quand elle existe.

## 3. Cross-reference avec les métriques `jargon.js`

`runSuperiorityComparison` enrichit chaque réponse avant le juge avec
cinq métriques objectives client-side (mission `ANTI_JARGON_PROTOCOL` /
`SILENT_LAW_GUIDANCE`) : `jargon_density`, `user_distance`,
`practical_usefulness`, `meta_noise`, `concrete_runtime_alignment`.

Ces cinq scores **ne sont pas vus par le juge** — ils servent de
**garde-fou objectif** contre un juge surnotant une réponse jargonnante.

| Axe juge subjectif      | Garde-fou objectif `jargon.js`      |
|-------------------------|-------------------------------------|
| `noise`                 | `jargon_density` + `meta_noise`     |
| `practical_relevance`   | `practical_usefulness`              |
| `actionability_score`   | `concrete_runtime_alignment`        |
| `compression_quality`   | (aucun équivalent direct)           |

## 4. Honest limits

- **Pas d'agrégation calculée** : la note /20 n'est pas dérivée des
  huit axes. Un `actionability_score=0.9` peut coexister avec
  `argumented_grade_20=10` sans incohérence détectée.
- **Axes corrélés** : `precision` ↔ `hallucination`, `noise` ↔
  `compression_quality`. Dimensionnalité réelle ≈ 4 plutôt que 8.
- **`semantic_delta` mal défini** : mesure non-locale vs autres
  candidats, affichée mais non utilisée dans le composite.
- **Pas de double-juge** : un seul appel, pas de cross-validation par
  un second modèle (cf. `REAL_WORLD_VALIDATION_PHASE.md`).
- **Garde-fous non-bloquants** : `jargon_density` élevé n'empêche pas
  un grade /20 élevé. Le user doit lire les deux tableaux côte à côte.
