# HYBRID_ROUTE_FUSION_ENGINE

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Status     : **NON IMPLÉMENTÉ V1 — proposition V2**
- Cross-refs : `ROUTE_SPECIALIZATION_ENGINE.md`,
  `DOMAIN_FITNESS_MODEL.md`,
  `COGNITIVE_SPECIALIZATION_RUNTIME.md`,
  `RESPONSE_COMPLETION_ENGINE.md`,
  `FIELD_ACTIONABILITY_SCORING.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`
- Sources prévues (V2) : `app/src/route_specialization.js`
  (extension `fuseStrengths`), `app/src/superiority.js`
  (intégration d'un candidat synthétique `ZORAN HYBRID`),
  `app/src/llm.js::synthesizeHybrid` (à créer).

## 1. Pourquoi cette mission existe (et n'est pas livrée)

`ROUTE_SPECIALIZATION_ENGINE` répond en V1 à une question binaire :
*pour cette question, quelle route appeler / skipper ?* Mais sur les
questions où PLUSIEURS routes sont pertinentes avec des angles
COMPLÉMENTAIRES (ex. `structurelle` excelle au diagnostic,
`frugale` à l'action, `anti_hallucination` à la validation), le user
récupère 3 réponses séparées. Aucune ne porte la synthèse des trois
forces. Une mission V2 — `HYBRID_ROUTE_FUSION` — est mentionnée dans
le brief de la mission mais **délibérément non livrée en V1** parce
qu'une fusion mal designée produit plus de bruit que de signal.

## 2. Architecture proposée

```
detectedStructures
    │
    ├─► rankRoutesByFitness → [{strategy, fitness}, ...]
    │
    ├─► top-3 par fitness, chacune répond (synthesizeRoute)
    │       structurelle → R1
    │       frugale      → R2
    │       anti_hallu   → R3
    │
    ├─► extractStrengths(R1, R2, R3)
    │       R1 → bloc « diagnostic systémique »
    │       R2 → bloc « action terrain »
    │       R3 → bloc « validation / point de vigilance »
    │
    └─► synthesizeHybrid({ blocks, question })
            → réponse unifiée structurée en 3 segments
            → candidat « ZORAN HYBRID » injecté dans le juge
```

Le candidat `ZORAN HYBRID` est ajouté au pool jugé par `judgeResponses`
au même titre que `baseline`, `structurelle`, `frugale`,
`anti_hallucination`. Si la fusion est de qualité, elle remporte le
verdict ; sinon, elle est explicitement dominée par une route
spécialisée — feedback empirique direct sur la valeur de la fusion.

## 3. Pourquoi V1 préfère ne pas fusionner

- **Risque de fusion bruitée** — concaténer 3 réponses sans dégager
  leur force respective produit du verbiage redondant, pas une
  synthèse. La fusion exige un schéma d'extraction (`extractStrengths`)
  qui n'existe pas encore et qui dépend du domaine (les forces de
  `structurelle` en BTP ≠ forces en droit fiscal).
- **Coût d'inférence multiplié** — `synthesizeHybrid` est un appel LLM
  supplémentaire (≈ 900 tk output) au-dessus des 3 routes déjà
  exécutées. Sur une session superiority, le coût total passe de
  ≈ 6700 à ≈ 7600 tokens output.
- **Risque de masquage** : la fusion crée un winner « cosmétique » qui
  masque les forces individuelles. Le user perd le bénéfice de voir 3
  angles distincts (mission `MULTI_WINNER_REFORMULATION`).
- **Couplage fragile à `STRATEGY_PROFILE`** : si les profils strong/weak
  sont hard-coded et faux, la fusion amplifie les erreurs au lieu de
  les corriger.

V1 préfère donc montrer les routes spécialisées côte-à-côte (le user
lit lui-même la complémentarité) plutôt qu'un winner unique synthétisé.

## 4. Path V2 — conditions à remplir avant d'implémenter

Avant d'activer cette mission, les pré-requis suivants doivent être
remplis :

1. **Profils empiriques** (`COGNITIVE_SPECIALIZATION_RUNTIME.md` §4) :
   `STRATEGY_PROFILE` validé par observation (pas par intuition), pour
   que `extractStrengths` repose sur des forces réelles.
2. **Schéma d'extraction par domaine** : structure de fusion adaptable
   (BTP : diagnostic / action / vérification ; juridique : qualification
   / procédure / risque ; etc.). Sans ce schéma, la fusion est du
   collage.
3. **Évaluation isolée** : `ZORAN HYBRID` candidaté pendant N sessions,
   mesure de son `argumented_grade_20` médian vs meilleure route
   spécialisée. Si la fusion ne gagne pas significativement (≥ +1.5 pts
   /20), elle est désactivée.
4. **Bornage de redondance** : detecter et fusionner les segments
   répétés entre R1/R2/R3 avant synthèse (sinon le hybrid répète
   `BET` 3 fois).

**Honest limits structurelles :**

- Une fusion bien designée n'est pas une combinaison linéaire — c'est
  un acte cognitif distinct qui peut nécessiter sa propre route
  (`fusion_synthese`) avec son propre set de lois.
- Le brief de la mission V1 mentionne explicitement
  `HYBRID_ROUTE_FUSION` comme **non implémenté** — ce document est
  une spec d'anticipation, pas une description de code existant.
- Tant que la V2 n'est pas livrée, aucune fonction `synthesizeHybrid`,
  `extractStrengths` ou `fuseStrengths` n'existe dans le repo. Toute
  référence dans un autre spec à ces symboles doit être lue comme
  projet, pas comme code actif.
