// app/src/superiority.js
// Mission : ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516
//
// Pour une question donnée, lance en parallèle :
//   - 1 baseline LLM (Claude sans contexte ZORAN)
//   - N routes ZORAN (chacune avec son set de 10 lois comme contexte)
//   - 1 juge LLM qui score toutes les réponses sur 4 axes
//
// Retourne un tableau comparatif avec deltas ZORAN vs baseline.

import { synthesizeBaseline, synthesizeRoute, judgeResponses, reformulateQuestion, synthesizeOrchestrated } from './llm.js';
import { jargonDensity, userDistance, practicalUsefulness, metaNoise, concreteRuntimeAlignment, detectJargonTerms } from './jargon.js';
import { computeDomainFitness, shouldSkipRoute, getStrategyProfile } from './route_specialization.js';
import { detectTruncation, completionIntegrity, truncationPenalty, terrainAlignment, fieldActionability } from './completion.js';
import { detectDomain } from './domain_detection.js';
import { diagnoseWeaknesses, generateClaudePlusRezo, activationMatrix } from './rezo_engine.js';
// Mission V11.6 : rendu HTML extrait dans son propre module
export { renderComparison } from './superiority_render.js';
import { systemicCoherenceReport } from './systemic_coherence.js';
import { runAntiGoodhart } from './anti_goodhart.js';
import { runFragilityDetector } from './fragility_detector.js';
import { detectDomainLeak } from './domain_leak.js';
import { seductiveComplexity } from './seductive_complexity.js';
import { estimateComplexity } from './complexity_estimator.js';
import { detectOverthink } from './overthink_detector.js';
import { identityGate, identityHalluRisk } from './identity_gate.js';
import { generateAllCTAs, detectCTAPresence } from './zoran_cta_engine.js';
import { btpAnalysis, isBTPQuestion } from './btp_supremacy_engine.js';
import { computeParsimony, detectLowIntrinsicDepth } from './parsimony_detector.js';

// Top 3 routes utilisées pour la compétition (sous-ensemble — coût API maîtrisé)
const SUPERIORITY_ROUTES = ['frugale', 'anti_hallucination', 'structurelle'];

