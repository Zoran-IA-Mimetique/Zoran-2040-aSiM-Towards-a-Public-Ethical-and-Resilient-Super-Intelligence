# FAILURE_EXTRACTION_ENGINE

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RESPONSE_SURGERY_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `SILENT_GUIDANCE_V3.md`,
  `ANTI_JARGON_PROTOCOL.md`,
  `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `ZORAN_AUTONOMY_STRESS_REPORT.md`
- Sources    : `app/src/failure_extraction.js`
  (`extractFailureCauses`, `aggregateFailurePatterns`),
  `app/src/jargon.js` (`jargonDensity`, `detectJargonTerms`,
  `practicalUsefulness`),
  `app/src/completion.js::terrainAlignment`.

## 1. Pourquoi extraire les causes, pas juste compter les pertes

Le `ZORAN_AUTONOMY_STRESS_REPORT` montre *qu'une* route perd 64-90 %
de ses prompts, mais pas *pourquoi*. Sans diagnostic, on ne peut ni
router (skip) ni réparer (`repairResponse`).
`extractFailureCauses({ text, question, scores, domain_fitness })`
retourne pour chaque non-winner un tableau `causes[]` codé, une
`severity`, et un `suggested_surgery` consommé directement par le
`RESPONSE_SURGERY_ENGINE`.

## 2. Les 9 patterns (code → détecteur → surgery)

| # | `code`                     | Détecteur                                                 | Surgery                                                  |
|---|----------------------------|-----------------------------------------------------------|----------------------------------------------------------|
| 1 | `too_abstract`             | `jd > 0.08` ∧ `terrain_alignment < 0.20`                  | Réécrire avec termes métier, supprimer jargon ZORAN.     |
| 2 | `out_of_domain`            | `domain_fitness < 0.30`                                   | Skipper ou rerouter vers route plus adaptée.             |
| 3 | `excessive_noise`          | `noise > 0.50` (juge OU `jd > 0.10` OU `wc > 200`)        | Compresser à 4-6 phrases denses.                         |
| 4 | `zoran_jargon_leak`        | `detectJargonTerms(text).length > 0`                       | Réécrire 100 % en vocabulaire domaine.                   |
| 5 | `missing_action`           | `pu < 0.30` ∧ `text.length > 100`                          | Ajouter 3-5 actions immédiates priorisées.               |
| 6 | `bad_hierarchy`            | `text.length > 150` ∧ ¬`/d'abord|étape|urgent|.../i`       | Structurer `1. Urgent : … 2. Court terme : …`            |
| 7 | `bad_compression`          | `wc > 250` ∧ `pu < 0.50`                                   | Compresser à 100-150 mots utiles.                        |
| 8 | `high_hallucination_risk`  | `scores.hallucination > 0.50`                              | Remplacer fait incertain par renvoi expert.              |
| 9 | `empty_or_truncated`       | `!text || text.length < 50`                                | Relancer avec `maxTokens` augmenté + anti-troncature.    |

Les 9 codes sont **hand-picked** depuis les défauts observés en
benchmark offline. Pas de découverte automatique.

## 3. Formule et `severity`

```
severity = min(1.0, causes.length × 0.20)
```

`severity = 0.6` ⇒ 3 causes ⇒ patient symptomatique mais
réparable. `≥ 1.0` ⇒ 5+ causes ⇒ surgery V1 ne convergera
probablement pas, re-générer from scratch préférable.
Le retour inclut `suggested_surgery` = concaténation des
instructions, prête à coller dans un prompt LLM.

## 4. `aggregateFailurePatterns` — diagnostic structurel par route

Pour un set complet de résultats benchmark,
`aggregateFailurePatterns(results)` parcourt **uniquement** les
non-winners et compte les `causes[].code` par route :

```
{ "structurelle": { zoran_jargon_leak: 24, too_abstract: 16 },
  "anti_hallucination": { excessive_noise: 18, bad_compression: 9 } }
```

Si `structurelle` accumule 24× `zoran_jargon_leak`, ce n'est pas un
accident — c'est un défaut structurel du prompt route. La
correction sort du registre surgery (per-response) pour devenir une
révision de `ANGLE_BY_STRATEGY['structurelle']` dans `llm.js`.

## 5. Limites honnêtes

- **Seuils hard-codés** (0.08, 0.20, 0.30, 0.50, 100, 150, 250) :
  calibrés à l'œil sur 50 prompts, pas de validation croisée.
- **9 patterns ≠ exhaustif** : faute de logique, contradiction
  interne, anglicismes, mauvaise unité non capturés. Couverture
  estimée ~70 % des modes de défaite.
- **Sévérité linéaire** : 5 causes mineures pèsent autant qu'un
  `empty_or_truncated` seul. Pas de pondération.
- **Chevauchements non gérés** : `too_abstract` + `zoran_jargon_leak`
  comptent deux causes pour un même défaut.
- **FR-only** via `detectJargonTerms` ; jargon EN passe sans alerte.
- **Live requis** : `aggregateFailurePatterns` reste partiel tant
  que le 50-prompts n'est pas rejoué avec `synthesizeOrchestrated`.
