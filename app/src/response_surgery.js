// app/src/response_surgery.js
// Mission ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516
//
// RESPONSE_SURGERY_ENGINE — réécrit chirurgicalement une réponse faible
// en appelant LLM avec instructions ciblées issues du failure_extraction.
//
// V1 : 1 seul appel LLM correctif. V2 (futur) : multi-passes par cause.

import { callLLM } from './llm.js'; // re-export interne
import { extractFailureCauses } from './failure_extraction.js';

/**
 * Répare une réponse faible.
 * Input : la réponse problématique + son diagnostic.
 * Output : nouvelle réponse réparée.
 */
export async function repairResponse({ originalText, question, domain, scores = {}, domain_fitness = null }) {
  const failure = extractFailureCauses({
    text: originalText, question, scores, domain_fitness,
  });
  if (failure.count === 0) {
    return { ok: false, reason: 'no_repair_needed', original: originalText };
  }
  const domLabel = domain?.label || 'généraliste';
  const domVocab = domain?.vocab_hint || 'vocabulaire courant';

  const surgeryInstructions = failure.causes.map((c, i) => `${i+1}. [${c.code}] ${c.surgery}`).join('\n');

  const system = [
    `Tu es un EXPERT du domaine "${domLabel}". Réécris CHIRURGICALEMENT la réponse ci-dessous pour corriger les défauts diagnostiqués.`,
    '',
    'VOCABULAIRE OBLIGATOIRE : ' + domVocab,
    '',
    '═══ CORRECTIONS À APPLIQUER ═══',
    surgeryInstructions,
    '',
    '═══ RÈGLES STRICTES ═══',
    '1. GARDE l\'information utile de l\'original.',
    '2. SUPPRIME tout jargon ZORAN (loi, cadre, S_local, propagation, IDs).',
    '3. APPLIQUE les corrections listées ci-dessus une par une.',
    '4. PRODUIS une réponse 4-6 phrases denses, hiérarchisée, terminée.',
    '5. Vocabulaire du domaine UNIQUEMENT.',
  ].join('\n');

  const user = [
    `QUESTION ORIGINALE : ${question}`,
    '',
    `RÉPONSE À RÉPARER (défauts diagnostiqués : ${failure.causes.map(c => c.code).join(', ')}) :`,
    originalText,
    '',
    'RÉÉCRIS LA RÉPONSE en appliquant les corrections demandées.',
  ].join('\n');

  const r = await callLLM({ system, user, maxTokens: 800 });
  return {
    ok: r.ok,
    repaired: r.text,
    failure_diagnosis: failure,
    original_text: originalText,
    model: r.model,
    usage: r.usage,
    reason: r.ok ? null : (r.reason || 'unknown'),
  };
}
