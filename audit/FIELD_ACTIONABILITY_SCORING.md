# FIELD_ACTIONABILITY_SCORING

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RESPONSE_COMPLETION_ENGINE.md`,
  `ROUTE_SPECIALIZATION_ENGINE.md`,
  `COGNITIVE_SPECIALIZATION_RUNTIME.md`,
  `ACTIONABILITY_ANALYSIS.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `ANTI_JARGON_PROTOCOL.md`
- Sources    : `app/src/completion.js::terrainAlignment`,
  `app/src/completion.js::fieldActionability`,
  `app/src/completion.js::TERRAIN_TERMS_RX`,
  `app/src/superiority.js::runSuperiorityComparison`
  (champs `terrain_alignment` + `field_actionability` par delta),
  intégration dans le composite `runtime_superiority`
  (terme `+0.10·terrain_delta`).

## 1. Pourquoi cette mission existe

`judgeResponses` produit déjà `actionability_score` (∈ [0, 1]), mais
ce score est **subjectif** — un LLM-as-judge évalue ce qu'il *croit*
être actionnable. Un texte plein de jargon ZORAN peut sembler
actionnable à Claude parce qu'il *parle de* faire des choses, sans
contenir un seul terme métier réel. Cette mission introduit une mesure
**objective** complémentaire : la densité de vocabulaire métier
concret (regex BTP/juridique français) dans la réponse, combinée au
score subjectif du juge pour donner un `field_actionability`
composite.

## 2. `terrainAlignment` — formule et regex

```js
const TERRAIN_TERMS_RX = /\b(
  BET|IPN|IPE|HEB|DTU|NF|EN|ISO|RT2012|RE2020|
  Consuel|Apave|Veritas|architecte|maître d'œuvre|MOE|
  maître d'ouvrage|MOA|béton|acier|charpente|ferraillage|
  descente de charges?|contreventement|fondations?|semelle|
  linteau|jambage|chevêtre|étaiement|tassement|fissure|
  étanchéité|isolation|VMC|électricien|plombier|maçon|
  géomètre|expert|bureau d'études?|bureau de contrôle|
  déclaration préalable|permis|mairie|notaire|assurance|
  garantie|décennale|biennale|RC pro
)\b/gi;
```

Algorithme :
```
matches = text.match(TERRAIN_TERMS_RX) || []
uniq    = new Set(matches.map(toLowerCase))
score   = min(1.0, uniq.size / 8)
```

Saturation à 8 termes uniques. Une réponse BTP qui mentionne BET, IPN,
descente de charges, contreventement, DTU, bureau de contrôle, Consuel,
décennale → score 1.0. Une réponse vague (« faire les vérifications
nécessaires ») → score 0.

## 3. `fieldActionability` — composite subjectif + objectif

```js
fieldActionability({ text, judgeActionability = 0.5 })
  = 0.6 · judgeActionability + 0.4 · terrainAlignment(text)
```

Pondération : **60% juge / 40% terrain**. Le juge garde la majorité
parce qu'il évalue aussi le tissu logique (étapes ordonnées,
conditions, alternatives) que `TERRAIN_TERMS_RX` ne capte pas. Le
terrain ajoute le veto factuel : une réponse sans aucun terme métier
est plafonnée à `0.6 · subjective_score + 0`.

Intégration dans `runSuperiorityComparison` :
- Chaque réponse reçoit `r.terrain_alignment = terrainAlignment(r.text)`.
- Chaque delta reçoit `field_actionability = fieldActionability({...})`.
- Le score composite `runtime_superiority` intègre
  `+0.10 · (candidate.terrain_alignment − baseline.terrain_alignment)`.

Effet : une route ZORAN qui produit une réponse riche en vocabulaire
métier réel gagne +0.10 max sur le composite vs la baseline. Une route
qui « parle ZORAN » (jargon `cadre / propagation / lentille`) sans
toucher au domaine concret perd ce terme — couplé à
`ANTI_JARGON_PROTOCOL`, c'est un double signal.

## 4. Pourquoi distinguer subjectif (juge) et objectif (terrain)

| Dimension              | `judge.actionability_score`         | `terrainAlignment`             |
|------------------------|-------------------------------------|--------------------------------|
| Nature                 | Subjective (jugement Claude)        | Objective (regex sur texte)    |
| Capte                  | Logique d'action, étapes ordonnées  | Vocabulaire métier réel        |
| Manque                 | Dégonflage par jargon flatteur      | Tissu logique entre les termes |
| Reproductibilité       | Variable (modèle, prompt)           | Déterministe                   |
| Domaine                | Tous                                | BTP/juridique FR uniquement    |

Garder les deux et les combiner force le winner à satisfaire les deux
contraintes : *avoir l'air actionnable* (juge) ET *parler la langue du
terrain* (regex). Une réponse purement subjective-haute (« faites
attention, prenez les bonnes mesures ») et terrain-zéro est mécaniquement
plafonnée à 0.6. Une réponse terrain-saturée mais mal structurée
(énumération brute) est plafonnée à 0.4.

**Honest limits :**

- **Biais BTP/juridique FR** : `TERRAIN_TERMS_RX` est massivement
  centrée chantier français. Une question médicale, agricole, IT,
  pédagogique produira `terrain_alignment ≈ 0` même pour une réponse
  parfaitement actionnable. La métrique est, en l'état, un proxy
  domaine-spécifique et non un détecteur universel.
- **Pas d'extension automatique** : ajouter un domaine = éditer la
  regex à la main. Aucun mécanisme d'apprentissage de lexiques.
- **Densité naïve** : `uniq.size / 8` ne capte pas la pertinence des
  termes par rapport à la question (un texte qui liste 8 termes BTP
  sur une question juridique scorera quand même 1.0).
- **Saturation à 8** arbitraire — une réponse à 15 termes uniques ne
  vaut pas plus qu'à 8. Pas calibré sur dataset.
- **`judge.actionability_score` reste biaisé** par le style de Claude
  (préférence pour les énumérations à puces, valorisation des
  conditionnels « si X alors Y »). Le composite hérite de ce biais.
