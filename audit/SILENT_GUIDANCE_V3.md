# SILENT_GUIDANCE_V3

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `ANTI_JARGON_PROTOCOL.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `META_NOISE_REDUCTION_ENGINE.md`,
  `CONCRETE_RUNTIME_ALIGNMENT.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeRoute` (V1/V2 hérité),
  `app/src/llm.js::synthesizeOrchestrated` (V3),
  `app/src/domain_detection.js::detectDomain`,
  `app/src/jargon.js::detectJargonTerms`.

## 1. Trois générations du SILENT_LAW_GUIDANCE

`SILENT_LAW_GUIDANCE` formule un contrat asymétrique : les lois ZORAN
**guident le raisonnement** sans **contaminer le vocabulaire** de
sortie. Trois itérations s'empilent dans le repo.

| Génération | Mécanisme principal                                          | Site                                   | Mesure        |
|------------|--------------------------------------------------------------|----------------------------------------|---------------|
| **V1**     | Prompt anti-jargon (liste de termes interdits)               | `synthesizeRoute` règle 2              | déclarative   |
| **V2**     | Score `jargon_density` + `detectJargonTerms` post-affichage  | `app/src/jargon.js`                    | quantitative  |
| **V3**     | Domain native enforcement (vocab_hint forcé) + orchestration | `synthesizeOrchestrated` + `detectDomain` | structurelle |

V1 a posé l'interdiction. V2 a permis de la **mesurer** mais sans
boucle de correction. V3 inverse la logique : au lieu d'interdire le
mauvais vocabulaire, on **impose** le bon — celui du domaine détecté.

## 2. V3 — domain vocab forced + jargon strict prohibition

Trois leviers cumulés activés dans `synthesizeOrchestrated` :

1. **Vocab forcé** : `Vocabulaire attendu : ${domain.vocab_hint}` en
   tête du system prompt. Pour `domain.key === 'btp'` ça injecte
   `BET, descente de charges, IPN/IPE/HEB, DTU, RE2020, bureau de
   contrôle, MOE/MOA, Consuel…` (voir `DOMAIN_LEXICONS` dans
   `domain_detection.js`). Le LLM se retrouve avec une cible
   lexicale concrète au lieu d'une simple négation.
2. **Prohibition stricte** : règle 1 du prompt énumère
   `"loi", "cadre", "S_local", "propagation", "frugalité", "WP11/12",
   "GHUC", "PAL", IDs de lois (etc.)` — superset de V1.
3. **Cadres activés mentalement** : les top 5 lois fusionnées via
   `lawsByStrategy` sont listées en bloc *« cadres cognitifs activés
   MENTALEMENT (à NE JAMAIS citer dans la réponse) »*. Le contraste
   visuel entre cadres internes et vocabulaire externe est explicite.

L'angle `BORNAGE` (déclenché par `bornage` / `compression_synthese`)
ajoute une 4ᵉ pression : la réponse doit annoncer son périmètre,
ce qui pousse mécaniquement vers le domaine plutôt que la méta.

## 3. Couplage avec ANTI_JARGON_PROTOCOL

`ANTI_JARGON_PROTOCOL.md` documentait V1/V2 (liste interdite +
densité). V3 ne remplace pas ce contrat — il l'**enveloppe** :

- pré-réponse : `detectDomain(question)` choisit `vocab_hint` ;
- pendant : prompt orchestré combine interdiction (legacy) +
  imposition (nouveau) ;
- post-réponse : `jargonDensity(text)` + `detectJargonTerms(text)`
  (déjà appelés dans `superiority.js`) restent la métrique de
  validation. Un jargon term détecté → chip `⚠ Jargon ZORAN
  détecté` rendu dans le bandeau résultat.

Si le LLM enfreint les règles, V3 ne re-prompt pas automatiquement ;
c'est le `RESPONSE_SURGERY_ENGINE` (mission jumelle) qui prend le
relais via `extractFailureCauses` → cause `zoran_jargon_leak` →
`repairResponse`.

## 4. Limites honnêtes

- **Aucun enforcement runtime garanti** : V3 reste un protocole
  déclaratif côté LLM. Aucune réponse n'est *bloquée* avant
  affichage même si `detectJargonTerms` remonte 6 termes.
- **`vocab_hint` est statique** : la chaîne hard-codée par domaine
  ne s'enrichit pas avec l'usage. Le BTP gagne quelques dizaines de
  termes, mais l'ai_robustness en obtient moins de 15.
- **Pas testé live** : la branche `synthesizeOrchestrated` n'a pas
  été rejouée sur les 50 prompts du `ZORAN_AUTONOMY_STRESS_REPORT`.
  Le gain V3 vs V2 est **supposé**, pas mesuré.
- **Détection FR-only** : `detectDomain` cascade des regex
  françaises. Une question EN passe en `general` et perd V3.
- **Conflit potentiel surgery / orchestration** : si `repairResponse`
  élargit la réponse pour ajouter des actions, il peut réintroduire
  un terme méta. V3 ne prévoit pas de seconde passe anti-jargon
  post-surgery.
