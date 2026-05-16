# ACTIONABILITY_ANALYSIS

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RUNTIME_QUALITY_EVALUATION.md`, `PRACTICAL_RELEVANCE_SCORING.md`,
  `CONCRETE_RUNTIME_ALIGNMENT.md`, `ANTI_JARGON_PROTOCOL.md`,
  `RESPONSE_GRADING_SYSTEM.md`
- Sources    : `app/src/llm.js::judgeResponses` (ligne
  *« actionability_score : actions/étapes concrètes immédiates »*),
  `app/src/superiority.js::renderComparison` (chip *« actionable »*
  dans `sup-arg-metrics`).

## 1. Definition — `actionability_score`

`actionability_score ∈ [0..1]` mesure la **présence d'actions ou
d'étapes concrètes immédiates**. Un score élevé signifie qu'un user qui
ferme le navigateur juste après lecture sait quoi faire en premier dès
demain matin.

Différence avec `practical_relevance` (spec dédiée) :

- `practical_relevance` = *est-ce que ça concerne ma vraie question ?*
- `actionability_score` = *est-ce que je peux le faire ?*

Une réponse peut être pertinente sans être actionable (*« cela dépend
de plusieurs facteurs experts »* = 0.2). L'inverse est rare mais
possible (actionable hors-sujet).

## 2. Signaux détectés par le juge

Le prompt n'impose pas de checklist. Empiriquement, Claude juge haut
quand il détecte : **verbes d'action à l'impératif/infinitif** (faire
appel à, contacter, calculer, demander, vérifier, signer) ; **acteurs
nommés** (BET, bureau de contrôle, Consuel, mairie, notaire) ;
**artefacts concrets** (devis, étude, DTU, attestation) ; **ordre
temporel** (*« d'abord… ensuite… avant validation »*) ; **chiffres /
quantités opérationnelles**.

À l'inverse, fait chuter le score : méta-discours abstrait, vocabulaire
ZORAN (*propager, cadres, invariance*), conditionnel généralisé,
absence de tout sujet humain ou institutionnel.

## 3. Cas BTP de référence — *supprimer un mur porteur*

Cible imposée par `SILENT_LAW_GUIDANCE_ENGINE` et reprise dans le
prompt de `synthesizeRoute` :

> *« Avant tout : étude structure obligatoire par un BET, calcul
>   descente de charges, IPN ou IPE en remplacement, validation bureau
>   de contrôle. Sans cette étude, risque d'effondrement immédiat ou
>   différé. »*

Décomposition typique `actionability_score ≈ 0.95` : *étude structure*
(artefact), *BET* (acteur), *calcul descente* (action), *IPN/IPE*
(matériaux), *bureau de contrôle* (acteur), *« avant tout »* (ordre).

Anti-pattern *« préserver l'invariance morphologique en propageant les
charges »* → `actionability_score ≈ 0.10` (aucun acteur, aucun
artefact, aucun verbe exécutable).

## 4. Garde-fou objectif & honest limits

`jargon.js::concreteRuntimeAlignment` est la mesure locale équivalente,
calculée sans LLM (cf. `CONCRETE_RUNTIME_ALIGNMENT.md`). Affichée à
côté du chip *« actionable »* sous le libellé *« concret »*.

Convergence (*0.92 / 0.88*) = confiance haute. Divergence (*0.90 /
0.30*) = signal de sur-évaluation par le juge → relecture manuelle.

Limites :

- **Pas de classifieur d'actions** : aucun parseur ne compte les
  verbes ou acteurs ; le score est produit entièrement par Claude.
- **Biais culturel français BTP** : cible *« BET / IPN / Consuel »*
  calibrée pour BTP-FR ; sur un autre domaine, sous-notation par
  manque de contexte.
- **Confusion avec verbosité utile** : réponse longue riche en verbes
  peut être surnotée ; garde-fou = `compression_quality`.
- **Sur-actionnabilité dangereuse** : `actionability_score = 0.9` peut
  coexister avec `hallucination = 0.7` ; toujours croiser avec
  `hallucination_risk`.
- **Pas calibré inter-modèles** : Haiku surnote les réponses courtes
  même creuses ; Opus plus exigeant. Seuil *0.7 = bon* affiché en vert
  est indicatif, pas validé.
