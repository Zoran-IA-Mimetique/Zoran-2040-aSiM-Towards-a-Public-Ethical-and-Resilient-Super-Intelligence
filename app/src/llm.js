// app/src/llm.js — synthèse de réponse via Claude API (direct browser)
// Mission : "ZORAN donne la réponse la plus cohérente multi-cadres"
//
// Sans clé API : retourne null + un message expliquant la limite.
// Avec clé API : appelle api.anthropic.com avec le contexte multi-cadres
// (loi retenue + cadres + parents) et retourne la réponse synthétisée.
//
// NB sécurité : la clé est stockée en localStorage et envoyée depuis le
// navigateur. C'est acceptable pour un usage perso / demo, pas pour prod
// multi-utilisateurs (la clé serait exposée). Pour prod : backend proxy.

const KEY_STORAGE = 'zoran.anthropic.key';
const MODEL_STORAGE = 'zoran.anthropic.model';
const BENCH_STORAGE = 'zoran.bench.enabled';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

export function getBenchmarkEnabled() {
  try { return localStorage.getItem(BENCH_STORAGE) === '1'; } catch (_) { return false; }
}
export function setBenchmarkEnabled(on) {
  try { localStorage.setItem(BENCH_STORAGE, on ? '1' : '0'); } catch (_) {}
}

export function getApiKey() {
  try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (_) { return ''; }
}
export function setApiKey(k) {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k);
    else localStorage.removeItem(KEY_STORAGE);
  } catch (_) {}
}
export function getModel() {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch (_) { return DEFAULT_MODEL; }
}
export function setModel(m) {
  try {
    if (m) localStorage.setItem(MODEL_STORAGE, m);
  } catch (_) {}
}
export function hasApiKey() { return !!getApiKey(); }

function frameLine(label, items) {
  if (!items || !items.length) return '';
  const txt = items.map(e => {
    if (typeof e === 'string') return e;
    if (typeof e === 'object') {
      if (e.scope && e.level) return `${e.scope} (${e.level})`;
      return e.scope || e.label || e.level || JSON.stringify(e);
    }
    return String(e);
  }).join(' · ');
  return `[${label}] ${txt}`;
}

function buildSystemPrompt(node, multiFrame, parents) {
  const frameLines = [
    frameLine('CADRE GLOBAL',       multiFrame?.global),
    frameLine('CADRE INTERMÉDIAIRE', multiFrame?.intermediate),
    frameLine('CADRE LOCAL',        multiFrame?.local),
    frameLine('PROXIES',            multiFrame?.proxies),
    frameLine('LIMITES',            multiFrame?.limits),
  ].filter(Boolean).join('\n');
  const parentLine = (parents && parents.length)
    ? `\nLOIS PARENTES utilisées : ${parents.join(', ')}`
    : '';
  return [
    'Tu es ZORAN, système cognitif graphe-based de lois cognitives.',
    'Une question utilisateur a été soumise. Une compétition de routes runtime a retenu UNE loi comme la plus cohérente pour y répondre. Tu dois maintenant SYNTHÉTISER la réponse en t\'appuyant STRICTEMENT sur les cadres de cette loi.',
    '',
    `LOI RETENUE : ${node.id} — ${node.title}`,
    node.html_description ? `DESCRIPTION : ${node.html_description}` : '',
    '',
    'CADRES COGNITIFS DE LA LOI :',
    frameLines || '(pas de cadres explicites)',
    parentLine,
    '',
    'Règles de réponse :',
    '1. Synthétise une réponse cohérente en 3-5 phrases maximum.',
    '2. Articule explicitement les cadres global → intermédiaire → local.',
    '3. Mentionne au moins une limite de la réponse.',
    '4. Si la question est hors-domaine, dis-le ouvertement.',
    '5. Pas de markdown, pas de listes — réponse en prose dense.',
    '6. Réponds en français.',
  ].filter(Boolean).join('\n');
}

