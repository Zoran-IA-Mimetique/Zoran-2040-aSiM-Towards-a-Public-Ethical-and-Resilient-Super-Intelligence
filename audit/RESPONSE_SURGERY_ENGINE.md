# RESPONSE_SURGERY_ENGINE

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `FAILURE_EXTRACTION_ENGINE.md`,
  `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `SILENT_GUIDANCE_V3.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/response_surgery.js::repairResponse`,
  `app/src/failure_extraction.js::extractFailureCauses`,
  `app/src/llm.js::callLLM`.

## 1. Pipeline V1 — single-pass chirurgical

`repairResponse({ originalText, question, domain, scores,
domain_fitness })` enchaîne :

1. `extractFailureCauses(...)` diagnostique la réponse à réparer.
   Si `failure.count === 0` → retour
   `{ ok: false, reason: 'no_repair_needed' }` sans appel LLM.
2. Construction d'un system prompt **chirurgical** rappelant
   `domain.label` + `vocab_hint` exigé, listant les `surgery` de
   chaque cause numérotées, et réaffirmant 5 règles strictes
   (garder l'info utile, supprimer jargon ZORAN, appliquer les
   corrections une à une, 4-6 phrases terminées, vocabulaire 100 %
   domaine).
3. Un seul `callLLM({ system, user, maxTokens: 800 })`. Le `user`
   inclut la question, les codes diagnostiqués, et la réponse à
   réparer.

Retour : `{ ok, repaired, failure_diagnosis, original_text, model,
usage, reason }`. `failure_diagnosis` est conservé pour auditer
quelle cause a déclenché quelle correction.

## 2. System prompt chirurgical (extrait)

```
Tu es un EXPERT du domaine "<domain.label>". Réécris CHIRURGICALEMENT
la réponse pour corriger les défauts diagnostiqués.

VOCABULAIRE OBLIGATOIRE : <domain.vocab_hint>

═══ CORRECTIONS À APPLIQUER ═══
1. [too_abstract] Réécrire avec termes métier du domaine.
2. [missing_action] Ajouter 3-5 actions immédiates priorisées.
3. [bad_hierarchy] Structurer "1. Urgent : … 2. Court terme : …"

═══ RÈGLES STRICTES ═══
1. GARDE l'info utile. 2. SUPPRIME jargon ZORAN. 3. APPLIQUE les
corrections une par une. 4. PRODUIS 4-6 phrases denses terminées.
5. Vocabulaire du domaine UNIQUEMENT.
```

Invariant : chaque code activé devient une ligne d'instruction
numérotée — traçabilité diagnostic → correction 1:1.

## 3. Inputs / outputs

| Champ                | Source                                       | Rôle                                |
|----------------------|----------------------------------------------|-------------------------------------|
| `originalText`       | réponse perdante (`responses[i].text`)        | corpus à réécrire                   |
| `question`           | prompt utilisateur                            | ancrage sémantique                  |
| `domain`             | `detectDomain(question)`                      | impose vocabulaire cible            |
| `scores`             | métriques juge + locales déjà calculées       | évite recalcul                       |
| `domain_fitness`     | `computeDomainFitness(strategy, structures)`  | déclenche `out_of_domain`           |
| → `repaired`         | texte LLM corrigé                             | sortie principale                   |
| → `failure_diagnosis`| objet `extractFailureCauses(...)` complet     | audit trail                         |
| → `usage`            | tokens Anthropic                              | coût opération                      |

`maxTokens: 800` — calibré pour 4-6 phrases denses avec marge
anti-troncature.

## 4. V2 path — multi-pass per cause + refinement itératif

V1 traite toutes les causes en un seul appel. Failure modes
plausibles : ordre non spécifié → certaines causes ignorées ; un fix
peut en introduire un autre (résoudre `bad_compression` élargit la
sortie et risque `excessive_noise`) ; `severity ≥ 0.8` (4+ causes)
converge mal en une passe.

V2 vise :

1. **Tri par priorité structurelle** : `empty_or_truncated` →
   `out_of_domain` → `zoran_jargon_leak` → `too_abstract` →
   `missing_action` → `bad_hierarchy` → `bad_compression` →
   `excessive_noise` → `high_hallucination_risk`.
2. **Boucle 1 cause / 1 passe** : `callLLM` appelé par cause sur le
   texte issu de la passe précédente.
3. **Re-diagnostic post-passe** via `extractFailureCauses`. Arrêt
   si `count === 0` ; cap de sûreté 4 passes.
4. **Refinement itératif** : nouvelle cause apparue → ajoutée à la
   queue avec `regression_attempts` (anti-boucle infinie).

V2 n'est **pas** implémenté. Roadmap.

## 5. Limites honnêtes

- **Single-pass V1** : pas de garantie que toutes les corrections
  soient effectivement appliquées.
- **Pas câblée live** : `repairResponse` disponible mais aucun appel
  dans `superiority.js`. Le pipeline benchmark ne passe pas par la
  surgery.
- **Coût additionnel** : ~$0.003 Sonnet, ~$0.0004 Haiku par
  surgery. Sur 50 prompts × 4 non-winners ≈ +$0.6 Sonnet par run.
- **Risque de régression** : la surgery peut casser une réponse
  passable. Aucun A/B post-surgery.
- **`failure_diagnosis` invisible UI** : calculé mais non rendu dans
  `renderComparison`.
- **V2 multi-pass non implémenté** : roadmap décrite, code absent.
