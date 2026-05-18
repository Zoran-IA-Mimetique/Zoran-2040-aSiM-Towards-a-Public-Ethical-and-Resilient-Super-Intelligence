// ZORAN — chat.js
// Mission ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516
import { synthesizeAnswer, hasApiKey, getApiKey, setApiKey, getModel, setModel,
         getBenchmarkEnabled, setBenchmarkEnabled } from './llm.js';
import { renderProfileSelector, setProfile, getProfile } from './user_profile.js';
import { runSuperiorityComparison, renderComparison } from './superiority.js';
import { renderResponseWithCTAs, truncationBadge } from './superiority_render.js';
import { mapStructural, structuralTopicBoost } from './structural_mapping.js';
//
// Port browser de runtime_cognitive_path_competition_engine.py
// Génère 6 routes cognitives concurrentes pour une question, score chacune,
// élimine via Oracle, désigne le gagnant. Inclut 2 baselines pour comparaison.

const K = 10;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function tokens(text) {
  if (!text) return new Set();
  return new Set(text.split(/[\s.,;:()\[\]{}"'\-]+/).filter(Boolean).map(t => t.toLowerCase()));
}

function topicScore(node, qTokens, structMap) {
  if (qTokens.size === 0) return 0.5;
  const bag = new Set();
  for (const t of tokens(node.title || '')) bag.add(t);
  for (const t of tokens(node.description || '')) bag.add(t);
  for (const t of (node.tags || [])) bag.add(t.toLowerCase());
  for (const t of (node.domains || [])) bag.add(t.toLowerCase());
  let inter = 0;
  for (const t of qTokens) if (bag.has(t)) inter++;
  const lex = inter / Math.max(1, qTokens.size);
  // Structural boost (mission STRUCTURAL_QUERY_MAPPING)
  const struct = structMap ? structuralTopicBoost(node, structMap) : 0;
  return Math.max(lex, struct);
}

const STRATEGIES = {
  frugale: {
    label: 'Frugale',
    desc: 'Coût minimal — privilégie frugality_score',
    rank: (n, q, sm) => -((n.frugality_score ?? 0.5)
                    - 0.5 * (n.propagation_cost ?? 0.5)
                    + 0.30 * topicScore(n, q, sm)),
  },
  anti_hallucination: {
    label: 'Anti-hallu',
    desc: 'Sécurité maximale — réduit dérive',
    rank: (n, q, sm) => -((n.anti_hallucination_score ?? 0.4)
                    + 0.30 * topicScore(n, q, sm)
                    - 0.20 * (n.drift_risk ?? 0.3)),
  },
  propagation_forte: {
    label: 'Propag. forte',
    desc: 'Profondeur — explore loin',
    rank: (n, q, sm) => -((n.dependency_load ?? 0.3)
                    + 0.30 * (n.propagation_cost ?? 0.5)
                    + 0.30 * topicScore(n, q, sm)),
  },
  temporal_survival: {
    label: 'Temporel',
    desc: 'Stabilité long terme',
    rank: (n, q, sm) => -((n.temporal_resilience_score ?? 0.5)
                    + 0.30 * topicScore(n, q, sm)
                    - 0.20 * (n.collapse_probability ?? 0)),
  },
  structurelle: {
    label: 'Structurelle',
    desc: 'Composition max — utilise réseau',
    rank: (n, q, sm) => -(((n.child_laws || []).length + (n.parent_laws || []).length)
                    + 0.50 * topicScore(n, q, sm)
                    + 0.30 * (n.S_local ?? 0.7)),
  },
  runtime_rapide: {
    label: 'Runtime rapide',
    desc: 'Latence minimale',
    rank: (n, q, sm) => -((n.velocity_score ?? 0.4)
                    + 0.30 * topicScore(n, q, sm)
                    - 0.30 * (n.propagation_cost ?? 0.5)),
  },
};

function pickTopK(nodes, rankFn, qTokens, k = K, structMap = null) {
  return [...nodes].sort((a, b) => rankFn(a, qTokens, structMap) - rankFn(b, qTokens, structMap)).slice(0, k);
}

// Fix V11.x bug #6/#12 : filtre les lois méta-conversationnelles (SDE-029 et
// similaires) quand la question n'est PAS elle-même méta-conversationnelle.
// Une loi sur "comment Claude doit communiquer" n'a rien à faire dans le routing
// d'une question BTP / médecine / etc.
const META_CONVERSATIONAL_LAW_IDS = new Set(['SDE-029']);
function isMetaConversationalQuestion(text) {
  if (!text) return false;
  return /\b(CTA|Call.To.Analysis|ZORAN|prompt|réponse|claude|assistant|conversation|dialogue|méta.?cognitif|méta.?réponse)\b/i.test(text);
}
function filterMetaLaws(nodes, question) {
  if (isMetaConversationalQuestion(question)) return nodes;
  return nodes.filter(n => !META_CONVERSATIONAL_LAW_IDS.has(n.id));
}

function scoreRoute(laws) {
  if (!laws.length) return {
    runtime_cost: 0, precision_score: 0, hallucination_risk: 0,
    propagation_weight: 0, temporal_stability: 0, noise_generated: 0,
    runtime_path_efficiency: 0, hallucination_resistance: 0,
    noise_efficiency: 0, cognitive_cost_ratio: 0,
    real_world_alignment: 0, path_survival_score: 0,
    selection_score: 0,
  };
  const n = laws.length;
  const avg = (k, dflt) => laws.reduce((s, l) => s + (l[k] ?? dflt), 0) / n;
  const rt_cost = avg('propagation_cost', 0.5);
  const prec    = avg('S_local', 0.7);
  const hallu   = avg('drift_risk', 0.3);
  const propag_w = avg('propagation_weight', 0.5);
  const temp_st = avg('temporal_resilience_score', 0.5);
  const noise   = avg('noise_contribution', 0.3);
  const frug    = avg('frugality_score', 0.5);

  const rt_eff   = Math.max(0, Math.min(1, prec - rt_cost + 0.30));
  const hallu_r  = 1 - hallu;
  const noise_eff = 1 - noise;
  const cc_ratio = Math.max(0, Math.min(1, prec / Math.max(0.05, rt_cost) / 2));
  const rwa      = hallu_r * 0.40 + temp_st * 0.30 + frug * 0.30;
  const survival = Math.min(1, 0.40 * rt_eff + 0.30 * hallu_r + 0.30 * temp_st);
  const sel      = Math.min(1,
      0.25 * rt_eff + 0.20 * hallu_r + 0.20 * noise_eff
    + 0.15 * cc_ratio + 0.10 * temp_st + 0.10 * rwa);

  return {
    runtime_cost: rt_cost,
    precision_score: prec,
    hallucination_risk: hallu,
    propagation_weight: propag_w,
    temporal_stability: temp_st,
    noise_generated: noise,
    runtime_path_efficiency: rt_eff,
    hallucination_resistance: hallu_r,
    noise_efficiency: noise_eff,
    cognitive_cost_ratio: cc_ratio,
    real_world_alignment: rwa,
    path_survival_score: survival,
    selection_score: sel,
  };
}

function oracleEliminate(s) {
  const fails = [];
  if (s.hallucination_risk > 0.55) fails.push('hallucination');
  if (s.noise_generated > 0.55) fails.push('bruit');
  if (s.runtime_cost > 0.80) fails.push('coût runtime');
  if (s.runtime_path_efficiency < 0.20) fails.push('gain trop bas');
  if (s.temporal_stability < 0.40) fails.push('instabilité');
  return fails;
}

// Stringify une entrée de cadre (peut être string ou objet { level, scope })
function frameEntryText(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object') {
    if (e.scope && e.level) return `${e.scope} (${e.level})`;
    return e.scope || e.label || e.level || JSON.stringify(e);
  }
  return String(e);
}

// Compose la "réponse cohérente multi-cadres" à partir des frames de la loi
function composeMultiFrameAnswer(node, parents) {
  if (!node) return null;
  const frames = node.frames || {};
  const ans = {
    global:       (frames.global       || []).map(frameEntryText).filter(Boolean),
    intermediate: (frames.intermediate || []).map(frameEntryText).filter(Boolean),
    local:        (frames.local        || []).map(frameEntryText).filter(Boolean),
    proxies:      (frames.proxies      || []).map(frameEntryText).filter(Boolean),
    limits:       (frames.limits       || []).map(frameEntryText).filter(Boolean),
    parents:      parents || [],
  };
  const tiersUsed = ['global','intermediate','local','proxies','limits']
    .filter(k => ans[k].length > 0);
  ans.tiers_used = tiersUsed;
  return ans;
}

export function compete(question, nodes, parentsMap) {
  const qTokens = tokens(question);
  // Mission STRUCTURAL_QUERY_MAPPING : détecte structures cognitives
  // implicites (risque, contradiction, hypothèse, propagation, temporal,
  // bornage, auditabilité, décision, compression, comparaison, causalité)
  // → utilise comme boost topic en plus du matching lexical brut.
  const structMap = mapStructural(question);
  // OFF-TOPIC : on prend en compte le score structural en plus du lexical
  let maxTopic = 0;
  for (const n of nodes) {
    const tLex = topicScore(n, qTokens);
    const tStr = structuralTopicBoost(n, structMap);
    const t = Math.max(tLex, tStr);
    if (t > maxTopic) maxTopic = t;
  }
  // off-topic devient beaucoup plus rare : seulement si AUCUN match lexical
  // ET AUCUN match structural
  const offTopic = maxTopic < 0.10 && qTokens.size > 0 && structMap.structures.length === 0;

  const routes = [];
  // Fix bug #6/#12 : exclure méta-lois conversationnelles si question hors-domaine méta
  const filteredNodes = filterMetaLaws(nodes, question);
  for (const [name, strat] of Object.entries(STRATEGIES)) {
    const laws = pickTopK(filteredNodes, strat.rank, qTokens, K, structMap);
    const s = scoreRoute(laws);
    const fails = oracleEliminate(s);
    routes.push({
      route_id: `ROUTE-${name}`,
      strategy: name,
      label: strat.label,
      desc: strat.desc,
      laws_used: laws.map(l => l.id),
      ...s,
      eliminated: fails.length > 0,
      elimination_reasons: fails,
    });
  }
  // Baselines (idem filtre meta-lois)
  const bl_n = pickTopK(filteredNodes,
    (n, q, sm) => -((n.selection_priority ?? 0) + 0.30 * topicScore(n, q, sm)),
    qTokens, K, structMap);
  const baselines = [
    { baseline_id: 'BASELINE-naive_selection_priority',
      laws_used: bl_n.map(l => l.id), ...scoreRoute(bl_n) },
  ];
  // Add a random baseline
  const seeded = [...nodes].sort(() => Math.random() - 0.5).slice(0, K);
  baselines.push({
    baseline_id: 'BASELINE-random',
    laws_used: seeded.map(l => l.id), ...scoreRoute(seeded),
  });
  const survivors = routes.filter(r => !r.eliminated).sort((a, b) => b.selection_score - a.selection_score);
  const winnerRoute = survivors[0] || null;
  // THE answer = première loi du winner route (priority-ordered)
  // Mission MULTI_WINNER : on garde answerLawId MÊME en off-topic
  // (le user verra l'avertissement off-topic + le multi-winner LLM tournera
  // quand même → CLAUDE brut peut répondre, ZORAN tentera avec ses cadres).
  const answerLawId = winnerRoute ? winnerRoute.laws_used[0] : null;
  // Trouver le nœud complet pour cette loi + parents
  const answerNode = answerLawId ? nodes.find(n => n.id === answerLawId) : null;
  const parents = answerNode
    ? Array.from(new Set([
        ...(answerNode.parent_laws || []),
        ...((parentsMap && parentsMap.get(answerNode.id)) || []),
      ]))
    : [];
  const multiFrame = answerNode ? composeMultiFrameAnswer(answerNode, parents) : null;
  const answerContext = answerNode ? {
    question,
    law_id: answerNode.id,
    law_title: answerNode.title,
    law_description: answerNode.html_description || answerNode.description || '',
    multiFrameAnswer: multiFrame,
    why: {
      winning_strategy: winnerRoute.label || winnerRoute.strategy,
      selection_score: winnerRoute.selection_score,
      precision_score: winnerRoute.precision_score,
      hallucination_resistance: winnerRoute.hallucination_resistance,
      topic_match: topicScore(answerNode, qTokens, structMap),
      survived_oracle: true,
    }
  } : null;

  return {
    question, routes, baselines,
    winner: winnerRoute?.route_id || null,
    answerLawId,
    answerContext,
    offTopic,
    maxTopicRelevance: maxTopic,
    structures: structMap.structures,           // structures cognitives détectées
    structural_match_score: structMap.structural_match_score,
  };
}

function fmt(v) { return (v ?? 0).toFixed(3); }
function bar(v, color) {
  const n = Math.round(v * 5);
  return `<span style="font-family:ui-monospace,monospace;color:${color}">${'▮'.repeat(n)}${'▯'.repeat(5-n)}</span>`;
}

export function renderResults(result, onPickLaw) {
  const body = document.getElementById('chat-results-body');
  const qSpan = document.getElementById('chat-results-q');
  const panel = document.getElementById('chat-results');
  qSpan.textContent = `Q: ${result.question}`;
  const wasHidden = panel.classList.contains('hidden');
  panel.classList.remove('hidden');
  // FORCE expanded on every new question (mission UX : impossible to miss)
  panel.classList.remove('minimized');
  const minBtn = document.getElementById('chat-results-min');
  if (minBtn) { minBtn.textContent = '–'; minBtn.title = 'Minimiser'; }
  try { localStorage.setItem('zoran.chat.min', '0'); } catch (_) {}
  // CORRECTIF : si height inline héritée < min usable, la retirer pour
  // laisser CSS height (560px par défaut) s'appliquer.
  const currentH = parseFloat(panel.style.height || '0');
  if (currentH > 0 && currentH < 280) {
    panel.style.removeProperty('height');
  }
  panel.setAttribute('aria-hidden', 'false');
  // Toujours dispatch zoran-show pour que la restauration position/taille s'exécute
  panel.dispatchEvent(new CustomEvent('zoran-show'));

  const routesSorted = [...result.routes].sort((a, b) => b.selection_score - a.selection_score);
  const winner = result.winner;

  const routeHtml = routesSorted.map(r => {
    const isWinner = r.route_id === winner;
    const statusTag = r.eliminated
      ? `<span class="route-status ko">✗ éliminée : ${r.elimination_reasons.join(', ')}</span>`
      : (isWinner ? `<span class="route-status winner-tag">★ WINNER</span>` : `<span class="route-status ok">✓ survit</span>`);
    const snrColor = r.hallucination_resistance >= 0.55 ? '#3ad17a' : 'var(--accent)';
    const noiseColor = r.noise_generated <= 0.30 ? '#3ad17a' : (r.noise_generated <= 0.50 ? 'var(--accent)' : 'var(--unstable)');
    return `<div class="route-card ${r.eliminated ? 'eliminated' : ''} ${isWinner ? 'winner' : ''}">
      <div class="route-head">
        <span class="route-name">${r.label}</span>
        ${statusTag}
        <span class="route-status">sel ${fmt(r.selection_score)}</span>
      </div>
      <div style="font-size:11px;color:var(--fg-2);margin-bottom:4px">${r.desc}</div>
      <div class="route-bars">
        <span title="Précision moyenne S_local">prec ${fmt(r.precision_score)}</span>
        <span title="Risque hallucination">hallu ${fmt(r.hallucination_risk)} ${bar(r.hallucination_risk, 'var(--unstable)')}</span>
        <span title="Bruit ajouté">bruit ${fmt(r.noise_generated)} ${bar(r.noise_generated, noiseColor)}</span>
        <span title="Coût runtime">coût ${fmt(r.runtime_cost)}</span>
        <span title="Stabilité temporelle">temp ${fmt(r.temporal_stability)}</span>
        <span title="Real-world alignment">rwa ${fmt(r.real_world_alignment)}</span>
        <span title="Survie projection">survie ${fmt(r.path_survival_score)}</span>
      </div>
      <div class="route-laws">${r.laws_used.map(id => `<a class="route-law-id" data-pick="${id}">${id}</a>`).join('')}</div>
    </div>`;
  }).join('');

  const blHtml = result.baselines.map(b => `
    <div class="baseline-row">
      <strong style="color:var(--fg-2)">${b.baseline_id}</strong>
      <span>sel ${fmt(b.selection_score)}</span>
      <span>prec ${fmt(b.precision_score)}</span>
      <span>hallu ${fmt(b.hallucination_risk)}</span>
      <span>bruit ${fmt(b.noise_generated)}</span>
    </div>`).join('');

  // Structures cognitives détectées (mission STRUCTURAL_QUERY_MAPPING)
  const structuresBanner = (result.structures && result.structures.length > 0)
    ? `<div style="background:rgba(78,163,255,0.10);border:1px solid var(--canonical);
                color:var(--fg-1);padding:12px 14px;border-radius:6px;
                margin-bottom:10px;font-size:12px;line-height:1.5">
        <div style="font-size:11px;color:var(--canonical);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
          Structures cognitives détectées (${result.structures.length})
        </div>
        ${result.structures.map(s => `<span style="display:inline-block;background:var(--bg-2);border:1px solid var(--line);padding:2px 8px;border-radius:3px;margin:2px;font-size:11px"><strong>${esc(s.label)}</strong></span>`).join('')}
        <div style="margin-top:6px;font-size:10px;color:var(--fg-2)">→ familles activées : ${[...new Set(result.structures.flatMap(s => s.families))].join(', ')}</div>
      </div>`
    : '';

  const offTopicBanner = result.offTopic
    ? `<div style="background:rgba(255,107,107,0.10);border:1px solid var(--unstable);
                  color:var(--unstable);padding:14px 16px;border-radius:6px;
                  margin-bottom:12px;font-size:13px;line-height:1.5">
        <strong>⚠ Question hors-domaine ZORAN</strong><br>
        Aucune correspondance lexicale ni structurelle détectée (max topic = ${result.maxTopicRelevance.toFixed(3)}).
        ZORAN couvre : cohérence, propagation, runtime, frugalité, temporalité,
        bornage, hallucination, loi supérieure.
      </div>`
    : '';

  // Zone réponse LLM — toujours présente, état initial selon clé API
  const llmInitial = hasApiKey()
    ? `<div class="llm-answer-box loading" id="llm-answer-box">
        <div class="llm-label"><span class="hourglass-spin">⌛</span> Réponse ZORAN — synthèse en cours…</div>
        <div class="llm-body">Claude compose une réponse cohérente multi-cadres à partir de la loi retenue…</div>
      </div>`
    : `<div class="llm-answer-box error" id="llm-answer-box">
        <div class="llm-label">⚠ Synthèse LLM désactivée</div>
        <div class="llm-body">ZORAN a retenu la loi <strong>${esc(result.answerContext?.law_id || '—')}</strong>
          ${result.answerContext ? `— <em>${esc(result.answerContext.law_title)}</em>` : ''} mais ne peut pas
          composer une réponse en langage naturel sans clé API Claude.
          <br><br><strong>Cliquez ⚙ dans la barre du chat pour configurer une clé Anthropic.</strong>
          Sinon, lisez l'étiquette rouge flottante sur la loi clignotante (cadres + parents).
        </div>
      </div>`;

  const winnerCardBanner = result.answerContext
    ? `<div style="background:linear-gradient(135deg,rgba(255,68,68,0.18),rgba(255,107,107,0.05));
                   border:1px solid #ff4444; color:#ffdddd;
                   padding:12px 16px; border-radius:8px; margin-bottom:14px;
                   font-size:13px; line-height:1.55">
        <div style="font-size:14px;color:#ff4444;margin-bottom:4px"><strong>● ${esc(result.answerContext.law_id)} — ${esc(result.answerContext.law_title)}</strong></div>
        <span style="color:rgba(255,221,221,0.85)">Loi retenue runtime, clignote rouge dans le graphe. Pique dessus pour le détail.</span>
      </div>`
    : '';

  // Routes details en accordéon — repliés par défaut pour ne pas surcharger
  body.innerHTML = `${structuresBanner}${offTopicBanner}${winnerCardBanner}${llmInitial}
  <details style="margin-top:8px"><summary style="cursor:pointer;font-size:11px;color:var(--fg-2);text-transform:uppercase;letter-spacing:1px;padding:4px 0">
    Détails routes cognitives internes (${result.routes.length} stratégies évaluées · ${result.routes.filter(r => !r.eliminated).length} survivent oracle)
  </summary>
  <div style="margin-top:10px">
  ${routeHtml}
  <h4 style="font-size:10px;color:var(--fg-2);margin:10px 0 4px 0;text-transform:uppercase">Baselines (référence)</h4>
  ${blHtml}
  </div></details>`;

  // Lancement async multi-winner si clé présente
  // Mission : même off-topic, on lance le pipeline (CLAUDE brut peut
  // toujours répondre, et le user verra le warning off-topic + les
  // tentatives ZORAN — c'est précieux pour comprendre le domaine couvert).
  if (hasApiKey() && result.answerContext) {
    runSynthesis(result);
  } else if (hasApiKey() && !result.answerContext) {
    // Edge case : pas de winner route → on lance quand même Claude brut
    runBaselineOnly(result);
  }

  // Wire law-id clicks
  body.querySelectorAll('a[data-pick]').forEach(a => {
    a.addEventListener('click', () => onPickLaw(a.dataset.pick));
  });
}

async function runBaselineOnly(result) {
  const box = document.getElementById('llm-answer-box');
  if (!box) return;
  box.classList.add('loading');
  box.classList.remove('error', 'answered');
  box.innerHTML = `<div class="llm-label"><span class="hourglass-spin">⌛</span> Claude brut uniquement (pas de loi ZORAN retenue)</div>
    <div class="llm-body"><span class="hourglass-spin" style="font-size:18px">⌛</span> Question hors-domaine total — appel direct Claude…</div>`;
  const { synthesizeBaseline } = await import('./llm.js');
  const r = await synthesizeBaseline(result.question);
  box.classList.remove('loading');
  if (r.ok) {
    // baseline = pas d'inline CTA (règle SDE-029 : ZORAN only)
    box.innerHTML = `<div class="llm-label">⚖ CLAUDE brut · 0 loi (off-topic ZORAN)</div>
      <div class="llm-body">${renderResponseWithCTAs(r.text, true)}</div>
      ${r.truncated ? truncationBadge('augmenter maxTokens si récurrent') : ''}
      <div class="llm-meta">modèle ${esc(r.model || '?')}</div>`;
  } else {
    box.classList.add('error');
    box.innerHTML = `<div class="llm-label">⚠ Claude brut échoué : ${esc(r.reason || '?')}</div>
      <div class="llm-body">${esc(r.message || '')}</div>`;
  }
}

async function runSynthesis(result) {
  const box = document.getElementById('llm-answer-box');
  if (!box) return;
  const ctx = result.answerContext;
  if (!ctx) return;
  const node = window.state?.graph?.nodes?.find(n => n.id === ctx.law_id);
  if (!node) return;

  // Mission MULTI_WINNER_REFORMULATION : TOUJOURS lancer la comparaison
  // complète quand la clé API est présente (Claude brut + 3 ZORAN + juge).
  // Le mode économe (1 seule réponse) reste accessible via décochage du toggle
  // ET nécessite réglage explicite (state inverse au défaut).
  const economeMode = getBenchmarkEnabled();
  console.log('[ZORAN] runSynthesis — economeMode=', economeMode,
              '· apiKey=', hasApiKey() ? 'present' : 'absent');
  if (!economeMode) {
    // Sablier persistant : sans le réinjecter ici, innerHTML écrase le ⌛ du boot.
    box.classList.add('loading');
    box.classList.remove('error', 'answered');
    box.innerHTML = `
      <div class="llm-label"><span class="hourglass-spin">⌛</span> Comparaison runtime — CLAUDE brut + ZORAN orchestré (4 appels : 2 parallèles + 2 séquentiels)</div>
      <div class="llm-body">
        <span class="hourglass-spin" style="font-size:18px">⌛</span>
        Réponses parallèles → augmentation ReZo → juge LLM…
        <div class="llm-progress-hint" style="margin-top:6px;font-size:11px;color:var(--fg-2);font-style:italic">
          Phases : baseline + orchestré (≈10s parallèle) → augmentation ReZo (≈8s) → juge (≈10s)
        </div>
      </div>
    `;
    const allNodes = window.state?.graph?.nodes || [];
    const cmp = await runSuperiorityComparison({
      question: result.question,
      allNodes,
      routeResults: result,
    });
    box.classList.remove('loading');
    if (cmp.ok) {
      box.classList.remove('error');
      box.innerHTML = `<div class="llm-label">⚖ Comparaison runtime — CLAUDE brut vs 3 routes ZORAN</div>
        ${renderComparison(cmp)}`;
    } else {
      box.classList.add('error');
      box.innerHTML = `<div class="llm-label">⚠ Comparaison runtime échouée (${esc(cmp.reason || '?')})</div>
        <div class="llm-body">${esc(cmp.message || 'Trop peu de réponses valides ou juge non parsable — vérifiez la clé API.')}</div>`;
    }
    return;
  }

  // Mode standard : 1 seul appel synthèse
  const t0 = performance.now();
  const r = await synthesizeAnswer({
    question: result.question,
    node,
    multiFrame: ctx.multiFrameAnswer,
    parents: ctx.multiFrameAnswer?.parents || [],
  });
  const dt = Math.round(performance.now() - t0);
  if (r.ok) {
    box.classList.remove('loading');
    box.classList.add('answered');
    box.innerHTML = `
      <div class="llm-label">🧠 Réponse ZORAN — synthèse multi-cadres</div>
      <div class="llm-body">${renderResponseWithCTAs(r.answer, false)}</div>
      ${r.truncated ? truncationBadge('relancer pour réponse complète') : ''}
      <div class="llm-meta">modèle ${esc(r.model || '?')} · ${r.usage?.input_tokens || '?'} in / ${r.usage?.output_tokens || '?'} out · ${dt}ms · loi ${esc(ctx.law_id)}</div>
    `;
  } else {
    box.classList.remove('loading');
    box.classList.add('error');
    box.innerHTML = `
      <div class="llm-label">⚠ Synthèse impossible (${esc(r.reason || 'unknown')})</div>
      <div class="llm-body">${esc(r.message || 'Erreur inconnue.')}</div>
    `;
  }
}

// Popup info-bulle pour CTA inline ZORAN : affiche le détail enrichi préparé
// par le LLM puis propose de relancer le chat sur le sujet.
function openCtaPopup({ label, detail, anchor, onSubmit }) {
  // Cleanup d'un éventuel popup déjà ouvert (évite empilement)
  document.querySelectorAll('.zoran-cta-popup-overlay').forEach(p => p.remove());

  const hasDetail = !!detail;
  const overlay = document.createElement('div');
  overlay.className = 'zoran-cta-popup-overlay';
  overlay.innerHTML = `
    <div class="zoran-cta-popup-card" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <button type="button" class="zoran-cta-popup-close" aria-label="Fermer">✕</button>
      <div class="zoran-cta-popup-label">${esc(label)}</div>
      ${hasDetail
        ? `<div class="zoran-cta-popup-detail">${esc(detail)}</div>`
        : `<div class="zoran-cta-popup-detail zoran-cta-popup-empty">Pas de détail enrichi disponible pour ce CTA — relance directe possible.</div>`}
      <div class="zoran-cta-popup-actions">
        <button type="button" class="zoran-cta-popup-ask">Poser cette question</button>
        <button type="button" class="zoran-cta-popup-dismiss">Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector('.zoran-cta-popup-card');
  // Positionnement near-anchor sur desktop, centré sur mobile
  if (anchor && window.innerWidth > 720) {
    const rect = anchor.getBoundingClientRect();
    const cardH = 220;  // estimation, ajusté après mount
    const top = Math.max(12, Math.min(window.innerHeight - cardH - 12, rect.bottom + 8));
    const left = Math.max(12, Math.min(window.innerWidth - 460, rect.left));
    card.style.position = 'fixed';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.zoran-cta-popup-close').addEventListener('click', close);
  overlay.querySelector('.zoran-cta-popup-dismiss').addEventListener('click', close);
  overlay.querySelector('.zoran-cta-popup-ask').addEventListener('click', () => {
    close();
    onSubmit(label);
  });
  // ESC ferme
  const onKey = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

function setupSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('chat-settings');
  if (!modal || !btn) {
    console.warn('[ZORAN] settings modal not found in DOM — bouton ⚙ inactif');
    return;
  }
  const close    = document.getElementById('settings-close');
  const backdrop = modal.querySelector('.settings-backdrop');
  const keyInput = document.getElementById('settings-key');
  const modelSel = document.getElementById('settings-model');
  const save     = document.getElementById('settings-save');
  const clear    = document.getElementById('settings-clear');

  const benchInput = document.getElementById('settings-bench');
  function open() {
    try {
      keyInput.value = getApiKey();
      modelSel.value = getModel() || 'claude-sonnet-4-6';
      if (benchInput) benchInput.checked = getBenchmarkEnabled();
    } catch (e) { console.warn('[ZORAN] settings open error', e); }
    modal.classList.remove('hidden');
    setTimeout(() => keyInput && keyInput.focus(), 50);
    console.log('[ZORAN] settings modal opened');
  }
  function shut() { modal.classList.add('hidden'); }

  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
  if (close) close.addEventListener('click', shut);
  if (backdrop) backdrop.addEventListener('click', shut);
  if (save) save.addEventListener('click', () => {
    setApiKey(keyInput.value.trim());
    setModel(modelSel.value);
    if (benchInput) setBenchmarkEnabled(benchInput.checked);
    shut();
    console.log('[ZORAN] settings saved — bench=', benchInput?.checked);
  });
  if (clear) clear.addEventListener('click', () => {
    setApiKey('');
    keyInput.value = '';
    console.log('[ZORAN] API key cleared');
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) shut();
  });
  console.log('[ZORAN] settings modal wired (⚙ ready)');
}

export function wireChatBar(nodes, onPickLaw, onCompete, onClearRoutes, parentsMap) {
  setupSettingsModal();
  // Mission ADAPTIVE_TRANSPARENCY : injecte sélecteur de profil utilisateur
  const profileSlot = document.getElementById('zoran-profile-slot');
  if (profileSlot) {
    profileSlot.innerHTML = renderProfileSelector();
    const select = document.getElementById('zoran-profile-select');
    if (select) {
      select.addEventListener('change', e => {
        setProfile(e.target.value);
        console.log('[ZORAN profile] changé →', e.target.value);
      });
    }
  }
  const bar = document.getElementById('chat-bar');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const micBtn = document.getElementById('chat-mic');
  const fileBtn = document.getElementById('chat-file');
  const resetBtn = document.getElementById('chat-reset');
  const fileInput = document.getElementById('chat-file-input');
  const resultsClose = document.getElementById('chat-results-close');
  if (!bar || !input) return;

  // Mission SUPERIORITY_CONVERGENCE — bouton ⟲ Reset : efface prompt,
  // ferme popup résultats, désactive route mode dans le graphe, prêt pour
  // nouvelle question sans rafraîchir la page.
  function resetAll() {
    input.value = '';
    input.focus();
    const popup = document.getElementById('chat-results');
    if (popup) {
      popup.classList.add('hidden');
      popup.setAttribute('aria-hidden', 'true');
    }
    // Désactive route mode du graphe (étiquette rouge + tinting)
    if (onClearRoutes) onClearRoutes();
    // Reset window state for fresh comparison
    if (window.state) {
      window.state.answerLawId = null;
      window.state.answerContext = null;
      window.state.lastQuestion = null;
    }
    console.log('[ZORAN] ⟲ reset — prompt cleared, popup closed, routes deactivated');
  }
  if (resetBtn) resetBtn.addEventListener('click', resetAll);

  function submit() {
    const q = (input.value || '').trim();
    if (!q) return;
    const result = compete(q, nodes, parentsMap);
    renderResults(result, onPickLaw);
    // Mission REALTIME_ROUTE_VISUALIZATION : activer les routes dans le graphe
    if (onCompete) onCompete(result);
    console.log('%cZORAN PATH COMPETITION', 'color:#ffcc4d;font-weight:bold', result);
  }

  sendBtn.addEventListener('click', submit);

  // CTAs inline cliquables (ZORAN only) : click ouvre popup avec détail enrichi
  // préparé par le LLM (info-bulle = valeur ajoutée non développée dans la réponse).
  // Le popup propose ensuite de relancer le chat sur le sujet.
  document.addEventListener('click', e => {
    const ctaBtn = e.target.closest('.zoran-inline-cta');
    if (!ctaBtn) return;
    e.preventDefault();
    const label = (ctaBtn.dataset.ctaText || ctaBtn.textContent || '').trim();
    const detail = (ctaBtn.dataset.ctaDetail || '').trim();
    if (!label) return;
    openCtaPopup({ label, detail, anchor: ctaBtn, onSubmit: (q) => {
      input.value = q;
      input.focus();
      submit();
    }});
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  resultsClose.addEventListener('click', () => {
    document.getElementById('chat-results').classList.add('hidden');
    document.getElementById('chat-results').setAttribute('aria-hidden', 'true');
  });

  // ─── Mic via Web Speech API ─────────────────────────────────────
  let recognition = null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      input.value = t;
      if (e.results[0].isFinal) {
        micBtn.classList.remove('active');
        submit();
      }
    };
    recognition.onerror = () => micBtn.classList.remove('active');
    recognition.onend   = () => micBtn.classList.remove('active');
  }
  micBtn.addEventListener('click', () => {
    if (!recognition) {
      alert('Reconnaissance vocale non supportée par ce navigateur.\nUtilisez Chrome ou Edge.');
      return;
    }
    if (micBtn.classList.contains('active')) {
      recognition.stop(); micBtn.classList.remove('active');
    } else {
      try { recognition.start(); micBtn.classList.add('active'); } catch (_) {}
    }
  });

  // ─── File upload ────────────────────────────────────────────────
  fileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      alert('Fichier trop volumineux (> 2 Mo)'); return;
    }
    try {
      const text = await f.text();
      // Use first 600 chars as the question context
      const ctx = text.replace(/\s+/g, ' ').slice(0, 600);
      input.value = `[fichier ${f.name}] ${ctx}`;
      submit();
    } catch (err) {
      alert('Lecture fichier impossible : ' + err.message);
    }
  });
}
