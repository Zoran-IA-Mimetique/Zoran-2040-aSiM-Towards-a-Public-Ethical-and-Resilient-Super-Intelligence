# COGNITIVE_SPECIALIZATION_RUNTIME

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `ROUTE_SPECIALIZATION_ENGINE.md`,
  `DOMAIN_FITNESS_MODEL.md`,
  `HYBRID_ROUTE_FUSION_ENGINE.md`,
  `RESPONSE_COMPLETION_ENGINE.md`,
  `FIELD_ACTIONABILITY_SCORING.md`,
  `COGNITIVE_ROUTE_EVOLUTION.md`,
  `COGNITIVE_SELECTION_ENGINE.md`
- Sources    : `app/src/route_specialization.js` (module entier),
  `app/src/superiority.js::runSuperiorityComparison` (intégration
  skip + `skippedRoutes`), `app/src/structural_mapping.js`
  (détection des structures).

## 1. Pourquoi cette vision compte

Pré-mission, ZORAN exécutait un **benchmark uniforme** : sur chaque
question, les 3 routes du sous-ensemble `SUPERIORITY_ROUTES` étaient
appelées indistinctement. C'était un *ensemble de routes concurrentes*
— sans conscience d'elles-mêmes, sans conscience du domaine. Une route
diagnostique pure (`structurelle`) répondait sur une question d'urgence
terrain ; une route action rapide (`frugale`) répondait sur une
question de propagation causale long-terme. Verdict moyen, ressources
gaspillées, bruit benchmark. Cette mission opère un changement de
paradigme : **ZORAN devient un système de cognition spécialisée
adaptative**. Chaque route SAIT pour quel type de question elle est
faite, et le système SAIT quand ne pas l'invoquer.

## 2. Le principe « skip > appel inutile »

Trois bénéfices alignés :

1. **Économie API** — une route skippée = un appel LLM en moins
   (`synthesizeRoute` ≈ 900 tk output + reformulation 120 tk + part
   juge). Sur 3 routes ZORAN, skipper 1 réduit le coût d'environ 30%
   d'une session superiority.
2. **Propreté benchmark** — une mauvaise réponse hors-domaine fait
   monter `response_divergence` artificiellement, attire le juge dans
   un classement biaisé (la route hors-domaine sert de référence basse
   pour les autres), et pollue les deltas vs baseline.
3. **Honnêteté UX** — le user voit dans `skippedBanner` quelle route a
   été écartée ET pourquoi (label_domains_forts, fitness). Aucune
   illusion de comparaison exhaustive.

L'arbitrage explicite : on accepte de PERDRE une réponse possiblement
intéressante (`COGNITIVE_ROUTE_EVOLUTION.md` parle de sérendipité)
pour GAGNER en signal/bruit. C'est un choix de design assumé, pas un
fait empirique mesuré.

## 3. Architecture cognitive — du concurrent au spécialisé

```
Pré-mission (concurrence aveugle)        Post-mission (spécialisation)
─────────────────────────────────        ──────────────────────────────────
question                                 question
   │                                        │
   ├─► frugale          ┐                   ├─► structural_mapping
   ├─► anti_hallucination├─ tous appelés    │      → detectedStructures[]
   └─► structurelle     ┘ tous jugés        │
                                            ├─► rankRoutesByFitness()
   → 3 réponses → juge                      │      computeDomainFitness(strat, struct)
                                            │
                                            ├─► pour chaque route candidate :
                                            │      if shouldSkipRoute (<0.30) → skip
                                            │      else → appeler
                                            │
                                            ├─► réponses survivantes → juge
                                            │   + pénalité troncature (completion.js)
                                            │   + terrain_alignment (completion.js)
                                            │
                                            └─► UI : skippedBanner + warnings fitness
```

Chaque route reçoit une *identité cognitive* (`STRATEGY_PROFILE`)
parallèle à son set de lois. Cette identité est mécanique : un dict
JSON. Mais elle introduit la possibilité de raisonner sur **les routes
en tant que sujets**, pas seulement comme des fonctions.

## 4. Path vers V2 — profils appris empiriquement

L'état actuel est V1 explicite :
- `STRATEGY_PROFILE` hard-coded (intuition de design).
- Seuil `0.30` non calibré.
- 3 routes branchées sur 6 profilées (`temporal_survival`,
  `runtime_rapide`, `propagation_forte` définies mais inactives).
- Aucune fusion (cf. `HYBRID_ROUTE_FUSION_ENGINE.md`).

V2 attendue :
- **Profils appris** depuis l'historique `runSuperiorityComparison` :
  pour chaque tuple `(detectedStructures, strategy, argumented_grade_20)`
  observé, dériver empiriquement quelles structures corrèlent avec une
  bonne note pour chaque route. Remplace l'intuition par les données.
- **Seuil adaptatif** : `threshold` recalibré par
  `precision@k = grades observés / appels effectués`.
- **Activation des 3 routes dormantes** dans le benchmark, avec
  rotation pour collecter du signal sur chacune.
- **Fusion hybride** optionnelle (cf. mission V2).

**Honest limits de la vision :**

- Le concept de « spécialisation cognitive » est, en V1, **purement
  structurel** — il ne touche pas la qualité interne du raisonnement
  d'une route, juste son éligibilité à répondre.
- Skipper n'améliore PAS la réponse de la route gardée — ça réduit
  juste le bruit comparatif. Le gain est dans le BENCHMARK, pas dans
  la cognition de chaque route.
- Le risque de **sur-spécialisation** existe : à seuil trop strict, on
  finit avec une seule route par domaine et on perd la comparaison.
  C'est exactement le contraire du multi-winner que ZORAN défend
  ailleurs (`MULTI_WINNER_REFORMULATION_ENGINE.md`).
