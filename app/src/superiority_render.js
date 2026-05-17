// app/src/superiority_render.js
// Mission V11.6 — Chirurgie structurelle de lisibilité runtime
//
// Extraction du rendu HTML hors de superiority.js (orchestration).
// Aucun changement comportemental — réorganisation pure pour séparer :
//   - orchestration (superiority.js : appels LLM, métriques, deltas)
//   - rendu HTML (ici : tous les blocks visuels)
//
// Bénéfice : pouvoir modifier un sub-render sans toucher l'orchestration,
// et inversement. Réduit la contamination cross-couches détectée par user
// dans le commit 343c33b.

// ──────────────────── HELPERS PUBLICS ────────────────────

export function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function signed(n) {
  if (n == null) return '';
  const s = +n;
  if (Math.abs(s) < 0.005) return '';
  return ' ' + (s > 0 ? '+' : '') + s.toFixed(2);
}

function normalizeVerdictLabel(v) {
  return v ? String(v).replace(/^CANDIDAT\s*\d+\s*[—\-:]\s*/i, '').trim() : '';
}

function gradeClass(g) {
  if (g == null) return '';
  if (g >= 18) return 'grade-excellent';
  if (g >= 15) return 'grade-good';
  if (g >= 12) return 'grade-mid';
  if (g >= 8)  return 'grade-low';
  return 'grade-bad';
}

function humanSummary(d) {
  if (d.comment && d.comment.trim()) return d.comment;
  const bits = [];
  if (d.strengths && d.strengths.length) bits.push(d.strengths.slice(0, 2).join(', '));
  if (d.weaknesses && d.weaknesses.length) bits.push('mais ' + d.weaknesses[0]);
  return bits.length ? bits.join(' — ') : '(pas de synthèse disponible)';
}

// ──────────────────── CTA PARSER (SDE-029) ────────────────────
// 2 niveaux de CTA :
//   - INLINE : {cta:texte} dans le corps → rectangles cliquables (ZORAN only)
//   - BLOC TERMINAL : 3 CTAs orange en fin → identique à avant

// Parse les CTAs inline {cta:texte} → spans cliquables
// IMPORTANT : à appliquer APRÈS escHtml (les délimiteurs survivent l'échappement)
function parseInlineCTAs(escapedHtml) {
  // Marker LLM : {cta:texte cliquable}
  // Transformé en span avec data-cta-text (texte original pour click handler)
  return escapedHtml.replace(/\{cta:\s*([^}]+?)\s*\}/gi, (match, txt) => {
    // textContent du span servira de prompt suivant
    const cleanTxt = txt.trim();
    return `<button type="button" class="zoran-inline-cta" data-cta-text="${cleanTxt.replace(/"/g, '&quot;')}" title="Cliquer pour reposer cette question">${cleanTxt}</button>`;
  });
}

