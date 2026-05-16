// ZORAN — chat.js
// Mission ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516
//
// Port browser de runtime_cognitive_path_competition_engine.py
// Génère 6 routes cognitives concurrentes pour une question, score chacune,
// élimine via Oracle, désigne le gagnant. Inclut 2 baselines pour comparaison.

const K = 10;

function tokens(text) {
  if (!text) return new Set();
  return new Set(text.split(/[\s.,;:()\[\]{}"'\-]+/).filter(Boolean).map(t => t.toLowerCase()));
}

function topicScore(node, qTokens) {
  if (qTokens.size === 0) return 0.5;
  const bag = new Set();
  for (const t of tokens(node.title || '')) bag.add(t);
  for (const t of tokens(node.description || '')) bag.add(t);
  for (const t of (node.tags || [])) bag.add(t.toLowerCase());
  for (const t of (node.domains || [])) bag.add(t.toLowerCase());
  let inter = 0;
  for (const t of qTokens) if (bag.has(t)) inter++;
  return inter / Math.max(1, qTokens.size);
}

const STRATEGIES = {
  frugale: {
    label: 'Frugale',
    desc: 'Coût minimal — privilégie frugality_score',
    rank: (n, q) => -((n.frugality_score ?? 0.5)
                    - 0.5 * (n.propagation_cost ?? 0.5)
                    + 0.30 * topicScore(n, q)),
  },
  anti_hallucination: {
    label: 'Anti-hallu',
    desc: 'Sécurité maximale — réduit dérive',
    rank: (n, q) => -((n.anti_hallucination_score ?? 0.4)
                    + 0.30 * topicScore(n, q)
                    - 0.20 * (n.drift_risk ?? 0.3)),
  },
  propagation_forte: {
    label: 'Propag. forte',
    desc: 'Profondeur — explore loin',
    rank: (n, q) => -((n.dependency_load ?? 0.3)
                    + 0.30 * (n.propagation_cost ?? 0.5)
                    + 0.30 * topicScore(n, q)),
  },
  temporal_survival: {
    label: 'Temporel',
    desc: 'Stabilité long terme',
    rank: (n, q) => -((n.temporal_resilience_score ?? 0.5)
                    + 0.30 * topicScore(n, q)
                    - 0.20 * (n.collapse_probability ?? 0)),
  },
  structurelle: {
    label: 'Structurelle',
    desc: 'Composition max — utilise réseau',
    rank: (n, q) => -(((n.child_laws || []).length + (n.parent_laws || []).length)
                    + 0.50 * topicScore(n, q)
                    + 0.30 * (n.S_local ?? 0.7)),
  },
  runtime_rapide: {
    label: 'Runtime rapide',
    desc: 'Latence minimale',
    rank: (n, q) => -((n.velocity_score ?? 0.4)
                    + 0.30 * topicScore(n, q)
                    - 0.30 * (n.propagation_cost ?? 0.5)),
  },
};

function pickTopK(nodes, rankFn, qTokens, k = K) {
  return [...nodes].sort((a, b) => rankFn(a, qTokens) - rankFn(b, qTokens)).slice(0, k);
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
  // OFF-TOPIC DETECTION : si max topic_score sur tout le corpus < 0.10,
  // la question n'a aucune accroche lexicale dans ZORAN → on le dit
  // honnêtement plutôt que de forcer 6 routes aléatoires sans signal.
  let maxTopic = 0;
  for (const n of nodes) {
    const t = topicScore(n, qTokens);
    if (t > maxTopic) maxTopic = t;
  }
  const offTopic = maxTopic < 0.10 && qTokens.size > 0;

  const routes = [];
  for (const [name, strat] of Object.entries(STRATEGIES)) {
    const laws = pickTopK(nodes, strat.rank, qTokens, K);
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
  // Baselines
  const bl_n = pickTopK(nodes,
    (n, q) => -((n.selection_priority ?? 0) + 0.30 * topicScore(n, q)),
    qTokens, K);
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
  // C'est l'étiquette qui répond à la question. Off-topic → null.
  const answerLawId = (!offTopic && winnerRoute) ? winnerRoute.laws_used[0] : null;
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
      topic_match: topicScore(answerNode, qTokens),
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

  const offTopicBanner = result.offTopic
    ? `<div style="background:rgba(255,107,107,0.10);border:1px solid var(--unstable);
                  color:var(--unstable);padding:14px 16px;border-radius:6px;
                  margin-bottom:12px;font-size:13px;line-height:1.5">
        <strong>⚠ Question hors-domaine ZORAN</strong><br>
        Aucune loi du graphe ne correspond lexicalement (max topic = ${result.maxTopicRelevance.toFixed(3)}).
        ZORAN couvre : cohérence, propagation, runtime, frugalité, temporalité,
        bornage, hallucination, loi supérieure.
      </div>`
    : `<div style="background:linear-gradient(135deg,rgba(255,68,68,0.18),rgba(255,107,107,0.05));
                   border:1px solid #ff4444; color:#ffdddd;
                   padding:16px 18px; border-radius:8px; margin-bottom:14px;
                   font-size:14px; line-height:1.55">
        <div style="font-size:16px;color:#ff4444;margin-bottom:6px"><strong>● Loi clignotante rouge</strong></div>
        La réponse à ta question se lit directement sur l'étiquette de la loi
        rouge qui clignote dans le graphe. <strong>Pique dessus</strong> pour
        ouvrir le panneau détaillé : pourquoi cette loi a été retenue, ses
        scores, ses parents/enfants, ses équations.
      </div>`;

  // Routes details en accordéon — repliés par défaut pour ne pas surcharger
  body.innerHTML = `${offTopicBanner}<details style="margin-top:8px"><summary style="cursor:pointer;font-size:11px;color:var(--fg-2);text-transform:uppercase;letter-spacing:1px;padding:4px 0">
    Détails compétition routes (${result.routes.length} générées · ${result.routes.filter(r => !r.eliminated).length} survivantes)
  </summary>
  <div style="margin-top:10px">
  ${routeHtml}
  <h4 style="font-size:10px;color:var(--fg-2);margin:10px 0 4px 0;text-transform:uppercase">Baselines (référence)</h4>
  ${blHtml}
  </div></details>`;

  // Wire law-id clicks
  body.querySelectorAll('a[data-pick]').forEach(a => {
    a.addEventListener('click', () => onPickLaw(a.dataset.pick));
  });
}

export function wireChatBar(nodes, onPickLaw, onCompete, onClearRoutes, parentsMap) {
  const bar = document.getElementById('chat-bar');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const micBtn = document.getElementById('chat-mic');
  const fileBtn = document.getElementById('chat-file');
  const fileInput = document.getElementById('chat-file-input');
  const resultsClose = document.getElementById('chat-results-close');
  if (!bar || !input) return;

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
