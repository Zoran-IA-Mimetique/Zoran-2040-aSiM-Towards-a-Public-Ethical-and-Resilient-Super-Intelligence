# META_NOISE_REDUCTION_ENGINE

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `STRUCTURAL_QUERY_MAPPING_ENGINE.md`,
  `ANTI_JARGON_PROTOCOL.md`, `CONCRETE_RUNTIME_ALIGNMENT.md`,
  `META_OVERLOAD_ANALYSIS.md`, `RUNTIME_SUPERIORITY_ENGINE.md`,
  `MULTI_WINNER_REFORMULATION_ENGINE.md`, `NOISE_MINIMIZATION_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeRoute` (system prompt réécrit),
  `synthesizeBaseline`, `reformulateQuestion`,
  `app/src/chat.js::compete` (couplage `structMap` + routes).

## 1. Why this mission exists

Diagnostic 2026-05-16. Sur la question BTP « supprimer murs porteurs »,
même quand le pipeline LLM tournait, les routes ZORAN injectaient du
**méta-bruit** : la réponse parlait de « compresser le problème »,
« borner la cascade S_local », « auditabilité de la décision ». Le baseline
Claude brut, lui, parlait *béton armé, BAEL, étude structure, bureau de
contrôle, permis de démolir*. Le user a logiquement préféré le baseline.

Conclusion : injecter le contexte ZORAN **comme cadre cognitif** est utile,
mais l'**exporter en surface textuelle** est du bruit pur pour l'utilisateur.

## 2. Réécriture du system prompt `synthesizeRoute`

Fichier `app/src/llm.js`, fonction `synthesizeRoute({ question, laws,
strategyLabel })`. Les règles strictes ajoutées :

```
1. Réponds DIRECTEMENT dans le LANGAGE CONCRET du domaine.
   BTP → vocabulaire BTP. Juridique → juridique. Médical → médical.
2. INTERDIT d'utiliser le jargon ZORAN :
   "loi", "cadre", "S_local", "propagation", "WP11/12",
   "GHUC", "PAL", "frugalité", "borne", "auditabilité", etc.
   Les lois sont en arrière-plan cognitif, JAMAIS en surface textuelle.
3. 3-5 phrases denses, français, sans markdown.
4. Si hors-domaine pour tes cadres : dis-le franchement
   ET donne quand même la meilleure réponse concrète possible.
5. L'angle "<strategyLabel>" transparaît dans le RAISONNEMENT,
   pas dans le vocabulaire.
```

Les lois `top-10` sont toujours injectées dans le system prompt comme
contexte de pensée, mais préfixées par : *« Tu as activé MENTALEMENT ces
cadres de pensée (mais ne JAMAIS les citer dans la réponse) »*.

## 3. Exemples attendus (langage cible par domaine)

| Domaine question      | Vocabulaire CIBLE en sortie                                  | Jargon ZORAN INTERDIT                  |
|-----------------------|--------------------------------------------------------------|----------------------------------------|
| BTP / structure       | mur porteur, IPN, BAEL, bureau d'étude, permis de démolir    | propagation, S_local, GHUC, borne      |
| Juridique             | jurisprudence, article, juridiction, qualification           | cadre intermédiaire, WP12, audit       |
| Médical               | diagnostic différentiel, contre-indication, suivi clinique   | hypothèse cachée, DVE, frugalité       |
| Projet / décision     | jalon, livrable, RACI, arbitrage                             | route gagnante, oracle, S_local        |

## 4. Channels de l'influence stratégique

L'angle de la stratégie influence le **raisonnement interne**, pas le
**vocabulaire externe** :

- `frugale`             → bref + essentiel (réponse plus courte)
- `anti_hallucination`  → prudent + sourcé (formulations conditionnelles)
- `structurelle`        → articule plusieurs niveaux (global → local)
- `temporelle`          → distingue court terme / long terme

## 5. Limites honnêtes

- L'anti-jargon est **uniquement prompt-based**. Aucun post-filtre
  n'inspecte la réponse pour rejeter une réponse polluée.
- Pas de mesure quantitative de `zoran_jargon_density` implémentée — cf.
  `META_OVERLOAD_ANALYSIS.md` pour la formule proposée v2.
- Claude peut malgré tout désobéir au prompt (notamment sur des questions
  méta sur ZORAN lui-même, où le jargon devient légitime).
- Les 4 channels stratégiques (frugale / anti-hallu / structurelle /
  temporelle) sont décrits textuellement, jamais mesurés sur la sortie.
- Le judge LLM (`judgeResponses`) ne contient pas encore d'axe explicite
  *« absence de jargon »* — il est confondu avec `noise`.
