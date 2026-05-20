// app/src/superiority.js
// Mission : ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516
//
// Pour une question donnée, lance en parallèle :
//   - 1 baseline LLM (Claude sans contexte ZORAN)
//   - N routes ZORAN (chacune avec son set de 10 lois comme contexte)
//   - 1 juge LLM qui score toutes les réponses sur 4 axes
//
// Retourne un tableau comparatif avec deltas ZORAN vs baseline.

import { synthesizeBaseline, judgeResponses, synthesizeOrchestrated } from './llm.js';
import { computeDomainFitness, shouldSkipRoute, getStrategyProfile } from './route_specialization.js';
import { detectDomain } from './domain_detection.js';
import { diagnoseWeaknesses, generateClaudePlusRezo } from './rezo_engine.js';
// Mission V11.6 : rendu HTML extrait dans son propre module
export { renderComparison } from './superiority_render.js';
import { estimateComplexity } from './complexity_estimator.js';
import { identityGate } from './identity_gate.js';
// ZORAN_CORE_OS_FOUNDATION — blocs purs extraits de la god-function runSuperiorityComparison
import { annotateResponses } from './superiority_metrics.js';
import { computeDeltas } from './superiority_deltas.js';

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
  // Bloc pur extrait → superiority_metrics.js (testable hors-ligne, sans API)
  annotateResponses(responses, { question, detectedStructures, zoranSpecs, complexity });
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

  // Compute deltas vs baseline (responses[0])
  // Bloc pur extrait → superiority_deltas.js (testable hors-ligne, sans API)
  const deltas = computeDeltas({ judge, responses });

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

