// app/src/superiority_metrics.js
// Extrait de superiority.js (ZORAN_CORE_OS_FOUNDATION — découplage god-function).
//
// Bloc PUR : annotation des réponses avec les ~20 mesures locales (jargon,
// troncature, cohérence systémique, anti-Goodhart, fragilité, overthink, CTA,
// BTP, parsimonie...). Aucun appel LLM — entièrement testable hors-ligne.
//
// Comportement IDENTIQUE au bloc inline d'origine (déplacement mécanique,
// zéro modification de logique). Voir tools/superiority_units_check.mjs.

import { jargonDensity, userDistance, practicalUsefulness, metaNoise, concreteRuntimeAlignment, detectJargonTerms } from './jargon.js';
import { detectTruncation, completionIntegrity, truncationPenalty, terrainAlignment } from './completion.js';
import { systemicCoherenceReport } from './systemic_coherence.js';
import { runAntiGoodhart } from './anti_goodhart.js';
import { runFragilityDetector } from './fragility_detector.js';
import { detectDomainLeak } from './domain_leak.js';
import { seductiveComplexity } from './seductive_complexity.js';
import { detectOverthink } from './overthink_detector.js';
import { identityHalluRisk } from './identity_gate.js';
import { generateAllCTAs, detectCTAPresence } from './zoran_cta_engine.js';
import { btpAnalysis } from './btp_supremacy_engine.js';
import { computeParsimony } from './parsimony_detector.js';

// Annote en place chaque réponse de `responses` avec les mesures locales.
// ctx = { question, detectedStructures, zoranSpecs, complexity }
// Modifie les objets `responses` in-place (comme le code d'origine) et les
// retourne pour permettre le chaînage / les assertions de test.
export function annotateResponses(responses, ctx) {
  const { question, detectedStructures, zoranSpecs, complexity } = ctx;
  for (const r of responses) {
    r.jargon_density = +jargonDensity(r.text).toFixed(3);
    r.user_distance  = +userDistance(r.text, question).toFixed(3);
    r.practical_usefulness = +practicalUsefulness(r.text).toFixed(3);
    r.meta_noise     = +metaNoise({ answerText: r.text, questionText: question }).toFixed(3);
    r.concrete_runtime_alignment = +concreteRuntimeAlignment({ answerText: r.text, questionText: question }).toFixed(3);
    r.jargon_terms_found = detectJargonTerms(r.text);
    // Signal API stop_reason='max_tokens' prime sur l'heuristique (préserve r.truncated déjà set par callLLM)
    const trunc = detectTruncation(r.text, r.usage, r.stop_reason);
    r.truncated = r.truncated || trunc.truncated;
    r.truncation_reasons = trunc.reasons;
    r.completion_integrity = completionIntegrity(r.text, r.usage);
    r.truncation_penalty = truncationPenalty(r.text, r.usage);
    // Mission métriques recalibrées : terrain alignment
    r.terrain_alignment = +terrainAlignment(r.text).toFixed(3);
    // Mission SYSTEMIC_SELECTION V3 : cohérence systémique + anti-Goodhart
    r.systemic_coherence = systemicCoherenceReport(r.text);
    r.goodhart = runAntiGoodhart(r.text);
    // Mission V4 : fragilité structurelle + domain_leak
    r.fragility = runFragilityDetector(r.text);
    r.domain_leak = detectDomainLeak(r.text, { question });
    // Mission V5 : seductive_complexity (densité technique artificielle)
    r.seductive_complexity = seductiveComplexity(r.text);
    // Mission V6 : overthink détection post-hoc
    r.overthink = detectOverthink({
      question,
      responseText: r.text,
      n_structures_detected: detectedStructures.length,
      n_routes_activated: zoranSpecs.length,
      n_laws_activated: (r.laws_used || []).length,
      complexity_score: complexity.complexity_score,
      depth_required: complexity.depth_required,
    });
    // Mission V7 : identity_hallu_risk post-hoc
    r.identity_hallu_risk = identityHalluRisk(question, r.text);
    // Mission V9 : CTA présence + BTP supremacy analysis
    r.cta_presence = detectCTAPresence(r.text);
    r.btp_analysis = btpAnalysis(question, r.text);
    r.ctas_suggested = generateAllCTAs({ question, responseText: r.text });
    // Mission RANKING_BIAS_CORRECTION : parsimonie pour anti sur-richesse
    r.parsimony = computeParsimony(r.text, question);
    // domain_fitness déjà calculé pour les ZORAN (skippées exclues)
    if (r.strategy !== 'baseline') {
      const spec = zoranSpecs.find(s => s.stratName === r.strategy);
      r.domain_fitness = spec ? spec.domain_fitness : null;
    } else {
      r.domain_fitness = 1.0; // baseline universel
    }
  }
  return responses;
}
