# GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `SILENT_GUIDANCE_V3.md`, `ANTI_JARGON_PROTOCOL.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`,
  `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `ZORAN_AUTONOMY_STRESS_REPORT.md`
- Sources    : `app/src/llm.js::synthesizeOrchestrated`,
  `app/src/superiority.js::runSuperiorityComparison`
  (bloc `orchestratedTask`, candidat position 2 après baseline),
  `app/src/domain_detection.js::detectDomain`,
  `app/src/structural_mapping.js::STRUCTURE_PATTERNS`.

## 1. Why this mission exists

Le benchmark `ZORAN_AUTONOMY_STRESS_REPORT` (50 prompts offline) a
révélé un écart honteux : **baseline Claude brut gagne 34 %** des
prompts, la meilleure route ZORAN (`Frugale`) plafonne à **28 %** et
le composite cumulé des 6 routes spécialisées reste **inférieur** à la
réponse Claude sans aucune loi. La cause structurelle n'est pas le
manque de lois — c'est la **fragmentation cognitive** : 3 routes
parallèles génèrent 3 réponses partielles + 1 méta-fusion bruyante,
là où le baseline produit *une* réponse cohérente. Cette mission
inverse le pipeline : **1 seul appel LLM** combine les angles utiles
en gardant la prudence multi-cadres.

## 2. Les 5 angles articulés dynamiquement

`synthesizeOrchestrated({ question, domain, structures, lawsByStrategy,
parents })` lit le tableau `structures` (issu de
`structural_mapping.STRUCTURE_PATTERNS`) et active uniquement les
angles pertinents :

| Angle         | Déclencheurs (clés `structures`)                                   | Consigne injectée                                        |
|---------------|--------------------------------------------------------------------|----------------------------------------------------------|
| `STRUCTURE`   | `propagation`, `causalite`, `temporalite`                          | effets en cascade + causes racines multi-niveaux         |
| `ACTION`      | `decision_action`, `risque`                                        | 3-5 étapes concrètes immédiates priorisées par urgence   |
| `VALIDATION`  | `hypothese_cachee`, `contradiction`, `auditabilite`                | hypothèses cachées + ce qui doit être vérifié            |
| `BORNAGE`     | `bornage`, `compression_synthese`                                  | périmètre exact + limites franches de la réponse         |
| `TEMPS`       | `temporalite`                                                      | court terme (urgence) vs long terme (vieillissement)     |

Si aucune structure n'est détectée, fallback `Réponse standard
structurée`. Les angles ne sont **jamais nommés textuellement** dans
la réponse — le LLM les articule mentalement.

## 3. Économie 1-call vs 3-route + judge

Pipeline historique `runSuperiorityComparison` (route classique) :

```
3 × reformulateQuestion  →  3 × synthesizeRoute  →  1 × judgeResponses
                                                  = 7 calls
```

Pipeline orchestré (`synthesizeOrchestrated`) :

```
1 × synthesizeOrchestrated   (puis injecté en candidat #2 du juge)
                              = 1 call additionnel
```

Économie d'environ **25 %** sur le coût total de la cellule
benchmark (la baseline et les 3 routes restent calculées pour
comparaison), et **−66 %** sur la latence du sous-pipeline
orchestré. Le candidat orchestré est ajouté en **position 2 juste
après la baseline** dans `responses[]` (voir
`superiority.js::orchestratedTask`) pour permettre une lecture
visuelle directe *baseline → orchestré* avant les routes
spécialisées.

## 4. Structure du system prompt + exemple BTP

`buildSystemPrompt()` orchestré (résumé du code) :

```
Tu es un EXPERT du domaine "<domain.label>".
Vocabulaire attendu : <domain.vocab_hint>.

Cadres cognitifs activés MENTALEMENT (à NE JAMAIS citer) :
  • <top 5 lois fusionnées de lawsByStrategy>

═══ ANGLES À ARTICULER (sans les nommer) ═══
  • STRUCTURE / ACTION / VALIDATION / BORNAGE / TEMPS (filtré par structures)

═══ RÈGLES STRICTES ═══
1. Vocabulaire 100 % du domaine, AUCUN jargon ZORAN.
2. 4-7 phrases denses. Hiérarchise : urgence → contexte → limites.
3. Si fait incertain : dis-le franchement, renvoie expert humain.
4. TERMINE LA RÉPONSE (anti-troncature).
5. Évite "intéressant", "fascinant", "très cohérent".
```

Exemple intégré BTP — *« supprimer murs porteurs »* :

> ✗ « préserver l'invariance morphologique en propageant les charges »
> ✓ « Étape 1 : étude structure obligatoire par BET (calcul descente
>   charges + section IPN/IPE). Étape 2 : déclaration préalable en
>   mairie. Étape 3 : bureau de contrôle pour validation calculs.
>   Sans étude → risque effondrement + nullité garantie décennale.
>   Limite : dimensionnement exact dépend de la charge réelle. »

## 5. Limites honnêtes

- **Pas encore prouvé empiriquement** : le candidat `ZORAN Orchestré`
  est *câblé* dans le pipeline `superiority.js` mais le benchmark
  50 prompts n'a **pas été rejoué live** avec cette branche active.
  La supériorité espérée vs `baseline` reste une hypothèse.
- **Sélection d'angles binaire** : un angle est activé dès qu'**une**
  structure du déclencheur matche, sans pondération. Une question
  faiblement temporelle reçoit le même bloc `TEMPS` qu'une question
  centralement temporelle.
- **Lois fusionnées sans déduplication sémantique** : la `Map` par
  `l.id` déduplique les IDs mais pas le contenu équivalent issu de
  deux stratégies différentes. Bruit cadre possible.
- **MaxTokens fixé à 1000** : suffisant pour 4-7 phrases denses mais
  pas pour une question hybride multi-domaines (BTP + juridique).
- **Pas de fallback si LLM ignore les angles** : aucun post-filtre
  ne vérifie que l'angle `ACTION` a effectivement produit des étapes
  numérotées. Enforcement uniquement par prompt.
- **Cible `wins ≥ 70 %` non atteinte** : objectif mission, baseline
  actuelle 34 %. Atteinte du seuil = travail empirique restant.