// Appel générique Claude API — base de tous les autres
async function callLLM({ system, user, maxTokens = 600, model = null }) {
  const key = getApiKey();
  if (!key) return { ok: false, reason: 'no_api_key' };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || getModel(),
        max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: 'api_error', status: res.status, message: text };
    }
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { ok: true, text, model: data.model, usage: data.usage };
  } catch (err) {
    return { ok: false, reason: 'network', message: err.message };
  }
}

// Mission RUNTIME_SUPERIORITY : LLM brut sans contexte ZORAN
export async function synthesizeBaseline(question) {
  return await callLLM({
    system: 'Tu es un assistant. Réponds à la question en 3-5 phrases denses en français, sans markdown.',
    user: question,
    maxTokens: 600,
  });
}

// LLM with ZORAN route context (laws from a specific strategy)
export async function synthesizeRoute({ question, laws, strategyLabel }) {
  if (!laws || !laws.length) return { ok: false, reason: 'no_laws' };
  const lawsCtx = laws.slice(0, 10).map(l => {
    const title = l.title || '';
    const desc = (l.html_description || l.description || '').slice(0, 200);
    return `• ${l.id} — ${title}${desc ? ' : ' + desc : ''}`;
  }).join('\n');
  const system = [
    `Tu es ZORAN-${strategyLabel}, sélectionne uniquement parmi les lois ci-dessous comme cadre cognitif.`,
    'Lois activées par la stratégie :',
    lawsCtx,
    '',
    'Réponds à la question en 3-5 phrases denses en français, sans markdown, en t\'appuyant uniquement sur ces lois.',
  ].join('\n');
  return await callLLM({ system, user: question, maxTokens: 600 });
}

// LLM-as-judge : compare N réponses et score sur 4 axes [0..1]
export async function judgeResponses({ question, responses }) {
  const labels = responses.map((r, i) => `${i+1}. [${r.label}]`).join(', ');
  const numbered = responses.map((r, i) =>
    `[RÉPONSE ${i+1} — ${r.label}]\n${r.text || '(vide)'}\n`).join('\n');
  const system = [
    'Tu es un juge cognitif neutre. On te donne une question et plusieurs réponses étiquetées.',
    'Pour CHAQUE réponse, attribue un score [0..1] sur 4 axes :',
    '  - precision      : justesse factuelle apparente',
    '  - hallucination  : risque que la réponse invente (0 = aucun, 1 = max)',
    '  - noise          : verbosité inutile / digression (0 = dense, 1 = bruyant)',
    '  - coherence      : cohérence interne et structure logique',
    'Réponds STRICTEMENT en JSON, aucune autre prose, format :',
    '{"verdict":"<label gagnant>","scores":[{"label":"<l1>","precision":0.0,"hallucination":0.0,"noise":0.0,"coherence":0.0,"comment":"<1 phrase>"},...]}',
    'Aucune autre prose. Aucun markdown. JSON pur uniquement.',
  ].join('\n');
  const user = `QUESTION : ${question}\n\nRÉPONSES À JUGER (${labels}) :\n\n${numbered}`;
  const r = await callLLM({ system, user, maxTokens: 1200 });
  if (!r.ok) return r;
  // Parse JSON (tolérant)
  let json = null;
  try {
    const match = r.text.match(/\{[\s\S]*\}/);
    if (match) json = JSON.parse(match[0]);
  } catch (_) {}
  return { ok: !!json, judge: json, raw: r.text, model: r.model, usage: r.usage };
}

export async function synthesizeAnswer({ question, node, multiFrame, parents }) {
  const key = getApiKey();
  if (!key) {
    return {
      ok: false,
      reason: 'no_api_key',
      message: 'Synthèse LLM désactivée — clé API non configurée. Cliquez ⚙ dans la barre du chat.',
    };
  }
  if (!node) {
    return { ok: false, reason: 'no_law', message: 'Aucune loi retenue runtime.' };
  }
  const system = buildSystemPrompt(node, multiFrame, parents);
  const model = getModel();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: question }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: 'api_error', status: res.status, message: text };
    }
    const data = await res.json();
    const answer = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
    return {
      ok: true,
      answer,
      model: data.model,
      usage: data.usage,
    };
  } catch (err) {
    return { ok: false, reason: 'network', message: err.message };
  }
}
