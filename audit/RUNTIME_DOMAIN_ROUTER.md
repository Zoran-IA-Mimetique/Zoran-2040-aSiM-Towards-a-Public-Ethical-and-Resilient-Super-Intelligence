# RUNTIME_DOMAIN_ROUTER

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_LAW_SELECTION_ENGINE.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `SILENT_LAW_COMPOSER.md`, `DOMAIN_DOMINANCE_MATRIX.md`.
- Sources    : `app/src/domain_detection.js::DOMAIN_LEXICONS`,
  `app/src/domain_detection.js::detectDomain`,
  `app/src/llm.js::synthesizeOrchestrated` (ligne 203 :
  `const domStyle = domain?.cognitive_style || 'réponse claire et
  structurée';`), `app/src/superiority.js::orchestratedTask`.

## 1. Pourquoi un router par style cognitif

Le routeur historique n'orientait que sur le **vocabulaire de surface**
(`vocab_hint`). Cette mission ajoute un second axe : le **style
cognitif** propre à chaque métier. Un BTP n'attend pas la même
texture de raisonnement qu'un dossier juridique ou un cas clinique —
même si les deux peuvent demander 4 phrases denses. Le champ
`cognitive_style` (ajouté à `DOMAIN_LEXICONS`) est injecté
explicitement dans le system prompt :

```js
// llm.js ligne 208
`Style cognitif attendu : ${domStyle}.`,
```

Le LLM reçoit donc trois directives en cascade : *expert du domaine*
→ *vocabulaire du domaine* → *style de raisonnement du domaine*. Ce
n'est plus seulement « parle BTP » mais « pense BTP ».

## 2. Table 8 domaines × style × stratégies préférées

Extrait fidèle de `DOMAIN_LEXICONS` (source de vérité unique) :

| `key`           | `cognitive_style`                                                            | `preferred_strategies`                              |
|-----------------|------------------------------------------------------------------------------|-----------------------------------------------------|
| `btp`           | terrain + propagation des charges + pathologies lentes + hiérarchisation urgence | `frugale`, `structurelle`, `anti_hallucination`     |
| `medicine`      | clinique + causalité multi-factorielle + diagnostic différentiel + urgences vitales | `anti_hallucination`, `structurelle`, `frugale`     |
| `legal`         | opposabilité + hiérarchie normes + charge preuve + recours possibles         | `anti_hallucination`, `structurelle`                |
| `physics`       | structure conceptuelle + invariances + régimes de validité + limites théoriques | `structurelle`, `anti_hallucination`, `temporal_survival` |
| `ai_robustness` | robustesse + benchmark + métriques + dérive distributionnelle                | `anti_hallucination`, `structurelle`, `runtime_rapide` |
| `epistemology`  | distinction conceptuelle + critère démarcation + niveaux logiques            | `structurelle`, `anti_hallucination`                |
| `business`      | systèmes complexes + arbitrages multi-objectifs + signaux faibles + ROI      | `frugale`, `runtime_rapide`, `structurelle`         |
| `general`       | réponse claire et structurée                                                 | `frugale`, `runtime_rapide`                         |

## 3. Comment `cognitive_style` influence la réponse

Trois exemples concrets pour un même verbe ("évaluer un risque") :

- **BTP** → le LLM raisonne *propagation des charges* puis *pathologie
  lente* (fissure évolutive, infiltration). La réponse priorise
  l'étaiement immédiat avant l'expertise BET.
- **Médecine** → le LLM raisonne *diagnostic différentiel* puis
  *urgence vitale*. La réponse liste 2-3 diagnostics possibles + le
  drapeau rouge à éliminer en premier.
- **Juridique** → le LLM raisonne *opposabilité* puis *charge de la
  preuve*. La réponse précise qui doit prouver quoi, dans quel délai,
  devant quelle juridiction.

Aucun de ces angles n'apparaît textuellement (`cognitive_style` n'est
jamais cité). Il **biaise la sélection** des points abordés, pas le
vocabulaire de surface — qui reste régi par `vocab_hint`.

## 4. Limites honnêtes

- **`cognitive_style` est une phrase libre, pas un type** : le LLM
  l'interprète à sa façon, aucune contrainte structurelle. Un même
  style peut produire des réponses très différentes selon le prompt.
- **Pas de pondération par certitude de domaine** : `detectDomain`
  retourne le premier match, sans score. Un texte ambigu BTP+juridique
  reçoit *un* style cognitif, jamais une fusion.
- **Pas mesuré empiriquement** : l'effet de l'ajout `cognitive_style`
  vs version sans n'a **pas** été A/B-testé. Hypothèse architecturale.
- **Couverture incomplète** : 8 domaines seulement. Finance,
  agriculture, éducation, énergie, RH ne sont pas modélisés et
  retombent en `general` (style cognitif neutre).
- **Regex FR figées** : un prompt en anglais ou en espagnol bascule
  systématiquement en `general`, perdant tout le routage cognitif.
- **`preferred_strategies` n'est pas appris** : main de l'auteur.
  L'absence de `runtime_rapide` pour `legal` ou `medicine` est un
  choix — pas une mesure.
