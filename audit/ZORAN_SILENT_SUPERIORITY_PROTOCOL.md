# ZORAN_SILENT_SUPERIORITY_PROTOCOL

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `BENCHMARK_ARGUMENTATION_PROTOCOL.md`,
  `SINGLE_WINNER_RUNTIME_FORMAT.md`,
  `SILENT_LAW_COMPOSER.md`, `DOMAIN_FITNESS_RUNTIME_MATRIX.md`.
- Sources    : `app/src/superiority.js::runSuperiorityComparison`
  (lignes 60-87 : `baselineTask` + `orchestratedTask`),
  `app/src/superiority.js::judge` (ligne 166-170,
  `runtime_superiority` composite ligne 222),
  `app/src/llm.js::judgeResponses`.

## 1. Le protocole en 2 candidats

Le protocole `SILENT_SUPERIORITY` mesure si **ZORAN Orchestré** bat
**Claude brut** sans afficher de scaffolding ZORAN dans la réponse —
d'où *silent*. Chaque question génère exactement deux candidats
soumis au juge LLM (`judgeResponses`) :

```
question → [ baselineTask, orchestratedTask ] → judgeResponses → verdict
```

`baselineTask` appelle `synthesizeBaseline(question)` (system prompt
neutre, aucune loi). `orchestratedTask` appelle
`synthesizeOrchestrated({...})` (style cognitif + vocabulaire de
domaine + cadres mentaux silencieux). Le juge ne sait pas quel
candidat est lequel — il reçoit `[CANDIDAT 1 — CLAUDE brut · 0 loi]`
et `[CANDIDAT 2 — ZORAN Orchestré]` *en clair* (limite assumée, voir
section 4).

## 2. Composite `runtime_superiority` (axe de comparaison)

Le juge LLM produit un `argumented_grade_20`. Côté code,
`superiority.js` ligne 222 calcule un score composite agrégeant
plusieurs signaux non-juge :

```js
runtime_superiority = (
    judge.score                       // /1, score juge composite
  + concrete_runtime_alignment * 0.3  // alignement concret runtime
  - jargon_density            * 0.2  // pénalité jargon ZORAN
  - meta_noise                * 0.2  // pénalité méta-discours
  - truncation_penalty        * 0.3  // pénalité phrase coupée
  + practical_usefulness      * 0.2  // bonus actionnable
)
```

Le winner final est `sortedByGrade[0]` (tri par
`argumented_grade_20` décroissant, fallback `runtime_superiority`).
Un "win ZORAN" = `sortedByGrade[0].label === 'ZORAN Orchestré'`.

## 3. Cible ≥ 75 % de wins ZORAN et boucle d'itération

Cible mission : `(zoran_wins / N) >= 0.75`. Boucle si raté :

1. Identifier domaines en échec via `DOMAIN_FITNESS_RUNTIME_MATRIX`.
2. Inspecter `jargon_terms_found` sur les pertes : durcir
   l'interdiction lexicale dans `synthesizeOrchestrated` règle 1.
3. Vérifier `truncation_penalty` : si `>0.15`, élargir `maxTokens`
   (actuellement 1000) ou réduire les angles (`structures` filtrant).
4. Réviser `preferred_strategies` du domaine fautif dans
   `DOMAIN_LEXICONS`.
5. Re-run et comparer `runtime_superiority` moyens before/after.

Aucune étape ne modifie le juge — l'objectivité repose sur la
stabilité du prompt `judgeResponses`.

## 4. Limites honnêtes

- **Cible 75 % NON ATTEINTE à ce jour** : le benchmark
  `ZORAN_AUTONOMY_STRESS_REPORT` n'a **pas été rejoué** depuis
  l'activation de `orchestratedTask`. Dernière mesure pertinente :
  baseline 34 %, meilleure route ZORAN 28 % — **avant** cette
  mission. Supériorité espérée = hypothèse.
- **Le juge voit les labels** `[CANDIDAT 1 — CLAUDE brut · 0 loi]`
  / `[CANDIDAT 2 — ZORAN Orchestré]` : biais a priori possible.
  Devrait être anonymisé (`Candidat A / B` shuffled).
- **Pas de test statistique** : 75 % sur 50 prompts est sensible au
  bruit (IC 95 % ≈ ±12 pts).
- **Composite `runtime_superiority` pondère arbitrairement** :
  coefficients 0.3 / 0.2 / 0.2 / 0.3 / 0.2 hand-picked, non appris.
- **Domaines sur-représentés non corrigés** : winrate global
  biaisable par la composition du dataset.
- **Pas de mode `verbose juge`** : audit du tranchage difficile.