export async function runSuperiorityComparison({ question, allNodes, routeResults }) {
  const t0 = performance.now();
  console.log('[ZORAN sup] START — question=', question.slice(0, 60));

  // ═══ MISSION V7 : IDENTITY DISAMBIGUATION GATE (priorité absolue) ═══
  // BLOQUE toute génération si nom propre ambigu sans contexte suffisant.
  // Lois prioritaires : WP12-028, WP12-009, WP11-009, DVE-020, WP12-031, SDE-019.
  const idGate = identityGate(question);
  console.log(`[ZORAN sup] identity gate : passes=${idGate.passes_gate} reason=${idGate.reason}`);
  if (!idGate.passes_gate) {
    console.log('[ZORAN sup] BLOCKED by identity gate — disambiguation requise (anti-hallu biographique)');
    return {
      ok: true,
      partial: true,
      fast_path: 'identity_disambiguation',
      identity_gate: idGate,
      question,
      responses: [{
        label: 'CLARIFICATION REQUISE · identity gate',
        strategy: 'disambiguation',
        text: idGate.response_if_blocked,
        laws_used: idGate.lois_applied,
        reformulation: '(gate identitaire — pas de génération biographique sans contexte)',
        ok: true,
      }],
      judge: null,
      deltas: [],
      verdict: 'CLARIFICATION REQUISE · identity gate',
      blocked_reason: 'ambiguous_identity_low_confidence',
      latency_ms: Math.round(performance.now() - t0),
    };
  }

  // ═══ MISSION V6 : COMPLEXITY GATING (anti sur-orchestration) ═══
  // Avant toute orchestration ZORAN, estime la complexité de la question.
  // Si SIMPLE → fast-path baseline only, pas de ReZo ni de routes ZORAN.
  const complexity = estimateComplexity(question);
  console.log(`[ZORAN sup] complexity gating : depth=${complexity.depth_required} cplx=${complexity.complexity_score} pipeline=${complexity.recommended_pipeline}`);
  console.log(`[ZORAN sup] reasoning : ${complexity.reasoning.join(' | ')}`);

  if (complexity.depth_required === 'simple') {
    // Fast-path : 1 call Claude brut, pas de ZORAN, pas de juge
    console.log('[ZORAN sup] FAST_PATH simple — skip ZORAN/ReZo/juge (anti-overthink)');
    const baselineOnly = await synthesizeBaseline(question);
    const respWords = (baselineOnly.text || '').split(/\s+/).filter(w => w.length > 0).length;
    return {
      ok: true,
      partial: true,
      fast_path: 'simple',
      complexity_estimate: complexity,
      question,
      responses: baselineOnly.ok ? [{
        label: 'CLAUDE brut · fast-path',
        strategy: 'baseline',
        laws_used: [],
        reformulation: '(fast-path simple — pas de ZORAN orchestré)',
        ...baselineOnly,
      }] : [],
      judge: null,
      deltas: [],
      verdict: 'CLAUDE brut · fast-path',
      overthink_skipped: true,
      latency_ms: Math.round(performance.now() - t0),
    };
  }

  // Construit le set [{stratName, route, laws}] pour les 3 stratégies
  // Mission ROUTE_SPECIALIZATION : skip routes hors-domaine fitness < 0.30
  const detectedStructures = routeResults.structures || [];
  const zoranSpecs = [];
  const skippedRoutes = [];
  for (const stratName of SUPERIORITY_ROUTES) {
    const route = routeResults.routes.find(r => r.strategy === stratName);
    if (!route) continue;
    const fitness = computeDomainFitness(stratName, detectedStructures);
    if (shouldSkipRoute(stratName, detectedStructures)) {
      // Route skippée pour économie API + propreté benchmark
      skippedRoutes.push({
        strategy: stratName,
        label: route.label || stratName,
        domain_fitness: +fitness.toFixed(3),
        profile: getStrategyProfile(stratName),
        reason: `domain_fitness=${fitness.toFixed(2)} < 0.30 — hors domaine de spécialisation`,
      });
      console.log(`[ZORAN sup] SKIP ${stratName} : fitness=${fitness.toFixed(2)}`);
      continue;
    }
    const laws = (route.laws_used || []).map(id => allNodes.find(n => n.id === id)).filter(Boolean);
    zoranSpecs.push({ stratName, route, laws, domain_fitness: +fitness.toFixed(3) });
  }
  if (zoranSpecs.length === 0) {
    // Toutes les routes ZORAN hors-domaine → on garde Claude brut seul
    console.warn('[ZORAN sup] toutes routes ZORAN hors-domaine — Claude brut seul');
  }

  // Mission SINGLE_WINNER_RUNTIME (2026-05-16 08:39) :
  // Les routes individuelles deviennent INTERNES — pas d'appels LLM
  // séparés pour Frugale/Anti-hallu/Structurelle. ZORAN Orchestré
  // intègre déjà la fusion silencieuse des angles utiles.
  // Économie API : 8 calls (anciennes routes) → 3 calls (baseline + orchestré + juge)
  const reformTasks = []; // route reformulations désactivées
  // Baseline en parallèle : Claude SANS aucune loi ZORAN (référence brute)
  const baselineTask = (async () => ({
    label: 'CLAUDE brut · 0 loi',
    strategy: 'baseline',
    laws_used: [],
    reformulation: '(aucune — réponse directe, sans cadrage ZORAN)',
    ...(await synthesizeBaseline(question)),
  }))();

  // ZORAN ORCHESTRATED : 1 seul call qui combine angles utiles selon
  // structures détectées + vocabulaire NATIF du domaine (mission
  // GLOBAL_COGNITIVE_ORCHESTRATION + DOMAIN_NATIVE_RESPONSE)
  const detectedDomain = detectDomain(question);
  const lawsByStrategy = {};
  for (const s of zoranSpecs) lawsByStrategy[s.stratName] = s.laws;
  const orchestratedTask = (async () => ({
    label: 'ZORAN Orchestré',
    strategy: 'orchestrated',
    laws_used: [...new Set(Object.values(lawsByStrategy).flat().map(l => l.id))].slice(0, 10),
    reformulation: `(orchestré sur domaine ${detectedDomain.label})`,
    domain: detectedDomain,
    ...(await synthesizeOrchestrated({
      question,
      domain: detectedDomain,
      structures: detectedStructures,
      lawsByStrategy,
      parents: [],
    })),
  }))();
  console.log('[ZORAN sup] phase 1 — reformulations × 3 lancées en parallèle');
  const reformResults = await Promise.allSettled(reformTasks);
  console.log('[ZORAN sup] phase 1 OK — reformulations terminées',
    reformResults.map(s => s.status === 'fulfilled' ? (s.value.ok ? '✓' : '✗') : '✗').join(''));
  const reformByLabel = new Map();
  reformResults.forEach((s, i) => {
    if (s.status === 'fulfilled' && s.value.ok) {
      reformByLabel.set(zoranSpecs[i].stratName, s.value.text);
    }
  });

  // Mission SINGLE_WINNER : pas d'appels par route — seuls baseline +
  // orchestrated sont appelés. Les routes (laws_used) restent calculées
  // pour info interne et passées à synthesizeOrchestrated.
  const respTasks = []; // routes individuelles désactivées
  console.log('[ZORAN sup] phase 2 — réponses × 3 + baseline en parallèle');
  const respResults = await Promise.allSettled(respTasks);
  const baselineResult = await baselineTask;
  const orchestratedResult = await orchestratedTask;
  console.log('[ZORAN sup] phase 2 OK — baseline=', baselineResult.ok ? '✓' : '✗',
    'zoran=', respResults.map(s => s.status === 'fulfilled' ? (s.value.ok ? '✓' : '✗') : '✗').join(''));

  // Aggreg responses (orchestrated en 2e position après baseline pour comparaison directe)
  const responses = [];
  if (baselineResult.ok) responses.push(baselineResult);
  if (orchestratedResult.ok) responses.push(orchestratedResult);
  for (const r of respResults) {
    if (r.status === 'fulfilled' && r.value.ok) responses.push(r.value);
  }

  // PIVOT ARCHITECTURAL : Claude + ReZo (augmentation ciblée des faiblesses)
  // ZORAN devient moteur d'augmentation, pas remplaçant.
  // Diagnostique les faiblesses du Claude brut → injections ciblées.
  console.log('[ZORAN sup] Claude + ReZo : diagnostic + augmentation ciblée');
  let claudeRezoResult = null;
  if (baselineResult.ok && baselineResult.text) {
    const diagnosis = diagnoseWeaknesses({
      text: baselineResult.text,
      question,
    });
    console.log('[ZORAN sup] diagnostic Claude brut :',
      `${diagnosis.weaknesses.length} faiblesses`,
      diagnosis.weaknesses.map(w => w.code).join(', '));
    if (diagnosis.weaknesses.length > 0) {
      const rezoCall = await generateClaudePlusRezo({
        question,
        claudeAnswer: baselineResult.text,
        diagnosis,
      });
      if (rezoCall.ok && rezoCall.finalAnswer) {
        claudeRezoResult = {
          label: 'CLAUDE + ReZo',
          strategy: 'claude_rezo',
          text: rezoCall.finalAnswer,
          laws_used: diagnosis.injections_needed,
          reformulation: `(augmentation ciblée : ${diagnosis.weaknesses.map(w => w.code).join(', ')})`,
          rationale: rezoCall.rationale,
          weaknesses_addressed: rezoCall.weaknesses_addressed,
          ok: true,
          model: rezoCall.model,
          usage: rezoCall.usage,
        };
        responses.push(claudeRezoResult);
      }
    } else {
      console.log('[ZORAN sup] Claude brut déjà optimal — ReZo skip');
    }
  }

  if (responses.length < 1) {
    console.warn('[ZORAN sup] FAIL — no responses at all');
    return { ok: false, reason: 'no_responses', responses };
  }
  // Mission SILENT_LAW_GUIDANCE + RUNTIME_SPECIALIZATION : mesures locales
  for (const r of responses) {
    r.jargon_density = +jargonDensity(r.text).toFixed(3);
    r.user_distance  = +userDistance(r.text, question).toFixed(3);
    r.practical_usefulness = +practicalUsefulness(r.text).toFixed(3);
    r.meta_noise     = +metaNoise({ answerText: r.text, questionText: question }).toFixed(3);
    r.concrete_runtime_alignment = +concreteRuntimeAlignment({ answerText: r.text, questionText: question }).toFixed(3);
    r.jargon_terms_found = detectJargonTerms(r.text);
    // Mission RESPONSE_COMPLETION : détection troncature
    const trunc = detectTruncation(r.text, r.usage);
    r.truncated = trunc.truncated;
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
  console.log('[ZORAN sup] meta-bruit par réponse :',
    responses.map(r => `${r.label}: jargon=${r.jargon_density} concret=${r.concrete_runtime_alignment}`).join(' | '));
  if (responses.length < 2) {
    // Only 1 response succeeded → skip judge, return as partial result
    console.warn('[ZORAN sup] PARTIAL — only 1 response (showing it without judge)');
    return {
      ok: true,
      partial: true,
      question,
      responses,
      judge: null,
      deltas: [],
      verdict: responses[0].label,
      latency_ms: Math.round(performance.now() - t0),
    };
  }

  // 3. JUGE — score chaque réponse + reformulations + divergence
  const reformulationsList = responses.map(r => r.reformulation || null);
  console.log('[ZORAN sup] phase 3 — juge LLM');
  const judgeResult = await judgeResponses({
    question, responses, reformulations: reformulationsList,
  });
  const judge = judgeResult.ok ? judgeResult.judge : null;
  console.log('[ZORAN sup] phase 3', judge ? 'OK — verdict=' + judge.verdict : 'FAIL — judge non parsable');

  // 3. Compute deltas vs baseline (responses[0])
  const baseline = responses[0];
  const deltas = [];
  // Fix V11.x : le juge LLM retourne parfois "CANDIDAT N — label" au lieu de "label"
  // → normaliser les labels avant matching.
  function normalizeLabel(lbl) {
    if (!lbl) return '';
    return String(lbl).replace(/^CANDIDAT\s*\d+\s*[—\-:]\s*/i, '').trim();
  }
  function findScore(scores, target) {
    const tn = normalizeLabel(target);
    return scores.find(s => normalizeLabel(s.label) === tn)
        || scores.find(s => normalizeLabel(s.label).includes(tn))
        || scores.find(s => tn.includes(normalizeLabel(s.label)));
  }
  if (judge && judge.scores) {
    const baselineScore = findScore(judge.scores, baseline.label) || judge.scores[0];
    for (const r of responses) {
      const s = findScore(judge.scores, r.label);
      if (!s) continue;
      // Mission SILENT_LAW_GUIDANCE : enrichit deltas avec scores méta-bruit
      const respObj = responses.find(rr => rr.label === r.label) || {};
      deltas.push({
        label: r.label,
        precision: s.precision,
        hallucination: s.hallucination,
        noise: s.noise,
        coherence: s.coherence,
        semantic_delta: s.semantic_delta ?? 0,
        // Métriques objectives méta-bruit (mesurées localement, pas par juge)
        jargon_density: respObj.jargon_density ?? 0,
        user_distance: respObj.user_distance ?? 0,
        practical_usefulness: respObj.practical_usefulness ?? 0,
        meta_noise: respObj.meta_noise ?? 0,
        concrete_runtime_alignment: respObj.concrete_runtime_alignment ?? 0,
        jargon_terms_found: respObj.jargon_terms_found || [],
        // Deltas vs baseline (positif = ZORAN mieux sauf hallu/noise où négatif = mieux)
        precision_delta: +(s.precision - baselineScore.precision).toFixed(3),
        hallucination_delta: +(s.hallucination - baselineScore.hallucination).toFixed(3),
        noise_delta: +(s.noise - baselineScore.noise).toFixed(3),
        coherence_delta: +(s.coherence - baselineScore.coherence).toFixed(3),
        // Nouveaux scores juge (mission ARGUMENTED_RUNTIME_RANKING)
        actionability_score: s.actionability_score ?? 0,
        practical_relevance: s.practical_relevance ?? 0,
        compression_quality: s.compression_quality ?? 0,
        // Mission RUNTIME_SPECIALIZATION + RESPONSE_COMPLETION
        domain_fitness: respObj.domain_fitness ?? null,
        terrain_alignment: respObj.terrain_alignment ?? 0,
        completion_integrity: respObj.completion_integrity ?? 1,
        truncated: respObj.truncated || false,
        truncation_penalty: respObj.truncation_penalty || 0,
        truncation_reasons: respObj.truncation_reasons || [],
        field_actionability: +fieldActionability({
          text: respObj.text,
          judgeActionability: s.actionability_score ?? 0.5,
        }).toFixed(3),
        argumented_grade_20: s.argumented_grade_20 ?? null,
        strengths: s.strengths || [],
        weaknesses: s.weaknesses || [],
        noise_detected: s.noise_detected || '',
        hallucination_risk: s.hallucination_risk || '',
        // Mission SYSTEMIC_SELECTION V3
        systemic_coherence: respObj.systemic_coherence || null,
        goodhart: respObj.goodhart || null,
        // Mission V4 — fragilité + domain_leak
        fragility: respObj.fragility || null,
        domain_leak: respObj.domain_leak || null,
        // Mission V5 — seductive complexity
        seductive_complexity: respObj.seductive_complexity || null,
        // Mission V6 — overthink détection
        overthink: respObj.overthink || null,
        // Mission V7 — identity hallu risk
        identity_hallu_risk: respObj.identity_hallu_risk || null,
        // Mission V9 — CTA + BTP analysis
        cta_presence: respObj.cta_presence || null,
        btp_analysis: respObj.btp_analysis || null,
        ctas_suggested: respObj.ctas_suggested || null,
        // Mission RANKING_BIAS_CORRECTION : parsimonie propagée
        parsimony: respObj.parsimony || null,
        // Score composite : intègre concret + anti-jargon - pénalité troncature
        runtime_superiority: +(
          0.22 * (s.precision - baselineScore.precision)
          + 0.22 * (baselineScore.hallucination - s.hallucination)
          + 0.13 * (baselineScore.noise - s.noise)
          + 0.13 * (s.coherence - baselineScore.coherence)
          + 0.10 * ((respObj.concrete_runtime_alignment ?? 0.5) - (responses[0].concrete_runtime_alignment ?? 0.5))
          + 0.10 * ((responses[0].meta_noise ?? 0.5) - (respObj.meta_noise ?? 0.5))
          + 0.10 * ((respObj.terrain_alignment ?? 0) - (responses[0].terrain_alignment ?? 0))
          - (respObj.truncation_penalty ?? 0)
        ).toFixed(3),
        comment: s.comment || '',
      });
    }
    // Calcul winner_delta = écart de chaque candidat vs le 1er (au sens runtime_superiority)
    const sortedBySup = [...deltas].sort((a, b) => b.runtime_superiority - a.runtime_superiority);
    if (sortedBySup.length) {
      const top = sortedBySup[0].runtime_superiority;
      for (const d of deltas) d.winner_delta = +(top - d.runtime_superiority).toFixed(3);
    }
  }

  const dt = Math.round(performance.now() - t0);
  return {
    ok: true,
    question,
    complexity_estimate: complexity,    // mission V6
    responses,
    judge,
    deltas,
    verdict: judge?.verdict || null,
    reformulation_divergence: judge?.reformulation_divergence ?? null,
    response_divergence: judge?.response_divergence ?? null,
    skippedRoutes,                      // mission ROUTE_SPECIALIZATION
    detectedStructures,
    latency_ms: dt,
  };
}

