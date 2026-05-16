# PRACTICAL_RELEVANCE_SCORING

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RUNTIME_QUALITY_EVALUATION.md`, `ACTIONABILITY_ANALYSIS.md`,
  `ANTI_JARGON_PROTOCOL.md`, `CONCRETE_RUNTIME_ALIGNMENT.md`,
  `RESPONSE_GRADING_SYSTEM.md`
- Sources    : `app/src/llm.js::judgeResponses` (ligne *« practical_relevance
  : utilité réelle pour le user de la question »*),
  `app/src/superiority.js::renderComparison` (chip *« pratique »* dans
  `sup-arg-metrics`).

## 1. Definition — `practical_relevance` ≠ `coherence`

`practical_relevance` mesure *l'utilité réelle pour le user de la
question*. C'est l'axe le plus différenciant, parce qu'il est
**indépendant de la justesse et de la cohérence internes**.

Une réponse peut être factuellement correcte
(`precision = 0.95`), internement cohérente (`coherence = 0.90`), non
hallucinée (`hallucination = 0.05`) et néanmoins **inutile** pour le
user qui posait la question.

C'est précisément le cas que la mission veut faire remonter — *une
réponse cohérente mais abstraite doit PERDRE*, comme l'impose le prompt
juge : *« Une réponse très cohérente et fascinante sans utilité
concrète PERD. »*

## 2. Comment le juge identifie le score

Le prompt système ne donne pas de heuristique chiffrée. En pratique,
les signaux que Claude détecte sont :

- **acteurs nommés du domaine** (BET, bureau de contrôle, Consuel,
  médecin traitant, articles de loi cités) ;
- **verbes d'action exécutables** (faire faire, demander, vérifier,
  appeler) plutôt que verbes méta (préserver, articuler, propager) ;
- **spécificité au cas user** plutôt que généralités universelles ;
- **absence de méta-discours** (*« il est important de comprendre
  que… »* fait chuter le score).

Garde-fou objectif côté `jargon.js` : `practical_usefulness`, affiché
dans le tableau « Qualité runtime concret ». Divergence forte juge ↔
`jargon.js` = signal de relecture humaine.

## 3. Cas BTP de référence — *supprimer un mur porteur*

| Réponse                                                         | `coherence` | `practical_relevance` |
|-----------------------------------------------------------------|-------------|-----------------------|
| *« préserver l'invariance morphologique en propageant les charges »* | 0.85 | 0.15 |
| *« articuler les cadres global → intermédiaire → local »*           | 0.80 | 0.05 |
| *« étude structure obligatoire par un BET, IPN/IPE, validation bureau de contrôle »* | 0.80 | 0.95 |

Les deux premières sont des productions ZORAN historiques — valides
mais inopérantes. La troisième est la cible imposée par
`SILENT_LAW_GUIDANCE_ENGINE` : *même cognition, vocabulaire du
domaine, acteurs nommés*. Seule éligible à `argumented_grade_20 ≥ 15`.

## 4. Honest limits

- **Domaine-dépendant** : *practically relevant* en BTP n'a rien à
  voir avec en médecine. Le juge devine le domaine depuis la question.
  Sur une question méta-ZORAN, l'axe s'inverse (le jargon ZORAN
  devient relevant).
- **Subjectif** : deux experts humains peuvent diverger largement. Le
  juge Claude n'a pas accès à *l'intention* du user (DIY ? expertise ?
  curiosité ?).
- **Pas mesuré objectivement** : `practical_usefulness` de `jargon.js`
  est un proxy heuristique (compte de verbes, chiffres, noms propres),
  pas une mesure de pertinence réelle.
- **Risque de sur-pénalisation des réponses prudentes** : *« je ne
  sais pas, demandez à un expert »* est honnête mais peut être notée
  `≈ 0.3` par un juge qui valorise l'action brute. Lire les
  `weaknesses` avant de conclure.
