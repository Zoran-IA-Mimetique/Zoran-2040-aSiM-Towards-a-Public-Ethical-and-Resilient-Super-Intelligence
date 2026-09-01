# REAL_WORLD_QUERY_MAPPING

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `STRUCTURAL_QUERY_MAPPING_ENGINE.md`,
  `STRUCTURAL_RETRIEVAL_SYSTEM.md`, `CONCRETE_RUNTIME_ALIGNMENT.md`,
  `REAL_WORLD_ALIGNMENT_TESTS.md`, `REAL_WORLD_VALIDATION_PHASE.md`,
  `META_NOISE_REDUCTION_ENGINE.md`
- Sources    : `app/src/structural_mapping.js::STRUCTURE_PATTERNS`,
  `mapStructural`, `app/src/chat.js::compete` (banner structures).

## 1. Le cas BTP — analyse structure-par-structure

Question utilisateur exacte (paraphrasée du benchmark 2026-05-16) :

> *« Un maître d'ouvrage veut supprimer plusieurs murs porteurs dans
>    un immeuble ancien. Que faut-il faire ? »*

`mapStructural` détecte **4 structures** :

| Structure       | Token déclencheur       | Familles activées | Lois (échantillon)              |
|-----------------|-------------------------|-------------------|----------------------------------|
| `risque`        | implicite (mur porteur) | WP12              | WP12-002, WP12-004, WP12-009    |
| `propagation`   | « supprimer », structur | GHUC, UDE         | GHUC-001..003, UDE-001          |
| `temporalite`   | « immeuble ancien »     | PAL, WP11         | PAL-001, PAL-002, WP11-013      |
| `decision_action` | « veut », « faire »   | SDE, WP12         | SDE-001, SDE-009, WP12-034      |

**6 familles activées** : WP12, GHUC, UDE, PAL, WP11, SDE.

Avant : `maxTopicRelevance = 0.023`, banner *« hors-domaine ZORAN »*,
0 réponse. Après : la banner cyan *structures* affiche les 4 chips,
le retrieval injecte les lois boostées via `structuralTopicBoost`, le
pipeline LLM (`synthesizeRoute` × 3 stratégies) peut tourner.

## 2. Autres cas réels candidats (à tester)

| Domaine     | Question type                                                  | Structures attendues                          |
|-------------|----------------------------------------------------------------|-----------------------------------------------|
| Juridique   | *« Mon bailleur refuse les travaux malgré l'urgence… »*       | contradiction, decision_action, auditabilite  |
| Médical     | *« Symptômes contradictoires, dois-je consulter ? »*           | contradiction, risque, decision_action        |
| Projet IT   | *« Migrer la prod un vendredi, est-ce raisonnable ? »*         | risque, temporalite, decision_action          |
| Finance     | *« Comparer deux placements long terme »*                      | comparaison, temporalite, decision_action     |
| Science     | *« Pourquoi cette expérience donne ce résultat ? »*            | causalite, hypothese_cachee                   |

Aucun de ces cas n'a encore été passé en runtime contrôlé ; ils sont
listés comme **candidats de test prioritaires** pour mesurer la
généralisation hors-BTP.

## 3. Lecture du mapping BTP en clair (français)

- `risque → WP12` : famille admissibilité-sécurité, naturelle pour
  tout sujet où l'erreur a un coût physique.
- `propagation → GHUC + UDE` : compression hiérarchique +
  unification-décomposition — ce qui se passe quand on retire un nœud
  porteur d'une structure.
- `temporalite → PAL + WP11` : permanence ancestrale + lois
  d'évolution, pour un immeuble qui vieillit.
- `decision_action → SDE + WP12` : sélection-décision encadrée par
  l'admissibilité. C'est la signature classique « maître d'ouvrage
  doit valider ».

Ce mapping est **interprétatif** : les familles WP12/GHUC/PAL/SDE ont
été conçues pour des problèmes cognitifs abstraits ; leur projection
sur un cas BTP est une **analogie structurale**, pas une équivalence
sémantique stricte.

## 4. Limites honnêtes

- **N = 1 cas réellement testé** (BTP). Les 5 autres lignes du tableau
  §2 sont des prédictions, pas des observations.
- Les structures sont détectées par regex **hard-codées et
  francophones** — un même cas posé en anglais matcherait peu.
- Aucun expert métier n'a validé la pertinence du mapping
  `propagation → GHUC + UDE` pour le BTP réel. C'est l'intuition de
  conception, pas une revue par un bureau d'études.
- Le boost structurel élève les lois dans le tri, mais ne garantit en
  rien que la **réponse finale** sera utile pour un maître d'ouvrage
  — cela dépend de l'anti-jargon (cf. `ANTI_JARGON_PROTOCOL.md`).
- Pas de dataset annoté `(question, domaine, structures vraies)`
  pour mesurer la précision du `mapStructural` au-delà des
  vérifications visuelles.
- Aucun mécanisme de désambiguïsation : *« cause »* dans un sens
  juridique vs scientifique active le même `causalite → SDE`.
