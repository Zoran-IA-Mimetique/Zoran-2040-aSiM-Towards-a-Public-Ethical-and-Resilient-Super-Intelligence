// app/src/superiority.js
// Mission : ZORAN_RUNTIME_SUPERIORITY_OVER_BASELINE_LLM_20260516
//
// Pour une question donnée, lance en parallèle :
//   - 1 baseline LLM (Claude sans contexte ZORAN)
//   - N routes ZORAN (chacune avec son set de 10 lois comme contexte)
//   - 1 juge LLM qui score toutes les réponses sur 4 axes
//
// Retourne un tableau comparatif avec deltas ZORAN vs baseline.

import { synthesizeBaseline, synthesizeRoute, judgeResponses } from './llm.js';

// Top 3 routes utilisées pour la compétition (sous-ensemble — coût API maîtrisé)
const SUPERIORITY_ROUTES = ['frugale', 'anti_hallucination', 'structurelle'];

export async function runSuperiorityComparison({ question, allNodes, routeResults }) {
  // routeResults : output de compete() — contient toutes les routes avec laws_used
  const t0 = performance.now();

  // 1. Lance baseline + N routes ZORAN EN PARALLÈLE
  const tasks = [];
  tasks.push((async () => ({ label: 'BASELINE LLM brut', ...(await synthesizeBaseline(question)) }))());
  for (const stratName of SUPERIORITY_ROUTES) {
    const route = routeResults.routes.find(r => r.strategy === stratName);
    if (!route) continue;
    const laws = (route.laws_used || []).map(id => allNodes.find(n => n.id === id)).filter(Boolean);
    tasks.push((async () => ({
      label: `ZORAN ${route.label || stratName}`,
      strategy: stratName,
      laws_used: route.laws_used,
      ...(await synthesizeRoute({ question, laws, strategyLabel: route.label || stratName }))
    }))());
  }
  const settled = await Promise.allSettled(tasks);
  const responses = settled
    .map(s => (s.status === 'fulfilled' ? s.value : { label: '?', ok: false, reason: 'rejected' }))
    .filter(r => r.ok && r.text);

  if (responses.length < 2) {
    return { ok: false, reason: 'too_few_responses', responses };
  }

  // 2. Juge — score chaque réponse sur precision/hallucination/noise/coherence
  const judgeResult = await judgeResponses({ question, responses });
  const judge = judgeResult.ok ? judgeResult.judge : null;

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
        comment: s.comment || '',
      });
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

  const cards = result.responses.map((r, idx) => {
    const d = deltas.find(x => x.label === r.label);
    const isBaseline = idx === 0;
    const isWinner = verdict && r.label.includes(verdict);
    const cls = `sup-card ${isBaseline ? 'baseline' : 'zoran'} ${isWinner ? 'winner' : ''}`;
    const scoresHtml = d ? `
      <div class="sup-scores">
        <span title="Précision">prec ${d.precision?.toFixed(2) ?? '—'}</span>
        <span title="Hallucination" class="${d.hallucination > 0.4 ? 'bad' : ''}">hallu ${d.hallucination?.toFixed(2) ?? '—'}</span>
        <span title="Bruit"           class="${d.noise > 0.5 ? 'bad' : ''}">noise ${d.noise?.toFixed(2) ?? '—'}</span>
        <span title="Cohérence">coh ${d.coherence?.toFixed(2) ?? '—'}</span>
      </div>
      ${!isBaseline ? `<div class="sup-deltas">
        Δ vs baseline :
        <span class="${d.precision_delta > 0 ? 'good' : d.precision_delta < 0 ? 'bad' : ''}">prec ${d.precision_delta > 0 ? '+' : ''}${d.precision_delta}</span>
        <span class="${d.hallucination_delta < 0 ? 'good' : d.hallucination_delta > 0 ? 'bad' : ''}">hallu ${d.hallucination_delta > 0 ? '+' : ''}${d.hallucination_delta}</span>
        <span class="${d.noise_delta < 0 ? 'good' : d.noise_delta > 0 ? 'bad' : ''}">noise ${d.noise_delta > 0 ? '+' : ''}${d.noise_delta}</span>
        <span class="${d.coherence_delta > 0 ? 'good' : d.coherence_delta < 0 ? 'bad' : ''}">coh ${d.coherence_delta > 0 ? '+' : ''}${d.coherence_delta}</span>
        <strong class="${d.runtime_superiority > 0 ? 'good' : 'bad'}" title="Score composite supériorité runtime">
          superiority ${d.runtime_superiority > 0 ? '+' : ''}${d.runtime_superiority}
        </strong>
      </div>` : ''}
    ` : '';
    return `<div class="${cls}">
      <div class="sup-head">
        <span class="sup-label">${escHtml(r.label)}</span>
        ${isWinner ? '<span class="sup-winner-tag">★ WINNER</span>' : ''}
      </div>
      <div class="sup-text">${escHtml(r.text)}</div>
      ${scoresHtml}
      ${d?.comment ? `<div class="sup-comment">${escHtml(d.comment)}</div>` : ''}
    </div>`;
  }).join('');

  const verdictBanner = verdict
    ? `<div class="sup-verdict">
        <strong>Verdict juge :</strong> ${escHtml(verdict)} · ${result.responses.length} candidats jugés · ${result.latency_ms}ms
      </div>`
    : '';
  return `<div class="superiority-container">
    ${verdictBanner}
    ${cards}
  </div>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
