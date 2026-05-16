# SINGLE_WINNER_RUNTIME_FORMAT

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `MULTI_WINNER_REFORMULATION_ENGINE.md` (format
  remplacé), `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `COGNITIVE_RUNTIME_UI.md`, `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `SILENT_LAW_COMPOSER.md`.
- Sources    : `app/src/superiority.js::renderComparison`
  (ligne 539 : `const isSingleWinnerMode = sortedByGrade.length <= 2`),
  `app/src/superiority.js::runSuperiorityComparison` (lignes 58, 102 :
  `reformTasks = []` et `respTasks = []`),
  `app/src/superiority.js::orchestratedTask`.

## 1. Pourquoi passer de 6 cartes à 2

Le format `MULTI_WINNER_REFORMULATION` affichait jusqu'à **6 cartes**
(baseline + 5 routes ZORAN), une table de deltas à **9 colonnes** et
un bloc de **reformulations multiples**. Constat utilisateur : charge
cognitive élevée, lecture en zig-zag entre cartes, difficulté à
identifier *quelle* réponse utiliser. Cette mission collapse l'UI sur
**2 candidats stricts** :

1. `CLAUDE brut · 0 loi` (référence)
2. `ZORAN Orchestré` (composition silencieuse, mission
   `SILENT_LAW_COMPOSER`)

Les routes individuelles (`Frugale`, `Anti-hallu`, `Structurelle`...)
sont **calculées en interne** (`lawsByStrategy` passé à
`synthesizeOrchestrated`) mais **plus appelées séparément** par le
LLM. Voir `superiority.js` lignes 58 et 102 :

```js
const reformTasks = []; // route reformulations désactivées
const respTasks   = []; // routes individuelles désactivées
```

## 2. Le flag `isSingleWinnerMode` dans `renderComparison`

Branchement UI explicite (ligne 539-548) :

```js
const isSingleWinnerMode = sortedByGrade.length <= 2;
if (isSingleWinnerMode) {
  return `${verdictBanner}${rankingBlock}${argumentedDetails}
          ${concreteTable}${responsesBlock}`;
}
// fallback legacy : ajoute deltaTable + reformsBlock
```

Différences nettes vs mode legacy :

| Bloc                 | Legacy (6 cartes) | SINGLE_WINNER (2)   |
|----------------------|-------------------|---------------------|
| `deltaTable` (9 col) | oui               | **non**             |
| `reformsBlock`       | oui (×3-5)        | **non**             |
| `responsesBlock`     | 6 cartes          | XL winner + autre   |

## 3. Économie cognitive utilisateur

Trois indicateurs guidant cette simplification :

- **Surface de lecture** : ~6 cartes × 4-7 phrases = 25-40 phrases.
  Mode SINGLE_WINNER = 8-14 phrases (2 réponses).
- **Délibération** : table 9 colonnes supprimée, remplacée par
  `winnerCardXL` (verdict synthétique) + carte compacte.
- **Choix** : binaire *Claude brut OU ZORAN Orchestré*, aligné sur
  la promesse mission (« ZORAN > Claude brut »).

L'accordéon `argumentedDetails` reste disponible pour creuser
`laws_used`, `jargon_terms_found`, `truncation_reasons` — *opt-in*.

## 4. Limites honnêtes

- **Format binaire écrase la complémentarité** : si `Frugale` et
  `Structurelle` produiraient deux réponses contradictoires-mais-
  utiles, le mono-bloc `ZORAN Orchestré` les fond. Valeur
  diagnostique des routes perdue côté user.
- **`isSingleWinnerMode` est implicite** : déduit de
  `sortedByGrade.length <= 2`, pas de toggle explicite. Si le
  benchmark CSV ré-active 6 réponses, le format legacy reprend sans
  warning.
- **`winnerCardXL` ne distingue pas baseline vs orchestré** dans son
  styling (même CSS class), seul le label diffère.
- **Pas de A/B test cognitive load** : promesse « moins de surface =
  meilleure décision » non mesurée empiriquement.
- **`deltaTable` masquée** rend plus difficile la détection d'une
  régression par axe (ex : `meta_noise` qui repart à la hausse).
