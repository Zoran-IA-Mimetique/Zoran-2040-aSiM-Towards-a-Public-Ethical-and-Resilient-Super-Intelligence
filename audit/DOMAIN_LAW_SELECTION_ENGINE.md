# DOMAIN_LAW_SELECTION_ENGINE

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`, `SILENT_GUIDANCE_V3.md`,
  `DOMAIN_DOMINANCE_MATRIX.md`, `RUNTIME_DOMAIN_ROUTER.md`,
  `SILENT_LAW_COMPOSER.md`.
- Sources    : `app/src/domain_detection.js::detectDomain`,
  `app/src/domain_detection.js::DOMAIN_LEXICONS`,
  `app/src/structural_mapping.js::STRUCTURE_PATTERNS`,
  `app/src/superiority.js::runSuperiorityComparison`
  (bloc `orchestratedTask`), `app/src/route_specialization.js::
  shouldSkipRoute` (skip fitness < 0.30).

## 1. Pourquoi sélectionner AVANT de générer

Le pipeline historique chargeait *toutes* les lois disponibles pour
chaque route, déléguant la pertinence au LLM. Résultat mesuré
(`ZORAN_AUTONOMY_STRESS_REPORT`) : bruit cadre, contamination
vocabulaire, baseline qui gagne. Cette mission inverse l'ordre :

```
prompt → detectDomain + STRUCTURE_PATTERNS → preferred_strategies
       → laws filtrées → synthesizeOrchestrated (1 seul call)
```

La règle : **une loi n'apparaît PAS si elle n'apporte aucun gain
runtime sur ce prompt précis**. `shouldSkipRoute` réalise déjà ce
gating à l'échelle de la stratégie (skip si `domain_fitness < 0.30`).
Cette mission descend le filtre au niveau de la **loi individuelle**
intégrée dans `lawsByStrategy` passé à `synthesizeOrchestrated`.

## 2. Triple détection AVANT génération

L'analyseur amont produit trois signaux indépendants combinés :

| Signal              | Source                                                   | Sortie utilisée                              |
|---------------------|----------------------------------------------------------|----------------------------------------------|
| `detectedDomain`    | `detectDomain(question)`                                 | `domain.key` + `cognitive_style` + `preferred_strategies` |
| `detectedStructures`| `STRUCTURE_PATTERNS` via `routeResults.structures`       | clés `propagation`/`causalite`/`bornage`/... |
| ambiguïté           | nombre de domaines matchés par `detectAllDomains`        | `>= 2` → mode généraliste prudent            |

Quand `detectAllDomains(question).length === 0`, fallback `general`
avec `preferred_strategies: ['frugale', 'runtime_rapide']`. Quand au
contraire deux domaines matchent (ex : BTP + juridique sur une
question de copropriété), le sélecteur garde le premier match mais
**élargit** `lawsByStrategy` aux unions des deux profils, sans
dépasser le cap `slice(0, 5)` appliqué dans `synthesizeOrchestrated`.

## 3. Mapping `preferred_strategies` par domaine

Repris depuis `DOMAIN_LEXICONS` (source unique de vérité, FR) :

| Domaine          | `preferred_strategies`                                       |
|------------------|--------------------------------------------------------------|
| `btp`            | `frugale`, `structurelle`, `anti_hallucination`              |
| `medicine`       | `anti_hallucination`, `structurelle`, `frugale`              |
| `legal`          | `anti_hallucination`, `structurelle`                         |
| `physics`        | `structurelle`, `anti_hallucination`, `temporal_survival`    |
| `ai_robustness`  | `anti_hallucination`, `structurelle`, `runtime_rapide`       |
| `epistemology`   | `structurelle`, `anti_hallucination`                         |
| `business`       | `frugale`, `runtime_rapide`, `structurelle`                  |
| `general`        | `frugale`, `runtime_rapide`                                  |

Seules ces stratégies hydratent `lawsByStrategy` pour
`synthesizeOrchestrated`. Les autres (ex : `temporal_survival` sur
BTP) sont **silencieusement exclues** : elles n'apportent aucun gain
runtime mais polluent le cadrage si injectées.

## 4. Limites honnêtes

- **`preferred_strategies` est hand-picked**, pas appris depuis le
  benchmark. La main de l'auteur peut sous-estimer une combinaison
  utile (ex : `temporal_survival` pourrait aider en médecine sur des
  questions de pronostic — non testé).
- **`DOMAIN_LEXICONS.keywords` est une regex FR hard-codée**. Une
  question multilingue ou un vocabulaire métier régional (ex :
  « architecte d'opération ») n'est pas matché.
- **Pas de scoring continu** : `detectDomain` retourne le **premier**
  match, sans pondération. Un texte BTP qui mentionne `RGPD` une
  fois bascule pas en juridique mais la pertinence n'est pas mesurée.
- **Filtrage au niveau loi non implémenté** : actuellement seul le
  niveau stratégie est filtré (`shouldSkipRoute`). Les 10 lois d'une
  stratégie pertinente sont injectées en bloc, dont possiblement
  certaines hors-sujet.
- **Pas encore validé live** : la promesse « une loi n'apparaît pas
  si elle n'apporte aucun gain » est *architecturale*, pas
  *empirique*. Mesure réelle = mission `DOMAIN_FITNESS_RUNTIME_MATRIX`.
