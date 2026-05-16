# ROUTE_SPECIALIZATION_ENGINE

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_FITNESS_MODEL.md`, `COGNITIVE_SPECIALIZATION_RUNTIME.md`,
  `RESPONSE_COMPLETION_ENGINE.md`, `HYBRID_ROUTE_FUSION_ENGINE.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`, `COGNITIVE_SELECTION_ENGINE.md`
- Sources    : `app/src/route_specialization.js::STRATEGY_PROFILE`,
  `app/src/route_specialization.js::computeDomainFitness`,
  `app/src/route_specialization.js::shouldSkipRoute`,
  `app/src/route_specialization.js::rankRoutesByFitness`,
  `app/src/superiority.js::runSuperiorityComparison` (boucle `skippedRoutes`),
  `app/src/superiority.js::renderComparison` (`skippedBanner`).

## 1. Why this mission exists

Avant cette mission, `runSuperiorityComparison` appelait
INDIFFÉREMMENT les 3 routes ZORAN sur toute question. Coût API
multiplié par 3 même pour une question où une route donnée n'a aucune
chance d'être pertinente (ex. `frugale` sur une question de
diagnostic systémique multi-cadres). Pire : la mauvaise réponse de
cette route polluait le benchmark (jugement biaisé, divergence
artificielle gonflée). Cette mission introduit la **spécialisation
cognitive runtime** : chaque route possède un profil
`{strong, weak}` aligné sur `STRUCTURE_PATTERNS` de
`structural_mapping.js`. Si la fitness < 0.30, la route est
SKIPPÉE (économie API + propreté benchmark).

## 2. Profils de spécialisation — `STRATEGY_PROFILE`

| Route                | strong (structures fortes)                                                | weak (structures faibles)                              |
|----------------------|---------------------------------------------------------------------------|--------------------------------------------------------|
| `frugale`            | decision_action · risque · bornage · compression_synthese                 | causalite · hypothese_cachee · comparaison             |
| `anti_hallucination` | hypothese_cachee · contradiction · auditabilite · risque                  | compression_synthese · decision_action                 |
| `structurelle`       | propagation · temporalite · comparaison · contradiction · causalite       | decision_action                                        |
| `temporal_survival`  | temporalite · hypothese_cachee · propagation                              | compression_synthese · decision_action                 |
| `runtime_rapide`     | decision_action · compression_synthese · bornage                          | causalite · temporalite                                |
| `propagation_forte`  | propagation · causalite · temporalite                                     | compression_synthese · decision_action                 |

Chaque entrée porte également `label_domains_forts` et
`label_domains_faibles` (chaînes descriptives FR utilisées pour
l'affichage UI dans le bandeau de skip).

## 3. Algorithme `computeDomainFitness` + seuil de skip

Formule appliquée pour chaque route :

```
fitness = 0.5 + (strong_hits / total) * 0.5 - (weak_hits / total) * 0.4
fitness ∈ [0, 1]    (clamp via Math.max/Math.min)
```

où `strong_hits` = nb de structures détectées dans `profile.strong`,
`weak_hits` = idem pour `profile.weak`, `total` = nb de structures
détectées. Si aucune structure détectée ou route inconnue : retour 0.5
(neutre). Voir `DOMAIN_FITNESS_MODEL.md` pour la justification des
coefficients 0.5 / +0.5 / -0.4.

`shouldSkipRoute(strategy, structures, threshold = 0.30)` :
retourne `true` si `fitness < 0.30`. Conséquence dans
`runSuperiorityComparison` : la route N'EST PAS appelée, et est
enregistrée dans `skippedRoutes` avec
`{strategy, label, domain_fitness, profile, reason}`.

## 4. UI — bandeau `⊘ Routes ZORAN skippées hors-domaine` + limites

`renderComparison` injecte `skippedBanner` en tête de la section
ranking si `result.skippedRoutes.length > 0` :

```html
<div class="sup-skipped-banner">
  <strong>⊘ Routes ZORAN skippées hors-domaine (N) :</strong>
  <span class="sup-skipped-chip">Frugale (fitness 0.22)</span>
  ...
  <div class="sup-skipped-note">économie API + bruit benchmark évité</div>
</div>
```

Chaque chip porte `title=profile.label_domains_forts` (tooltip
expliquant pour quoi la route EST faite). Le user voit donc
explicitement pourquoi tel candidat n'apparaît pas dans le ranking.

**Honest limits :**

- `STRATEGY_PROFILE` est **hard-coded** — aucune phase d'apprentissage
  empirique. Les couples (strong, weak) sont posés par intuition de
  design, pas dérivés d'observations runtime. V2 attendue : profils
  appris depuis l'historique `runSuperiorityComparison`.
- Seuil **0.30 arbitraire** — non calibré sur dataset. Peut faux-skipper
  une route qui aurait surpris (cf. `COGNITIVE_SPECIALIZATION_RUNTIME.md`
  §4 sur la perte de sérendipité).
- `shouldSkipRoute` n'est appliqué qu'au sous-ensemble
  `SUPERIORITY_ROUTES = ['frugale', 'anti_hallucination', 'structurelle']`.
  Les 3 autres profils (`temporal_survival`, `runtime_rapide`,
  `propagation_forte`) sont définis mais pas encore branchés dans le
  benchmark de superiority.
- Fitness est une fonction strictement linéaire des hits — pas de prise
  en compte du POIDS de chaque structure détectée (toutes égales).