function renderResponseWithCTAs(text, isBaseline = false) {
  if (!text) return '';
  // Parser tolérant : "**CTA cohérents**", "CTA cohérents:", "### CTA", etc.
  const ctaRx = /\n\s*(?:---+\s*\n+|##+\s*|\*\*\*+\s*\n+)?\s*\*{0,3}\s*(?:3\s+)?CTA(?:\s+coh[ée]rents?)?(?:\s+\(SDE.?029\))?\s*\*{0,3}\s*[:\-—]?\s*\n/i;
  const match = text.match(ctaRx);

  // Helper : escape puis parser inline CTAs (ZORAN seulement)
  const renderBody = (body) => {
    const escaped = escHtml(body);
    // Inline CTAs activés UNIQUEMENT pour candidats ZORAN (pas baseline)
    return isBaseline ? escaped : parseInlineCTAs(escaped);
  };

  if (!match) {
    return `<div class="sup-resp-body">${renderBody(text)}</div>`;
  }
  const bodyPart = text.slice(0, match.index).trimEnd();
  const ctaPart = text.slice(match.index + match[0].length).trim();
  return `<div class="sup-resp-body">${renderBody(bodyPart)}</div>
    <div class="sup-cta-block">
      <div class="sup-cta-header">🔶 CTA cohérents (SDE-029)</div>
      <div class="sup-cta-content">${renderBody(ctaPart)}</div>
    </div>`;
}

// ──────────────────── BUILD RENDER CONTEXT ────────────────────
// Calcule une seule fois sortedByGrade / labelToRank / sortedResponses
// utilisés par tous les sub-renders.

function buildRenderContext(result) {
  const judge = result.judge;
  const deltas = result.deltas || [];
  const verdict = result.verdict;
  const verdictTarget = normalizeVerdictLabel(verdict);

  // Mission RANKING_BIAS_CORRECTION :
  // Si question low_intrinsic_depth → parsimony domine sur grade brut
  const lowIntrinsic = deltas.some(d => d.parsimony?.low_intrinsic_depth?.low_intrinsic);

  const sortedByGrade = [...deltas].sort((a, b) => {
    const aWin = verdictTarget && (a.label === verdictTarget || a.label.includes(verdictTarget) || verdictTarget.includes(a.label));
    const bWin = verdictTarget && (b.label === verdictTarget || b.label.includes(verdictTarget) || verdictTarget.includes(b.label));
    if (aWin && !bWin) return -1;
    if (bWin && !aWin) return 1;
    // Composite : grade brut + parsimony si question simple
    const ga = a.argumented_grade_20 ?? (10 + a.runtime_superiority * 10);
    const gb = b.argumented_grade_20 ?? (10 + b.runtime_superiority * 10);
    if (lowIntrinsic) {
      // 60% parsimony + 40% grade pour question simple
      const pa = (a.parsimony?.parsimony_score ?? 0.5) * 20; // [0..20]
      const pb = (b.parsimony?.parsimony_score ?? 0.5) * 20;
      const compositeA = 0.60 * pa + 0.40 * ga;
      const compositeB = 0.60 * pb + 0.40 * gb;
      return compositeB - compositeA;
    }
    return gb - ga;
  });

  const labelToRank = new Map();
  sortedByGrade.forEach((d, i) => labelToRank.set(d.label, i + 1));

  const sortedResponses = [...result.responses].sort((a, b) =>
    (labelToRank.get(a.label) || 99) - (labelToRank.get(b.label) || 99));

  return {
    result,
    judge,
    deltas,
    verdict,
    verdictTarget,
    refDiv: result.reformulation_divergence,
    respDiv: result.response_divergence,
    sortedByGrade,
    sortedByRank: sortedByGrade,  // alias historique
    sortedResponses,
    labelToRank,
    isSingleWinnerMode: sortedByGrade.length <= 3,
  };
}

// ──────────────────── SUB-RENDERS ────────────────────

function renderVerdictBanner(ctx) {
  const { result, judge, verdict, refDiv, respDiv } = ctx;
  const divergenceBadge = (v, label) => {
    if (v == null) return '';
    const cls = v >= 0.30 ? 'good' : (v >= 0.15 ? '' : 'bad');
    return `<span class="${cls}">${label} ${v.toFixed(2)}</span>`;
  };
  const partialNotice = result.partial
    ? `<div class="sup-warn" style="margin-bottom:6px">⚠ Mode partiel — seule réponse Claude brut a abouti (3 ZORAN ont échoué : crédit/limite ?). Aucun jugement comparatif possible.</div>`
    : '';
  const verdictReason = judge?.verdict_reason
    ? `<div style="font-size:11px;color:var(--fg-2);font-style:italic;margin-top:4px">${escHtml(judge.verdict_reason)}</div>`
    : '';
  const cplxBadge = result.complexity_estimate ? (() => {
    const c = result.complexity_estimate;
    const colorClass = c.depth_required === 'simple' ? 'good'
                     : c.depth_required === 'fractal' ? 'bad'
                     : '';
    const fastPathTag = result.fast_path === 'simple' ? ' <strong>FAST-PATH</strong>' : '';
    return `<span class="${colorClass}" title="${escHtml(c.reasoning.join(' | '))}">
      profondeur: ${escHtml(c.depth_required)}${fastPathTag}
    </span>`;
  })() : '';
  return `
    <div class="sup-verdict">
      ${partialNotice}
      <div style="margin-bottom:6px">
        <strong>★ Verdict :</strong> ${escHtml(normalizeVerdictLabel(verdict || 'aucun'))} ·
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
}

function renderRankingBlock(ctx) {
  const { result, sortedByGrade } = ctx;
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

  const skippedBanner = (result.skippedRoutes && result.skippedRoutes.length > 0)
    ? `<div class="sup-skipped-banner">
        <strong>⊘ Routes ZORAN skippées hors-domaine (${result.skippedRoutes.length}) :</strong>
        ${result.skippedRoutes.map(s =>
          `<span class="sup-skipped-chip" title="${escHtml(s.profile?.label_domains_forts || '')}">${escHtml(s.label)} (fitness ${s.domain_fitness})</span>`
        ).join(' ')}
        <div class="sup-skipped-note">économie API + bruit benchmark évité</div>
      </div>`
    : '';

  return `
    <div class="sup-ranking-section">
      ${skippedBanner}
      ${winnerCardXL}
      ${otherRankings ? `<div class="sup-ranking-others">${otherRankings}</div>` : ''}
      ${argumentedDetails}
    </div>`;
}

function renderDeltaTable(ctx) {
  const { sortedByRank } = ctx;
  return `
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
}

function renderConcreteTable(ctx) {
  const { sortedByRank } = ctx;
  return `
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
}

function renderSystemicTable(ctx) {
  const { sortedByRank } = ctx;
  return `
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
}

function renderFragilityTable(ctx) {
  const { sortedByRank } = ctx;
  return `
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
}

function renderParsimonyTable(ctx) {
  const { sortedByRank } = ctx;
  // Skip si aucun delta n'a parsimony calculé
  if (!sortedByRank.some(d => d.parsimony)) return '';
  const isLowIntrinsic = sortedByRank.some(d => d.parsimony?.low_intrinsic_depth?.low_intrinsic);
  return `
    <details class="sup-section" ${isLowIntrinsic ? 'open' : ''}>
      <summary>Parcimonie cognitive (mission RANKING_BIAS_CORRECTION ${isLowIntrinsic ? '— question simple détectée' : ''})</summary>
      <div class="sup-deltas-table" style="margin-top:8px">
        <div class="sup-deltas-row sup-deltas-header" style="grid-template-columns:24px 1fr 60px 60px 60px 60px 72px">
          <span class="sup-col-rank">#</span>
          <span class="sup-col-label">Candidat</span>
          <span class="sup-col-num" title="local_sufficiency — calcul+résultat sans surcharge">suffis</span>
          <span class="sup-col-num" title="digression_penalty — concepts hors-scope">digress</span>
          <span class="sup-col-num" title="cta_excess — nombre CTA vs profondeur">cta+</span>
          <span class="sup-col-num" title="cognitive_efficiency — info/mots">eff.cog</span>
          <span class="sup-col-sup" title="parsimony composite — plus haut = mieux adapté">parcim</span>
        </div>
        ${sortedByRank.map((d, i) => {
          const p = d.parsimony || {};
          const ls = p.local_sufficiency?.score ?? 0;
          const dp = p.digression_penalty?.penalty ?? 0;
          const cta = p.cta_excess?.penalty ?? 0;
          const ce = p.cognitive_efficiency ?? 0;
          const ps = p.parsimony_score ?? 0;
          const psClass = ps >= 0.65 ? 'good' : ps <= 0.35 ? 'bad' : '';
          return `<div class="sup-deltas-row ${i === 0 ? 'is-rank-1' : ''}" style="grid-template-columns:24px 1fr 60px 60px 60px 60px 72px">
            <span class="sup-col-rank">${i+1}</span>
            <span class="sup-col-label">${escHtml(d.label)}</span>
            <span class="sup-col-num">${ls.toFixed(2)}</span>
            <span class="sup-col-num ${dp >= 0.2 ? 'bad' : ''}">${dp.toFixed(2)}</span>
            <span class="sup-col-num ${cta >= 0.2 ? 'bad' : ''}">${cta.toFixed(2)}</span>
            <span class="sup-col-num">${ce.toFixed(2)}</span>
            <span class="sup-col-sup ${psClass}">${ps.toFixed(2)} <small>${escHtml(p.verdict || '')}</small></span>
          </div>`;
        }).join('')}
      </div>
      ${isLowIntrinsic ? '<div style="margin-top:6px;font-size:11px;color:var(--fg-2);font-style:italic">⚠ Question à faible profondeur intrinsèque détectée — parsimonie pondérée à 60% du ranking final.</div>' : ''}
    </details>`;
}

function renderReformsBlock(ctx) {
  const { sortedResponses, labelToRank } = ctx;
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
  return reforms ? `
    <details class="sup-section" open>
      <summary>Reformulations cognitives (lentille de chaque route)</summary>
      <div class="sup-reform-list">${reforms}</div>
    </details>` : '';
}

function renderResponsesBlock(ctx) {
  const { result, deltas, sortedResponses, labelToRank } = ctx;
  return `
    <details class="sup-section" ${result.partial ? 'open' : ''}>
      <summary>Réponses complètes (texte ▶ dépliable)</summary>
      <div class="sup-resp-list">
        ${sortedResponses.map((r, idx) => {
          const d = deltas.find(x => x.label === r.label);
          const rank = labelToRank.get(r.label) || (idx + 1);
          const isWin = rank === 1;
          const colorClass = r.strategy === 'baseline' ? 'baseline' : `rank-${rank}`;
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
            <div class="sup-resp-text">${renderResponseWithCTAs(r.text, r.strategy === 'baseline')}</div>
            ${jargonChips}
            ${d?.comment ? `<div class="sup-comment">${escHtml(d.comment)}</div>` : ''}
            ${r.strategy === 'baseline'
              ? '<div class="sup-laws sup-laws-none">Lois ZORAN utilisées : <strong>AUCUNE</strong> · réponse Claude brute, pour comparaison</div>'
              : (r.laws_used && r.laws_used.length
                  ? `<div class="sup-laws">Lois utilisées (${r.laws_used.length}) : ${r.laws_used.map(id => `<code>${escHtml(id)}</code>`).join(' ')}</div>`
                  : '')}
          </div>`;
        }).join('')}
      </div>
    </details>`;
}

// ──────────────────── MAIN EXPORT ────────────────────

export function renderComparison(result) {
  if (!result.ok) {
    return `<div class="superiority-error">
      <strong>⚠ Comparaison impossible</strong> — ${result.reason || 'erreur'}
    </div>`;
  }

  const ctx = buildRenderContext(result);

  // Mission SINGLE_WINNER_RUNTIME : affichage simplifié pour 2-3 candidats
  if (ctx.isSingleWinnerMode) {
    return `<div class="superiority-container">
      ${renderVerdictBanner(ctx)}
      ${renderRankingBlock(ctx)}
      ${renderParsimonyTable(ctx)}
      ${renderConcreteTable(ctx)}
      ${renderSystemicTable(ctx)}
      ${renderFragilityTable(ctx)}
      ${renderResponsesBlock(ctx)}
    </div>`;
  }

  // Mode legacy multi-cards (benchmark CSV/offline)
  return `<div class="superiority-container">
    ${renderVerdictBanner(ctx)}
    ${renderRankingBlock(ctx)}
    ${renderDeltaTable(ctx)}
    ${renderParsimonyTable(ctx)}
    ${renderConcreteTable(ctx)}
    ${renderSystemicTable(ctx)}
    ${renderFragilityTable(ctx)}
    ${renderReformsBlock(ctx)}
    ${renderResponsesBlock(ctx)}
  </div>`;
}
