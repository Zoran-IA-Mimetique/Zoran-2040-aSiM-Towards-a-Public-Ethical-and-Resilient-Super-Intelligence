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

  if (responses.length < 2) {
    console.warn('[ZORAN sup] FAIL — too few responses (got', responses.length, ')');
    return { ok: false, reason: 'too_few_responses', responses };
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
      deltas.push({
        label: r.label,
        precision: s.precision,
        hallucination: s.hallucination,
        noise: s.noise,
        coherence: s.coherence,
        semantic_delta: s.semantic_delta ?? 0,
        // Deltas vs baseline (positif = ZORAN mieux sauf hallu/noise où négatif = mieux)
        precision_delta: +(s.precision - baselineScore.precision).toFixed(3),
        hallucination_delta: +(s.hallucination - baselineScore.hallucination).toFixed(3),
        noise_delta: +(s.noise - baselineScore.noise).toFixed(3),
        coherence_delta: +(s.coherence - baselineScore.coherence).toFixed(3),
        // Score composite : haut = mieux
        runtime_superiority: +(
          0.30 * (s.precision - baselineScore.precision)
          + 0.30 * (baselineScore.hallucination - s.hallucination)
          + 0.20 * (baselineScore.noise - s.noise)
          + 0.20 * (s.coherence - baselineScore.coherence)
        ).toFixed(3),
        // winner_delta : écart vs meilleur score sur l'axe précision
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
  const verdictBanner = `
    <div class="sup-verdict">
      <div style="margin-bottom:6px">
        <strong>★ Verdict juge :</strong> ${escHtml(verdict || 'aucun')} ·
        ${result.responses.length} candidats · ${result.latency_ms}ms
      </div>
      <div class="sup-divergence">
        ${divergenceBadge(refDiv, 'reformulation_divergence')}
        ${divergenceBadge(respDiv, 'response_divergence')}
        ${(refDiv != null && refDiv < 0.30) ? '<span class="sup-warn">⚠ reformulations trop proches</span>' : ''}
      </div>
    </div>`;

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

  // ─── 4) RÉPONSES collapsées (priorité basse selon mission anti-inflation) ───
  const responsesBlock = `
    <details class="sup-section">
      <summary>Réponses complètes (texte ▶ dépliable)</summary>
      <div class="sup-resp-list">
        ${result.responses.map((r, idx) => {
          const d = deltas.find(x => x.label === r.label);
          const isWin = verdict && r.label.includes(verdict);
          const colorClass = idx === 0 ? 'baseline' : `rank-${idx}`;
          return `<div class="sup-resp-card ${colorClass} ${isWin ? 'winner' : ''}">
            <div class="sup-resp-head">
              <strong>${escHtml(r.label)}</strong>
              ${isWin ? '<span class="sup-winner-tag">★ WINNER</span>' : ''}
            </div>
            <div class="sup-resp-text">${escHtml(r.text)}</div>
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
    ${deltaTable}
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
