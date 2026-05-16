// app/src/superiority.js
// Mission : ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516
//
// Pour une question donnée, lance en parallèle :
//   - 1 baseline LLM (Claude sans contexte ZORAN)
//   - N routes ZORAN (chacune avec son set de 10 lois comme contexte)
//   - 1 juge LLM qui score toutes les réponses sur 4 axes
//
// Retourne un tableau comparatif avec deltas ZORAN vs baseline.

import { synthesizeBaseline, synthesizeRoute, judgeResponses, reformulateQuestion } from './llm.js';
import { jargonDensity, userDistance, practicalUsefulness, metaNoise, concreteRuntimeAlignment, detectJargonTerms } from './jargon.js';

// Top 3 routes utilisées pour la compétition (sous-ensemble — coût API maîtrisé)
const SUPERIORITY_ROUTES = ['frugale', 'anti_hallucination', 'structurelle'];

export async function runSuperiorityComparison({ question, allNodes, routeResults }) {
  const t0 = performance.now();
  console.log('[ZORAN sup] START — question=', question.slice(0, 60));

  // Construit le set [{stratName, route, laws}] pour les 3 stratégies
  const zoranSpecs = [];
  for (const stratName of SUPERIORITY_ROUTES) {
    const route = routeResults.routes.find(r => r.strategy === stratName);
    if (!route) continue;
    const laws = (route.laws_used || []).map(id => allNodes.find(n => n.id === id)).filter(Boolean);
    zoranSpecs.push({ stratName, route, laws });
  }

  // 1. REFORMULATION en parallèle : chaque stratégie reformule la question
  //    selon sa lentille cognitive. Cap latence + révèle la divergence.
  const reformTasks = zoranSpecs.map(s => (async () => ({
    label: `ZORAN ${s.route.label || s.stratName}`,
    strategy: s.stratName,
    ...(await reformulateQuestion({
      question, strategyLabel: s.route.label || s.stratName, laws: s.laws,
    })),
  }))());
  // Baseline en parallèle : Claude SANS aucune loi ZORAN (référence brute)
  const baselineTask = (async () => ({
    label: 'CLAUDE brut · 0 loi',
    strategy: 'baseline',
    laws_used: [],
    reformulation: '(aucune — réponse directe, sans cadrage ZORAN)',
    ...(await synthesizeBaseline(question)),
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

  // 2. RÉPONSES en parallèle : chaque stratégie répond DEPUIS SA REFORMULATION
  //    (la question vue par cette stratégie), enrichie de ses 10 lois.
  const respTasks = zoranSpecs.map(s => (async () => {
    const reform = reformByLabel.get(s.stratName) || question;
    return {
      label: `ZORAN ${s.route.label || s.stratName}`,
      strategy: s.stratName,
      laws_used: s.route.laws_used,
      reformulation: reform,
      ...(await synthesizeRoute({
        question: reform, laws: s.laws, strategyLabel: s.route.label || s.stratName,
      })),
    };
  })());
  console.log('[ZORAN sup] phase 2 — réponses × 3 + baseline en parallèle');
  const respResults = await Promise.allSettled(respTasks);
  const baselineResult = await baselineTask;
  console.log('[ZORAN sup] phase 2 OK — baseline=', baselineResult.ok ? '✓' : '✗',
    'zoran=', respResults.map(s => s.status === 'fulfilled' ? (s.value.ok ? '✓' : '✗') : '✗').join(''));

  // Aggreg responses
  const responses = [];
  if (baselineResult.ok) responses.push(baselineResult);
  for (const r of respResults) {
    if (r.status === 'fulfilled' && r.value.ok) responses.push(r.value);
  }

  if (responses.length < 1) {
    console.warn('[ZORAN sup] FAIL — no responses at all');
    return { ok: false, reason: 'no_responses', responses };
  }
  // Mission SILENT_LAW_GUIDANCE : mesure objective du méta-bruit par réponse
  // (jargon ZORAN détecté, distance domaine user, utilité concrète)
  for (const r of responses) {
    r.jargon_density = +jargonDensity(r.text).toFixed(3);
    r.user_distance  = +userDistance(r.text, question).toFixed(3);
    r.practical_usefulness = +practicalUsefulness(r.text).toFixed(3);
    r.meta_noise     = +metaNoise({ answerText: r.text, questionText: question }).toFixed(3);
    r.concrete_runtime_alignment = +concreteRuntimeAlignment({ answerText: r.text, questionText: question }).toFixed(3);
    r.jargon_terms_found = detectJargonTerms(r.text);
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
        argumented_grade_20: s.argumented_grade_20 ?? null,
        strengths: s.strengths || [],
        weaknesses: s.weaknesses || [],
        noise_detected: s.noise_detected || '',
        hallucination_risk: s.hallucination_risk || '',
        // Score composite revisité : intègre concret + anti-jargon
        runtime_superiority: +(
          0.25 * (s.precision - baselineScore.precision)
          + 0.25 * (baselineScore.hallucination - s.hallucination)
          + 0.15 * (baselineScore.noise - s.noise)
          + 0.15 * (s.coherence - baselineScore.coherence)
          + 0.10 * ((respObj.concrete_runtime_alignment ?? 0.5) - (responses[0].concrete_runtime_alignment ?? 0.5))
          + 0.10 * ((responses[0].meta_noise ?? 0.5) - (respObj.meta_noise ?? 0.5))
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
    responses,
    judge,
    deltas,
    verdict: judge?.verdict || null,
    reformulation_divergence: judge?.reformulation_divergence ?? null,
    response_divergence: judge?.response_divergence ?? null,
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
  const verdictBanner = `
    <div class="sup-verdict">
      ${partialNotice}
      <div style="margin-bottom:6px">
        <strong>★ Verdict :</strong> ${escHtml(verdict || 'aucun')} ·
        ${result.responses.length} candidat${result.responses.length>1?'s':''} · ${result.latency_ms}ms
      </div>
      ${verdictReason}
      <div class="sup-divergence">
        ${divergenceBadge(refDiv, 'reformulation_divergence')}
        ${divergenceBadge(respDiv, 'response_divergence')}
        ${(refDiv != null && refDiv < 0.30) ? '<span class="sup-warn">⚠ reformulations trop proches</span>' : ''}
      </div>
    </div>`;

  // ─── 1bis) CLASSEMENT ARGUMENTÉ /20 (priorité haute mission ARGUMENTED_RANKING) ───
  // Tri par grade_20 décroissant (fallback runtime_superiority si grade manquant)
  const sortedByGrade = [...deltas].sort((a, b) => {
    const ga = a.argumented_grade_20 ?? (10 + a.runtime_superiority * 10);
    const gb = b.argumented_grade_20 ?? (10 + b.runtime_superiority * 10);
    return gb - ga;
  });
  const gradeClass = g => {
    if (g == null) return '';
    if (g >= 18) return 'grade-excellent';
    if (g >= 15) return 'grade-good';
    if (g >= 12) return 'grade-mid';
    if (g >= 8)  return 'grade-low';
    return 'grade-bad';
  };
  const rankingBlock = `
    <details class="sup-section" open>
      <summary>★ Classement argumenté /20 (mission ARGUMENTED_RUNTIME_RANKING)</summary>
      <div class="sup-ranking-list">
        ${sortedByGrade.map((d, i) => {
          const grade = d.argumented_grade_20;
          const gradeStr = grade != null ? grade.toFixed(1) : '—';
          const gCls = gradeClass(grade);
          const isWin = i === 0;
          const colorClass = d.label.toLowerCase().includes('claude brut') ? 'baseline' : `rank-${(i+1)}`;
          return `<div class="sup-ranking-card ${colorClass} ${isWin ? 'winner' : ''}">
            <div class="sup-ranking-head">
              <span class="sup-ranking-pos">#${i+1}</span>
              <span class="sup-ranking-label">${escHtml(d.label)}</span>
              <span class="sup-ranking-grade ${gCls}">${gradeStr}<small>/20</small></span>
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

  // ─── 2) TABLE DELTAS (priorité haute selon mission) ───
  const sortedByRank = [...deltas].sort((a, b) => b.runtime_superiority - a.runtime_superiority);
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

  // ─── 3) REFORMULATIONS condensées (1-2 lignes par candidat) ───
  const reforms = result.responses.map((r, idx) => {
    if (!r.reformulation) return '';
    const isWin = verdict && r.label.includes(verdict);
    const colorClass = idx === 0 ? 'baseline' : `rank-${idx}`;
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
        ${result.responses.map((r, idx) => {
          const d = deltas.find(x => x.label === r.label);
          const isWin = verdict && r.label.includes(verdict);
          const colorClass = idx === 0 ? 'baseline' : `rank-${idx}`;
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

  return `<div class="superiority-container">
    ${verdictBanner}
    ${rankingBlock}
    ${deltaTable}
    ${concreteTable}
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
