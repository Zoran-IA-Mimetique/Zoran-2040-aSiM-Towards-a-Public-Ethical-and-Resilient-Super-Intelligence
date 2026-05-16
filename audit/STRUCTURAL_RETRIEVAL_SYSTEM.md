# STRUCTURAL_RETRIEVAL_SYSTEM

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `STRUCTURAL_QUERY_MAPPING_ENGINE.md`,
  `REAL_WORLD_QUERY_MAPPING.md`, `STRUCTURAL_RANKING_SYSTEM.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `CONTEXTUAL_LOADING_ENGINE.md`,
  `ANTI_DRIFT_PROTOCOL.md`
- Sources    : `app/src/structural_mapping.js::structuralTopicBoost`,
  `mapStructural`, `app/src/chat.js::compete` (intégration
  `topicScore = max(lex, struct)` + redéfinition off-topic).

## 1. Du matching lexical pur au max(lex, struct)

Avant la mission, `compete()` calculait :

```
topicScore(node) = |qTokens ∩ lawTokens| / |qTokens|     # pur lexical
maxTopicRelevance = max over all nodes of topicScore
offTopic = (maxTopicRelevance < seuil)
```

Sur la question BTP *« supprimer murs porteurs »*, ce score saturait à
**0.023** : aucun token de la question n'apparaissait dans la moindre
loi ZORAN. La question devenait off-topic *par défaut lexical*, alors
qu'elle activait structurellement *risque + propagation + temporalité
+ décision*.

La mission introduit le canal structurel :

```
struct_boost(node) = structuralTopicBoost(node, structMap)
topicScore(node)   = max(lex_score(node), struct_boost(node))
maxTopicRelevance  = max over nodes
offTopic = (maxTopicRelevance < 0.10)
       AND (qTokens.size > 0)
       AND (structMap.structures.length === 0)
```

Une question avec au moins une structure cognitive détectée n'est
plus jamais classée off-topic, même sans recouvrement lexical.

## 2. Formule du boost structurel

Définie dans `structuralTopicBoost(node, structuralMap)` :

```
boost = 0
if node.id            ∈ matched_laws     → boost += 0.40
if family(node.id)    ∈ matched_families → boost += 0.15
return min(0.55, boost)
```

Interprétation :

- Une loi explicitement listée dans le pattern matché reçoit `0.40` —
  largement au-dessus du seuil off-topic `0.10`, ce qui l'élève
  immédiatement dans le tri par `topicScore`.
- Une loi de la même famille reçoit `0.15` — non décisif seul, mais
  suffisant pour entrer dans le top-K si plusieurs familles convergent.
- Le cap `0.55` empêche le boost de dominer totalement un signal
  lexical fort (on garde `max(lex, struct)` ≤ 1.0 et la lexicalité
  réelle peut toujours gagner).

## 3. Pourquoi `0.40` + `0.15` (heuristique)

Les deux poids sont **choisis à la main** sur trois contraintes :

| Contrainte                                                | Conséquence sur le poids        |
|-----------------------------------------------------------|---------------------------------|
| `node.id ∈ matched_laws` doit dépasser le seuil off-topic (0.10) | poids loi > 0.10  → choisi 0.40 |
| Une seule famille seule ne doit pas franchir le seuil      | poids fam < 0.20  → choisi 0.15 |
| Famille + loi combinées doivent rester sous 1.0            | 0.40 + 0.15 = 0.55 ≤ 1.0        |

C'est un calibrage **par intuition de design**, pas une optimisation.
Aucune validation croisée n'a été conduite ; aucun A/B test n'a
discriminé `(0.40, 0.15)` contre `(0.30, 0.10)` ou `(0.50, 0.20)`.

## 4. Limites honnêtes & chemin d'apprentissage

- **Pondérations non entraînées** : `0.40` et `0.15` sont des poids
  *prior*. Un dataset annoté `(question, loi pertinente)` permettrait
  d'apprendre ces poids par régression logistique simple.
- **Pas de feedback utilisateur** : la UI affiche le banner structures
  mais n'enregistre pas si l'utilisateur a jugé les lois retenues
  pertinentes. Sans signal, pas d'apprentissage en ligne.
- **Pas de mesure de precision/recall** sur le retrieval structurel :
  on sait qu'il *sauve* le cas BTP, on ne sait pas combien de faux
  positifs il introduit ailleurs.
- **Couplage fort avec `STRUCTURE_PATTERNS`** : la qualité du boost
  est plafonnée par la qualité des regex hard-codées. Voir
  `STRUCTURAL_QUERY_MAPPING_ENGINE.md` §5.
- **Pas d'effet sur le judge LLM** : le boost influence uniquement
  le tri du retrieval pré-LLM ; `judgeResponses` ignore complètement
  `structural_match_score`.
- **Chemin v2** : exposer `(question, top_K_lois_retenues,
  user_feedback)` dans la telemetry, puis entraîner les deux poids
  hors-ligne sur un échantillon ≥ 200 paires.
