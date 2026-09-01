# ROUTE_SPECIALIZATION_ENGINE

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_FITNESS_MODEL.md`, `COGNITIVE_SPECIALIZATION_RUNTIME.md`,
  `RESPONSE_COMPLETION_ENGINE.md`, `HYBRID_ROUTE_FUSION_ENGINE.md`,
  `FIELD_ACTIONABILITY_SCORING.md`, `TRUNCATION_PREVENTION_SYSTEM.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`, `COGNITIVE_SELECTION_ENGINE.md`
- Sources    : `app/src/route_specialization.js::STRATEGY_PROFILE`,
  `app/src/route_specialization.js::computeDomainFitness`,
  `app/src/route_specialization.js::shouldSkipRoute`,
  `app/src/route_specialization.js::rankRoutesByFitness`,
  `app/src/superiority.js::runSuperiorityComparison` (boucle `skippedRoutes`),
  `app/src/superiority.js::renderComparison` (`skippedBanner`).

## 1. Why this mission exists

Avant cette mission, `runSuperiorityComparison` appelait
INDIFFÉREMMENT les 3 routes ZORAN du sous-ensemble `SUPERIORITY_ROUTES`
sur toute question soumise. Conséquence : coût API multiplié par 3
même pour une question où une route donnée n'a aucune chance d'être
pertinente (ex. `frugale` sur une question de diagnostic systémique
multi-cadres). Pire : la mauvaise réponse de cette route polluait le
benchmark — jugement biaisé, divergence artificielle gonflée, winner
écrasé par du bruit hors-domaine. Cette mission introduit la
**spécialisation cognitive runtime** : chaque route possède un profil
`{strong, weak}` aligné sur `STRUCTURE_PATTERNS` de
`structural_mapping.js`. Si la fitness < 0.30, la route est SKIPPÉE
(économie API + propreté benchmark).

## 2. Profils — `STRATEGY_PROFILE` (6 routes)

| Route                | strong (structures fortes)                                          | weak (structures faibles)                  |
|----------------------|---------------------------------------------------------------------|--------------------------------------------|
| `frugale`            | decision_action · risque · bornage · compression_synthese           | causalite · hypothese_cachee · comparaison |
| `anti_hallucination` | hypothese_cachee · contradiction · auditabilite · risque            | compression_synthese · decision_action     |
| `structurelle`       | propagation · temporalite · comparaison · contradiction · causalite | decision_action                            |
| `temporal_survival`  | temporalite · hypothese_cachee · propagation                        | compression_synthese · decision_action     |
| `runtime_rapide`     | decision_action · compression_synthese · bornage                    | causalite · temporalite                    |
| `propagation_forte`  | propagation · causalite · temporalite                               | compression_synthese · decision_action     |

Chaque entrée porte aussi `label_domains_forts` et
`label_domains_faibles` (chaînes FR utilisées en tooltip du chip skip).

## 3. `computeDomainFitness` + seuil de skip

Formule appliquée pour chaque route :

```
fitness = 0.5 + (strong_hits / total) * 0.5 - (weak_hits / total) * 0.4
fitness ∈ [0, 1]   (clamp via Math.max/Math.min)
```

avec `strong_hits` = nb de structures détectées présentes dans
`profile.strong`, `weak_hits` = idem pour `profile.weak`, `total` = nb
total de structures détectées. Si aucune structure détectée ou route
inconnue : retour 0.5 (neutre). Voir `DOMAIN_FITNESS_MODEL.md` pour la
justification des coefficients 0.5 / +0.5 / -0.4 et des exemples
concrets (BTP murs porteurs `structurelle` ≈ 0.65 vs `frugale` ≈ 0.45).

`shouldSkipRoute(strategy, structures, threshold = 0.30)` retourne
`true` si `fitness < 0.30`. Dans `runSuperiorityComparison`, la route
n'est PAS appelée ; un enregistrement
`{strategy, label, domain_fitness, profile, reason}` est poussé dans
`skippedRoutes` pour rendu UI.

## 4. UI `⊘ Routes ZORAN skippées hors-domaine` + limites

`renderComparison` injecte `skippedBanner` en tête de la section
ranking si `result.skippedRoutes.length > 0` : chip par route skippée
portant `Label (fitness X.XX)` + tooltip `profile.label_domains_forts`,
suivi d'une note `économie API + bruit benchmark évité`. Le user voit
explicitement pourquoi un candidat n'apparaît pas dans le classement.

**Honest limits :**

- `STRATEGY_PROFILE` est **hard-coded** — aucune phase d'apprentissage.
  Les couples (strong, weak) sont posés par intuition de design, pas
  dérivés d'observations runtime. V2 attendue : profils appris depuis
  l'historique des verdicts (`COGNITIVE_SPECIALIZATION_RUNTIME.md` §4).
- Seuil **0.30 arbitraire** — non calibré sur dataset. Peut faux-skipper
  une route capable d'une réponse inattendue (perte de sérendipité).
- `shouldSkipRoute` n'est appliqué qu'au sous-ensemble
  `SUPERIORITY_ROUTES = ['frugale','anti_hallucination','structurelle']`.
  Les 3 autres profils (`temporal_survival`, `runtime_rapide`,
  `propagation_forte`) sont définis mais pas encore branchés dans
  `runSuperiorityComparison`.
- Fitness est strictement linéaire en hits — pas de pondération par
  structure (toutes égales). Une `contradiction` dominante pèse autant
  qu'un `bornage` accessoire.
