# ADVERSARIAL_DISCRIMINANT_RESULTS — Test 2 du triptyque Oracle

- **mission_id** : ZORAN_CORE_OS_FOUNDATION_20260520
- **date** : 2026-05-20T19:30:00Z
- **outil** : `tools/adversarial_discriminant_check.mjs` (reproductible, sans API)
- **portée** : **validation ARCHITECTURE uniquement** — ground truth synthétique, non-BET
- **enjeu** : trancher le sort de 9 modules CONDITIONAL (cluster adversarial, 1482 LOC)

## Question falsifiable

> Le moteur `adversarialSurvivability()` (dormant) discrimine-t-il les 5 cas
> du benchmark P0 mieux qu'un baseline trivial ?

## Résultats bruts

| Cas | Label | Attendu | Score moteur (v12) | Verdict moteur |
|---|---|---|---|---|
| CASE_1 | A1_EXPERT_COURT | 9 | **1.00** | SURVIVES_CONTRADICTORY |
| CASE_2 | A2_VRAI_TERRAIN_VERNACULAIRE | 8 | 0.70 | SURVIVES_CONTRADICTORY |
| CASE_3 | A4_CAUSALITE_INVERSEE | 2.5 | 0.52 | PARTIALLY_FRAGILE |
| CASE_4 | A5_FAUX_EXPERT_LONG | 2 | **0.70** | SURVIVES_CONTRADICTORY |
| CASE_5 | B1_EXPERT_RGA_COMPLET | 9.5 | 0.70 | SURVIVES_CONTRADICTORY |

Spearman vs ground truth (n=5) : moteur **0.447** · meilleur baseline **0.30** ·
marge **+0.147**. Verdict automatique : **INCONCLUSIVE**.

## Lecture qualitative — plus dure que l'INCONCLUSIVE statistique

Le verdict automatique (Spearman 0.447, entre les seuils) masque un **échec
qualitatif net** :

1. **Le moteur rate son cas d'usage cardinal.** CASE_4 = « faux expert long »,
   le cas adversarial archétypal que ce moteur EXISTE pour détruire. Le moteur
   lui donne **0.70 / verdict SURVIVES_CONTRADICTORY** — exactement le même
   score qu'au vrai expert complet CASE_5 (attendu 9.5). Un faux expert verbeux
   « survit à la contradiction » selon le moteur. C'est l'inverse de sa raison
   d'être.

2. **Séparation échouée.** Les 2 cas connus mauvais (CASE_3, CASE_4) devraient
   occuper le bas du classement. Le moteur place en bas CASE_3 + **CASE_2** —
   il relègue le *vrai* terrain vernaculaire et laisse passer le *faux* expert.

3. **Ordre interne incohérent.** CASE_1 (expert court) obtient 1.00, CASE_5
   (expert complet, attendu supérieur) obtient 0.70. Le moteur préfère le court
   au complet — sans raison falsifiable.

## Cause racine (analyse de conception)

Le moteur mesure la **forme**, pas le **fond**. Ses 5 couches comptent : claims
causaux (regex de surface), instrumentation citée, quantification présente,
références légales, falsifiabilité annoncée. Un faux expert verbeux **coche
toutes ces cases de forme** : il cite des outils, des chiffres, des articles,
sonne rigoureux. Le moteur, basé sur des regex, **ne distingue pas un claim
causal vrai d'un claim causal plausible-mais-faux**.

C'est précisément le défi que la mission `ADVERSARIAL_REALITY_ENGINE` énonçait
(« détecter la causalité syntaxiquement correcte mais fausse ») — et que le code
V12 actuel **ne relève pas**. Échec de conception, pas bug d'implémentation.

## Recommandation à Oracle

Le verdict statistique est INCONCLUSIVE, mais le verdict d'ingénierie est clair :

- **NE PAS brancher le moteur tel quel.** Branché, il validerait des faux
  experts (`SURVIVES_CONTRADICTORY` sur CASE_4) — pire que pas de moteur.
- **Cluster adversarial → REMOVE** du code V8-V12 actuel (1482 LOC). Il ne
  fournit pas le pouvoir discriminant attendu et échoue sur son cas central.
- Si le paradigme adversarial est conservé pour V13, le **REBUILD doit repartir
  de zéro** sur une mesure de fond (causalité réelle), **pas** du code actuel
  qui mesure la forme. Et ce rebuild reste gated sur la règle fondatrice
  (falsification P0 avant toute nouvelle couche).

## Limite assumée (portée du test)

Ce test compare le moteur à un **ground truth synthétique** (`_zoran_expected_
score` = intuitions ZORAN, cf. `note_critique` du benchmark). Il prouve une
chose : le moteur n'a pas de pouvoir discriminant architectural net, **même
contre un ground truth favorable construit en interne**. Si le moteur échoue
déjà sur un ground truth maison, il n'y a aucune raison d'espérer qu'il
réussisse sur un BET réel. Le test est **unidirectionnel** : suffisant pour
conclure « pas de valeur démontrée », insuffisant pour conclure l'inverse.

La validation métier réelle reste, elle, gated sur P0-MINI BET humain.

## Décision

`adversarial_discriminant` → **verdict moteur : ENGINE_NO_ADDED_VALUE en
pratique** (INCONCLUSIVE statistique + échec qualitatif sur le cas central).
Recommandation : passer les 9 modules CONDITIONAL → **DORMANT_REMOVE**, sous
réserve de validation Oracle. Données : `audit/adversarial_discriminant_results.json`.
