# DOMAIN_FITNESS_RUNTIME_MATRIX

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_DOMINANCE_MATRIX.md`,
  `DOMAIN_FITNESS_MODEL.md`,
  `ZORAN_SILENT_SUPERIORITY_PROTOCOL.md`,
  `RUNTIME_DOMAIN_ROUTER.md`, `DOMAIN_LAW_SELECTION_ENGINE.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`.
- Sources    : `app/src/superiority.js::runSuperiorityComparison`
  (verdict + sortedByGrade), `app/src/domain_detection.js::detectDomain`,
  `app/src/route_specialization.js::shouldSkipRoute` (calcul
  `domain_fitness`).

## 1. Format CSV cible

La matrice consigne, **par domaine détecté**, le winrate de chaque
candidat (Claude brut vs ZORAN Orchestré) sur le benchmark
`SILENT_SUPERIORITY_PROTOCOL`. Format prévu :

```csv
domain,claude_wins,zoran_wins,total,gap,trend
btp,            ?, ?,  ?, ?, ?
medicine,       ?, ?,  ?, ?, ?
legal,          ?, ?,  ?, ?, ?
physics,        ?, ?,  ?, ?, ?
ai_robustness,  ?, ?,  ?, ?, ?
epistemology,   ?, ?,  ?, ?, ?
business,       ?, ?,  ?, ?, ?
general,        ?, ?,  ?, ?, ?
```

Champs :

- `claude_wins` : nombre de questions du domaine où
  `sortedByGrade[0].label === 'CLAUDE brut · 0 loi'`
- `zoran_wins`  : nombre de questions où
  `sortedByGrade[0].label === 'ZORAN Orchestré'`
- `total`       : `claude_wins + zoran_wins` (ex-aequo comptés 0.5/0.5)
- `gap`         : `zoran_wins - claude_wins`, normalisé par `total`
- `trend`       : ↑ / → / ↓ par rapport au benchmark précédent

## 2. État actuel : matrice **à construire empiriquement**

Aucune ligne remplie. Le benchmark live n'a **pas été rejoué**
depuis l'activation du mode SINGLE_WINNER + `synthesizeOrchestrated`.
Dernières données `ZORAN_AUTONOMY_STRESS_REPORT` *avant* cette
mission : baseline 34 %, meilleure route ZORAN (Frugale) 28 %,
composite cumulé < baseline. Ces chiffres **ne sont pas reportables**
car le candidat `ZORAN Orchestré` n'existait pas. Construction :

1. Dataset équilibré (≥ 8 prompts × 8 domaines = 64 questions).
2. Lancer `runSuperiorityComparison` sur chacun via
   `tools/run_benchmark.mjs` (ou équivalent).
3. Agréger les `verdict` par `detectedDomain.key`.
4. Écrire le CSV dans `audit/DOMAIN_FITNESS_RUNTIME_MATRIX.csv`.

## 3. Utilisation diagnostique de la matrice

Une fois remplie, la matrice sert trois usages :

- **Détection des domaines en échec** : `gap < 0` = signal que
  `cognitive_style` ou `preferred_strategies` sont sous-optimaux pour
  ce métier. Cible pour la mission `DOMAIN_LAW_SELECTION_ENGINE`.
- **Validation de l'orchestration silencieuse** : `gap > +0.30`
  homogène sur 6+ domaines confirme la promesse mission. Gap
  hétérogène suggère que `synthesizeOrchestrated` est calibré pour
  l'exemple-canon BTP du prompt et généralise mal.
- **Pilotage du déploiement** : un domaine où `gap < 0` peut être
  routé directement vers `baseline` (court-circuit
  `orchestratedTask`). Non implémenté — futur travail.

## 4. Limites honnêtes

- **0 ligne actuellement** : la matrice est un **gabarit**, pas une
  mesure. Tout le reste décrit un protocole à venir.
- **Detection FR-only** : `physics` / `ai_robustness` /
  `epistemology` matchent souvent du vocabulaire EN mais
  `DOMAIN_LEXICONS.keywords` reste FR. Biais d'attribution vers
  `general`.
- **Cap `general` non significatif** : si trop de prompts retombent
  en `general`, la matrice agrège du bruit.
- **Ex-aequo gérés naïvement** : 0.5 / 0.5 si égalité
  `argumented_grade_20`. Règle arbitraire.
- **Trend vide au T0** : premier vrai delta possible au T1.
- **Pas de stratification difficulté** : un domaine peut gagner sur
  questions faciles, perdre sur pointues. La matrice masque ça.
