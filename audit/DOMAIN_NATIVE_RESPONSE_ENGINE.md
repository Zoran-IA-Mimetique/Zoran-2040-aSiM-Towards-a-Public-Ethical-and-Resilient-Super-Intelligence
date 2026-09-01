# DOMAIN_NATIVE_RESPONSE_ENGINE

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `SILENT_GUIDANCE_V3.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `ANTI_JARGON_PROTOCOL.md`,
  `DOMAIN_FITNESS_MODEL.md`,
  `DOMAIN_DOMINANCE_MATRIX.md`
- Sources    : `app/src/domain_detection.js` (`DOMAIN_LEXICONS`,
  `detectDomain`, `detectAllDomains`),
  `app/src/llm.js::synthesizeOrchestrated`
  (consommation de `domain.label` + `domain.vocab_hint`),
  `app/src/superiority.js` (appel `detectDomain(question)` avant
  `orchestratedTask`).

## 1. Les 8 domaines et leur `vocab_hint`

`DOMAIN_LEXICONS` (hard-codé, FR) — chaque entrée porte `keywords`
(regex de détection), `label` (UI) et `vocab_hint` (chaîne injectée
dans le system prompt orchestré pour cibler la couche lexicale).

| Clé              | Label                          | Extrait du `vocab_hint`                                                 |
|------------------|--------------------------------|--------------------------------------------------------------------------|
| `btp`            | BTP / construction             | BET, descente de charges, IPN/IPE/HEB, DTU, RE2020, MOE/MOA, Consuel    |
| `medicine`       | médecine                       | anamnèse, drapeau rouge, HAS, RCT, IC 95 %, grade A/B/C                  |
| `legal`          | juridique                      | jurisprudence, cassation, opposabilité, prescription, RGPD, CNIL        |
| `physics`        | physique théorique             | lagrangien, métrique, symétrie, observable, décohérence, renormalisation |
| `ai_robustness`  | IA / robustesse                | MMLU, OOD, RLHF, RAG, prompt injection, attention head                   |
| `epistemology`   | épistémologie                  | réfutabilité, sous-détermination, paradigme, induction/abduction        |
| `business`       | business / stratégie           | CAC/LTV, MRR/ARR, churn, runway, EBITDA, MVP, PMF                       |
| `general`        | généraliste (fallback)         | vocabulaire courant, exemples concrets                                  |

Les regex sont ordre-sensibles : la première entrée non-`general`
qui matche gagne (boucle `for…of Object.entries(DOMAIN_LEXICONS)`).

## 2. `detectDomain` vs `detectAllDomains`

- `detectDomain(question)` → premier match non-`general` (ou
  `general`). API consommée par `superiority.js` avant
  `orchestratedTask` ; un seul `vocab_hint` injecté dans le prompt
  pour éviter la dispersion lexicale.
- `detectAllDomains(question)` → toutes les entrées matchantes,
  ordre `DOMAIN_LEXICONS`. Cible : questions hybrides
  (*« responsabilité civile d'un BET sur défaut sismique »* matche
  `legal` puis `btp`). Alimente la future `DOMAIN_DOMINANCE_MATRIX`
  V2 pour pondérer les cellules multi-domaines.

## 3. Comment ça force le LLM à parler natif

Trois lignes du system prompt `synthesizeOrchestrated` :

```
Tu es un EXPERT du domaine "${domain.label}".
Vocabulaire attendu : ${domain.vocab_hint}.
…
1. Vocabulaire 100 % du domaine — PAS de "loi", "cadre", "S_local"…
```

L'exemple BTP intégré au prompt sert d'ancrage contrastif (mauvais
vs bon). Effet recherché : basculer la distribution de tokens du
LLM vers le sous-espace lexical métier dès la première phrase, et
empêcher la dérive vers la méta-langue ZORAN.

Couplage downstream : `extractFailureCauses` détecte
`zoran_jargon_leak` via `detectJargonTerms` ; en cas d'échec,
`repairResponse` ré-injecte le même `vocab_hint` dans son prompt
chirurgical (V1 single-pass).

## 4. Limites honnêtes

- **Regex FR-only** : aucun fallback EN/ES. Une question EN bascule
  en `general` et perd le vocabulaire spécialisé.
- **Pas de fallback ML** : pas d'embedding similarity, pas de
  classifier appris. Une formulation BTP métaphorique sans keyword
  bascule en `general`.
- **8 domaines hard-codés** : tout nouveau domaine (sport,
  agriculture, finance retail) exige une PR avec extension du
  dictionnaire.
- **Ordre de match arbitraire** : *« RGPD pour LLM médical »* matche
  `medicine` avant `ai_robustness` ou `legal`.
- **Couverture benchmark partielle** : les 50 prompts du
  `ZORAN_AUTONOMY_STRESS_REPORT` ne couvrent que ~7 domaines, le
  business est quasi-absent. La matrice de dominance reste
  incomplète tant que le dataset n'est pas rééquilibré.
