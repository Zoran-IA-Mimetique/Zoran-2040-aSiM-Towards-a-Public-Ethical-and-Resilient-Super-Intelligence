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
  if (judge && judge.scores) {
    const baselineScore = judge.scores.find(s => s.label === baseline.label) || judge.scores[0];
    for (const r of responses) {
      const s = judge.scores.find(x => x.label === r.label);
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

export function renderComparison(result) {
  if (!result.ok) {
    return `<div class="superiority-error">
      <strong>⚠ Comparaison impossible</strong> — ${result.reason || 'erreur'}
    </div>`;
  }
  const judge = result.judge;
  const deltas = result.deltas || [];
  const verdict = result.verdict;
  const refDiv = result.reformulation_divergence;
  const respDiv = result.response_divergence;

  // ─── 1) BANDEAU verdict + divergence (priorité haute, mission anti-inflation) ───
  const divergenceBadge = (v, label) => {
    if (v == null) return '';
    const cls = v >= 0.30 ? 'good' : (v >= 0.15 ? '' : 'bad');
    return `<span class="${cls}">${label} ${v.toFixed(2)}</span>`;
  };
  const partialNotice = result.partial
    ? `<div class="sup-warn" style="margin-bottom:6px">⚠ Mode partiel — seule réponse Claude brut a abouti (3 ZORAN ont échoué : crédit/limite ?). Aucun jugement comparatif possible.</div>`
    : '';
  const verdictReason = judge?.verdict_reason ? `<div style="font-size:11px;color:var(--fg-2);font-style:italic;margin-top:4px">${escHtml(judge.verdict_reason)}</div>` : '';
  // Mission V6 : badge de profondeur cognitive
  const cplxBadge = result.complexity_estimate ? (() => {
    const c = result.complexity_estimate;
    const colorClass = c.depth_required === 'simple' ? 'good'
                     : c.depth_required === 'fractal' ? 'bad'
                     : '';
    const fastPathTag = result.fast_path === 'simple' ? ' <strong>FAST-PATH</strong>' : '';
    return `<span class="${colorClass}" title="${escHtml(c.reasoning.join(' | '))}">
      profondeur: ${escHtml(c.depth_required)} (cplx ${c.complexity_score})${fastPathTag}
    </span>`;
  })() : '';
  const verdictBanner = `
    <div class="sup-verdict">
      ${partialNotice}
      <div style="margin-bottom:6px">
        <strong>★ Verdict :</strong> ${escHtml(verdict || 'aucun')} ·
        ${result.responses.length} candidat${result.responses.length>1?'s':''} · ${result.latency_ms}ms
        ${cplxBadge ? '· ' + cplxBadge : ''}
      </div>
      ${verdictReason}
      <div class="sup-divergence">
        ${divergenceBadge(refDiv, 'reformulation_divergence')}
        ${divergenceBadge(respDiv, 'response_divergence')}
        ${(refDiv != null && refDiv < 0.30) ? '<span class="sup-warn">⚠ reformulations trop proches</span>' : ''}
      </div>
    </div>`;

  // ─── 1bis) CLASSEMENT ARGUMENTÉ /20 — TRI UNIQUE pour TOUS les blocs ───
  // Tri par grade_20 décroissant (fallback runtime_superiority si grade manquant)
  // Ce sortedByGrade est utilisé partout (deltas, concrete, reforms, responses)
  // pour garantir une UX cohérente du #1 au #4.
  const sortedByGrade = [...deltas].sort((a, b) => {
    const ga = a.argumented_grade_20 ?? (10 + a.runtime_superiority * 10);
    const gb = b.argumented_grade_20 ?? (10 + b.runtime_superiority * 10);
    return gb - ga;
  });
  // Mapping label → rank pour propager l'ordre dans toutes les sections
  const labelToRank = new Map();
  sortedByGrade.forEach((d, i) => labelToRank.set(d.label, i + 1));
  // Tri identique des reformulations / réponses (par label match)
  const sortedResponses = [...result.responses].sort((a, b) =>
    (labelToRank.get(a.label) || 99) - (labelToRank.get(b.label) || 99));
  const gradeClass = g => {
    if (g == null) return '';
    if (g >= 18) return 'grade-excellent';
    if (g >= 15) return 'grade-good';
    if (g >= 12) return 'grade-mid';
    if (g >= 8)  return 'grade-low';
    return 'grade-bad';
  };
  // Helper : phrase synthétique humaine (comment du juge, ou fallback)
  const humanSummary = d => {
    if (d.comment && d.comment.trim()) return d.comment;
    const bits = [];
    if (d.strengths && d.strengths.length) bits.push(d.strengths.slice(0, 2).join(', '));
    if (d.weaknesses && d.weaknesses.length) bits.push('mais ' + d.weaknesses[0]);
    return bits.length ? bits.join(' — ') : '(pas de synthèse disponible)';
  };

  // ─── BLOC #1 WINNER : HEADER XL (priorité maximale, immédiatement lisible) ───
  const winnerCardXL = sortedByGrade.length ? (() => {
    const d = sortedByGrade[0];
    const grade = d.argumented_grade_20;
    const gradeStr = grade != null ? grade.toFixed(1) : '—';
    const gCls = gradeClass(grade);
    const truncBadge = d.truncated
      ? `<div class="sup-trunc-warn">⚠ Réponse tronquée détectée (${d.truncation_penalty.toFixed(2)} pénalité) — ${d.truncation_reasons?.join(', ') || 'fin abrupte'}</div>`
      : '';
    const fitBadge = (d.domain_fitness != null && d.domain_fitness < 0.6)
      ? `<div class="sup-fit-warn">⚠ Domain fitness faible (${d.domain_fitness}) — route possiblement hors spécialisation</div>`
      : '';
    return `<div class="sup-winner-xl ${gCls}">
      <div class="sup-winner-xl-head">
        <span class="sup-winner-xl-pos">#1</span>
        <span class="sup-winner-xl-label">${escHtml(d.label)}</span>
        <span class="sup-winner-xl-grade ${gCls}">${gradeStr}<small>/20</small></span>
      </div>
      <div class="sup-winner-xl-summary">${escHtml(humanSummary(d))}</div>
      ${truncBadge}
      ${fitBadge}
    </div>`;
  })() : '';

  // ─── BLOC #2 #3 #4 : COMPACTS sous le winner ───
  const otherRankings = sortedByGrade.slice(1).map((d, idx) => {
    const i = idx + 2;
    const grade = d.argumented_grade_20;
    const gradeStr = grade != null ? grade.toFixed(1) : '—';
    const gCls = gradeClass(grade);
    return `<div class="sup-ranking-card-compact ${gCls}">
      <span class="sup-ranking-pos">#${i}</span>
      <span class="sup-ranking-label">${escHtml(d.label)}</span>
      <span class="sup-ranking-grade-small ${gCls}">${gradeStr}<small>/20</small></span>
      <span class="sup-ranking-summary">${escHtml(humanSummary(d))}</span>
    </div>`;
  }).join('');

  // ─── DÉTAILS argumentés (forts/faibles/flags) — REPLIÉ par défaut ───
  const argumentedDetails = `
    <details class="sup-section">
      <summary>Détails argumentés — forts / faibles / flags</summary>
      <div class="sup-ranking-list">
        ${sortedByGrade.map((d, i) => {
          const isWin = i === 0;
          const colorClass = d.label.toLowerCase().includes('claude brut') ? 'baseline' : `rank-${(i+1)}`;
          return `<div class="sup-ranking-card ${colorClass} ${isWin ? 'winner' : ''}">
            <div class="sup-ranking-head">
              <span class="sup-ranking-pos">#${i+1}</span>
              <span class="sup-ranking-label">${escHtml(d.label)}</span>
              <span class="sup-ranking-grade ${gradeClass(d.argumented_grade_20)}">${d.argumented_grade_20 != null ? d.argumented_grade_20.toFixed(1) : '—'}<small>/20</small></span>
            </div>
            ${d.strengths && d.strengths.length ? `<div class="sup-arg-list sup-arg-strengths">
              <strong>✓ Forts :</strong> ${d.strengths.map(s => `<span>${escHtml(s)}</span>`).join('')}
            </div>` : ''}
            ${d.weaknesses && d.weaknesses.length ? `<div class="sup-arg-list sup-arg-weaknesses">
              <strong>✗ Faibles :</strong> ${d.weaknesses.map(w => `<span>${escHtml(w)}</span>`).join('')}
            </div>` : ''}
            ${d.noise_detected ? `<div class="sup-arg-flag">▣ Bruit détecté : ${escHtml(d.noise_detected)}</div>` : ''}
            ${d.hallucination_risk ? `<div class="sup-arg-flag sup-arg-hallu">⚠ Hallu risk : ${escHtml(d.hallucination_risk)}</div>` : ''}
            <div class="sup-arg-metrics">
              actionable ${(d.actionability_score ?? 0).toFixed(2)} ·
              pratique ${(d.practical_relevance ?? 0).toFixed(2)} ·
              compression ${(d.compression_quality ?? 0).toFixed(2)} ·
              jargon ${(d.jargon_density ?? 0).toFixed(2)} ·
              concret ${(d.concrete_runtime_alignment ?? 0).toFixed(2)}
            </div>
          </div>`;
        }).join('')}
      </div>
    </details>`;

  // Bandeau "Routes skippées" — mission ROUTE_SPECIALIZATION
  const skippedBanner = (result.skippedRoutes && result.skippedRoutes.length > 0)
    ? `<div class="sup-skipped-banner">
        <strong>⊘ Routes ZORAN skippées hors-domaine (${result.skippedRoutes.length}) :</strong>
        ${result.skippedRoutes.map(s =>
          `<span class="sup-skipped-chip" title="${escHtml(s.profile?.label_domains_forts || '')}">${escHtml(s.label)} (fitness ${s.domain_fitness})</span>`
        ).join(' ')}
        <div class="sup-skipped-note">économie API + bruit benchmark évité</div>
      </div>`
    : '';

  // Bloc final ranking : skipped + XL winner + autres compacts + accordéon
  const rankingBlock = `
    <div class="sup-ranking-section">
      ${skippedBanner}
      ${winnerCardXL}
      ${otherRankings ? `<div class="sup-ranking-others">${otherRankings}</div>` : ''}
      ${argumentedDetails}
    </div>`;

  // ─── 2) TABLE DELTAS triée par grade /20 (UX cohérente avec ranking) ───
  const sortedByRank = sortedByGrade;
  const deltaTable = `
    <div class="sup-deltas-table">
      <div class="sup-deltas-row sup-deltas-header">
        <span class="sup-col-rank">#</span>
        <span class="sup-col-label">Candidat</span>
        <span class="sup-col-num" title="precision">prec</span>
        <span class="sup-col-num" title="hallucination">hallu</span>
        <span class="sup-col-num" title="noise">noise</span>
        <span class="sup-col-num" title="coherence">coh</span>
        <span class="sup-col-num" title="semantic_delta">sem.Δ</span>
        <span class="sup-col-sup" title="runtime_superiority composite">superiority</span>
        <span class="sup-col-wd" title="winner_delta (écart au #1)">winner_Δ</span>
      </div>
      ${sortedByRank.map((d, i) => `
        <div class="sup-deltas-row ${i === 0 ? 'is-rank-1' : ''}">
          <span class="sup-col-rank">${i+1}</span>
          <span class="sup-col-label">${escHtml(d.label)}</span>
          <span class="sup-col-num ${d.precision_delta > 0 ? 'good' : d.precision_delta < 0 ? 'bad' : ''}">${(d.precision ?? 0).toFixed(2)}<small>${signed(d.precision_delta)}</small></span>
          <span class="sup-col-num ${d.hallucination_delta < 0 ? 'good' : d.hallucination_delta > 0 ? 'bad' : ''}">${(d.hallucination ?? 0).toFixed(2)}<small>${signed(d.hallucination_delta)}</small></span>
          <span class="sup-col-num ${d.noise_delta < 0 ? 'good' : d.noise_delta > 0 ? 'bad' : ''}">${(d.noise ?? 0).toFixed(2)}<small>${signed(d.noise_delta)}</small></span>
          <span class="sup-col-num ${d.coherence_delta > 0 ? 'good' : d.coherence_delta < 0 ? 'bad' : ''}">${(d.coherence ?? 0).toFixed(2)}<small>${signed(d.coherence_delta)}</small></span>
          <span class="sup-col-num">${(d.semantic_delta ?? 0).toFixed(2)}</span>
          <span class="sup-col-sup ${d.runtime_superiority > 0 ? 'good' : d.runtime_superiority < 0 ? 'bad' : ''}">${signed(d.runtime_superiority)}</span>
          <span class="sup-col-wd">${(d.winner_delta ?? 0).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>`;

  // ─── 2bis) TABLE QUALITÉ RUNTIME CONCRET (mesures locales objectives) ───
  // jargon, distance domaine user, utilité pratique, méta-bruit composite,
  // alignement runtime concret → tous calculés client-side via jargon.js
  const concreteTable = `
    <details class="sup-section" open>
      <summary>Qualité runtime concret (mesures objectives — anti-jargon ZORAN)</summary>
      <div class="sup-deltas-table" style="margin-top:8px">
        <div class="sup-deltas-row sup-deltas-header" style="grid-template-columns:24px 1fr 60px 60px 64px 60px 70px">
          <span class="sup-col-rank">#</span>
          <span class="sup-col-label">Candidat</span>
          <span class="sup-col-num" title="jargon_density">jargon</span>
          <span class="sup-col-num" title="user_distance — distance vocabulaire question">u.dist</span>
          <span class="sup-col-num" title="practical_usefulness">pratique</span>
          <span class="sup-col-num" title="meta_noise composite">méta-N</span>
          <span class="sup-col-sup" title="concrete_runtime_alignment">concret</span>
        </div>
        ${sortedByRank.map((d, i) => `
          <div class="sup-deltas-row ${i === 0 ? 'is-rank-1' : ''}" style="grid-template-columns:24px 1fr 60px 60px 64px 60px 70px">
            <span class="sup-col-rank">${i+1}</span>
            <span class="sup-col-label">${escHtml(d.label)}</span>
            <span class="sup-col-num ${d.jargon_density <= 0.03 ? 'good' : d.jargon_density >= 0.10 ? 'bad' : ''}">${(d.jargon_density ?? 0).toFixed(3)}</span>
            <span class="sup-col-num ${d.user_distance <= 0.30 ? 'good' : d.user_distance >= 0.60 ? 'bad' : ''}">${(d.user_distance ?? 0).toFixed(3)}</span>
            <span class="sup-col-num ${d.practical_usefulness >= 0.65 ? 'good' : d.practical_usefulness <= 0.30 ? 'bad' : ''}">${(d.practical_usefulness ?? 0).toFixed(3)}</span>
            <span class="sup-col-num ${d.meta_noise <= 0.20 ? 'good' : d.meta_noise >= 0.45 ? 'bad' : ''}">${(d.meta_noise ?? 0).toFixed(3)}</span>
            <span class="sup-col-sup ${d.concrete_runtime_alignment >= 0.70 ? 'good' : d.concrete_runtime_alignment <= 0.40 ? 'bad' : ''}">${(d.concrete_runtime_alignment ?? 0).toFixed(3)}</span>
          </div>
        `).join('')}
      </div>
    </details>`;

  // ─── 2ter) COHÉRENCE SYSTÉMIQUE + ANTI-GOODHART (mission V3) ───
  // Mesure la VIABILITÉ SYSTÉMIQUE d'une réponse, séparément de sa précision.
  // 5 sous-scores systemic_coherence + 4 détecteurs anti-Goodhart.
  const systemicTable = `
    <details class="sup-section" open>
      <summary>Cohérence systémique + anti-Goodhart (mission V3 — viabilité long terme)</summary>
      <div class="sup-deltas-table" style="margin-top:8px">
        <div class="sup-deltas-row sup-deltas-header" style="grid-template-columns:24px 1fr 56px 56px 56px 56px 56px 72px 72px">
          <span class="sup-col-rank">#</span>
          <span class="sup-col-label">Candidat</span>
          <span class="sup-col-num" title="resilience — marges préservées">résil</span>
          <span class="sup-col-num" title="multiscale — local+global+temporel+causal">échel</span>
          <span class="sup-col-num" title="false_benefit_detec — nomme proxies/Goodhart">f.bén</span>
          <span class="sup-col-num" title="causal_robustness — multi-causes">causal</span>
          <span class="sup-col-num" title="long_term_viability">LT</span>
          <span class="sup-col-sup" title="systemic_coherence composite">cohér.sys</span>
          <span class="sup-col-sup" title="goodhart_risk (plus bas = mieux)">Goodhart</span>
        </div>
        ${sortedByRank.map((d, i) => {
          const sc = d.systemic_coherence || {};
          const gh = d.goodhart || {};
          const gRisk = gh.goodhart_risk ?? 0;
          const ghClass = gRisk >= 0.4 ? 'bad' : gRisk <= 0.15 ? 'good' : '';
          const cohClass = (sc.composite ?? 0) >= 0.5 ? 'good' : (sc.composite ?? 0) <= 0.30 ? 'bad' : '';
          return `<div class="sup-deltas-row ${i === 0 ? 'is-rank-1' : ''}" style="grid-template-columns:24px 1fr 56px 56px 56px 56px 56px 72px 72px">
            <span class="sup-col-rank">${i+1}</span>
            <span class="sup-col-label">${escHtml(d.label)}</span>
            <span class="sup-col-num">${(sc.resilience ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(sc.multiscale ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(sc.false_benefit_detec ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(sc.causal_robustness ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(sc.long_term_viability ?? 0).toFixed(2)}</span>
            <span class="sup-col-sup ${cohClass}">${(sc.composite ?? 0).toFixed(2)}</span>
            <span class="sup-col-sup ${ghClass}">${gRisk.toFixed(2)}${gh.fired_count ? ` <small>(${gh.fired_count}/4)</small>` : ''}</span>
          </div>`;
        }).join('')}
      </div>
      ${sortedByRank.some(d => (d.goodhart?.fired_count ?? 0) > 0) ? `
        <div class="sup-goodhart-hints" style="margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-1);font-size:12px">
          <strong>⚠ Alertes Goodhart par candidat :</strong>
          ${sortedByRank.map(d => {
            const hints = d.goodhart?.hints || [];
            if (hints.length === 0) return '';
            return `<div style="margin-top:4px"><strong>${escHtml(d.label)}</strong> :
              ${hints.map(h => `<span style="display:inline-block;padding:2px 6px;margin:2px;background:var(--bg-2);border-radius:4px">${escHtml(h.code)} — ${escHtml(h.hint.slice(0, 90))}</span>`).join(' ')}
            </div>`;
          }).join('')}
        </div>` : ''}
    </details>`;

  // ─── 2quater) FRAGILITÉ STRUCTURELLE + DOMAIN_LEAK (mission V4) ───
  // Détecte réponses "séduisantes mais fragiles" + refus de domaine.
  const fragilityTable = `
    <details class="sup-section" open>
      <summary>Fragilité structurelle + domain leak (mission V4 — réponses séduisantes piégeuses)</summary>
      <div class="sup-deltas-table" style="margin-top:8px">
        <div class="sup-deltas-row sup-deltas-header" style="grid-template-columns:24px 1fr 60px 60px 60px 60px 72px 72px">
          <span class="sup-col-rank">#</span>
          <span class="sup-col-label">Candidat</span>
          <span class="sup-col-num" title="seductive_but_fragile — confiante sans humilité">séduis</span>
          <span class="sup-col-num" title="future_hidden_cost — gain immédiat sans long terme">f.cost</span>
          <span class="sup-col-num" title="perturbation_robustness — robuste si variables changent">pert.r</span>
          <span class="sup-col-num" title="anti_monocause_early_lock — explore alternatives">m.alt</span>
          <span class="sup-col-sup" title="fragility_risk composite — plus bas = mieux">fragilité</span>
          <span class="sup-col-sup" title="domain_leak — refus destructeur d'immersion">dom.leak</span>
        </div>
        ${sortedByRank.map((d, i) => {
          const f = d.fragility || {};
          const det = f.detectors || {};
          const dl = d.domain_leak || {};
          const fRisk = f.fragility_risk ?? 0;
          const fClass = fRisk >= 0.4 ? 'bad' : fRisk <= 0.20 ? 'good' : '';
          const dlClass = dl.leak_detected ? 'bad' : dl.score === 0 ? 'good' : '';
          return `<div class="sup-deltas-row ${i === 0 ? 'is-rank-1' : ''}" style="grid-template-columns:24px 1fr 60px 60px 60px 60px 72px 72px">
            <span class="sup-col-rank">${i+1}</span>
            <span class="sup-col-label">${escHtml(d.label)}</span>
            <span class="sup-col-num">${(det.seductive_but_fragile?.score ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(det.future_hidden_cost?.score ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(det.perturbation_robustness?.score ?? 0).toFixed(2)}</span>
            <span class="sup-col-num">${(det.anti_monocause_early_lock?.score ?? 0).toFixed(2)}</span>
            <span class="sup-col-sup ${fClass}">${fRisk.toFixed(2)}</span>
            <span class="sup-col-sup ${dlClass}">${(dl.score ?? 0).toFixed(2)}${dl.leak_detected ? ' ⚠' : ''}</span>
          </div>`;
        }).join('')}
      </div>
      ${sortedByRank.some(d => (d.fragility?.hints || []).length > 0 || d.domain_leak?.leak_detected) ? `
        <div class="sup-fragility-hints" style="margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-1);font-size:12px">
          <strong>⚠ Alertes fragilité par candidat :</strong>
          ${sortedByRank.map(d => {
            const hints = d.fragility?.hints || [];
            const dl = d.domain_leak;
            const dlAlert = dl?.leak_detected ? [{ code: 'domain_leak', hint: dl.hint }] : [];
            const all = [...hints, ...dlAlert];
            if (all.length === 0) return '';
            return `<div style="margin-top:4px"><strong>${escHtml(d.label)}</strong> :
              ${all.map(h => `<span style="display:inline-block;padding:2px 6px;margin:2px;background:var(--bg-2);border-radius:4px">${escHtml(h.code)} — ${escHtml((h.hint||'').slice(0, 90))}</span>`).join(' ')}
            </div>`;
          }).join('')}
        </div>` : ''}
    </details>`;

  // ─── 3) REFORMULATIONS condensées — triées par grade /20 (UX cohérente) ───
  const reforms = sortedResponses.map((r, idx) => {
    if (!r.reformulation) return '';
    const rank = labelToRank.get(r.label) || (idx + 1);
    const isWin = rank === 1;
    const colorClass = r.strategy === 'baseline' ? 'baseline' : `rank-${rank}`;
    return `<div class="sup-reform-row ${colorClass} ${isWin ? 'winner' : ''}">
      <span class="sup-reform-label">${escHtml(r.label)}</span>
      <span class="sup-reform-text">"${escHtml(r.reformulation)}"</span>
    </div>`;
  }).filter(Boolean).join('');
  const reformsBlock = reforms ? `
    <details class="sup-section" open>
      <summary>Reformulations cognitives (lentille de chaque route)</summary>
      <div class="sup-reform-list">${reforms}</div>
    </details>` : '';

  // ─── 4) RÉPONSES — ouvertes si partial (sinon collapsées priorité basse) ───
  const responsesBlock = `
    <details class="sup-section" ${result.partial ? 'open' : ''}>
      <summary>Réponses complètes (texte ▶ dépliable)</summary>
      <div class="sup-resp-list">
        ${sortedResponses.map((r, idx) => {
          const d = deltas.find(x => x.label === r.label);
          const rank = labelToRank.get(r.label) || (idx + 1);
          const isWin = rank === 1;
          const colorClass = r.strategy === 'baseline' ? 'baseline' : `rank-${rank}`;
          // Mission SILENT_LAW_GUIDANCE : warning visible si jargon ZORAN détecté
          const jargonChips = (r.jargon_terms_found && r.jargon_terms_found.length > 0)
            ? `<div class="sup-jargon-warn">⚠ Jargon ZORAN détecté (${r.jargon_terms_found.length}) :
                ${r.jargon_terms_found.slice(0, 8).map(t => `<code>${escHtml(t)}</code>`).join(' ')}</div>`
            : '<div class="sup-jargon-ok">✓ Aucun jargon ZORAN — réponse propre domaine user</div>';
          return `<div class="sup-resp-card ${colorClass} ${isWin ? 'winner' : ''}">
            <div class="sup-resp-head">
              <strong>${escHtml(r.label)}</strong>
              ${isWin ? '<span class="sup-winner-tag">★ WINNER</span>' : ''}
              <span class="sup-resp-badges">
                jargon ${(r.jargon_density ?? 0).toFixed(2)} ·
                concret ${(r.concrete_runtime_alignment ?? 0).toFixed(2)} ·
                u.dist ${(r.user_distance ?? 0).toFixed(2)}
              </span>
            </div>
            <div class="sup-resp-text">${escHtml(r.text)}</div>
            ${jargonChips}
            ${d?.comment ? `<div class="sup-comment">${escHtml(d.comment)}</div>` : ''}
            ${r.strategy === 'baseline'
              ? '<div class="sup-laws sup-laws-none">Lois ZORAN utilisées : <strong>AUCUNE</strong> · réponse Claude brute, pour comparaison</div>'
              : (r.laws_used && r.laws_used.length
                  ? `<div class="sup-laws">Lois utilisées (${r.laws_used.length}) : ${r.laws_used.slice(0, 6).map(id => `<code>${escHtml(id)}</code>`).join(' ')}</div>`
                  : '')}
          </div>`;
        }).join('')}
      </div>
    </details>`;

  // ─── SINGLE_WINNER RUNTIME FORMAT ─────────────────────────────────
  // Mission DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_20260516
  // Affichage simplifié : SEULEMENT 2 candidats (ZORAN orchestré + Claude brut)
  // au lieu de 6+. Les routes individuelles sont calculées en interne.
  const isSingleWinnerMode = sortedByGrade.length <= 3; // baseline + orchestrated + Claude+ReZo
  if (isSingleWinnerMode) {
    return `<div class="superiority-container">
      ${verdictBanner}
      ${rankingBlock}
      ${argumentedDetails}
      ${concreteTable}
      ${systemicTable}
      ${fragilityTable}
      ${responsesBlock}
    </div>`;
  }
  // Fallback : mode legacy avec multi-cards (utilisé si benchmark CSV/offline)
  return `<div class="superiority-container">
    ${verdictBanner}
    ${rankingBlock}
    ${deltaTable}
    ${concreteTable}
    ${systemicTable}
    ${fragilityTable}
    ${reformsBlock}
    ${responsesBlock}
  </div>`;
}

function signed(n) {
  if (n == null) return '';
  const s = +n;
  if (Math.abs(s) < 0.005) return '';
  return ' ' + (s > 0 ? '+' : '') + s.toFixed(2);
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
