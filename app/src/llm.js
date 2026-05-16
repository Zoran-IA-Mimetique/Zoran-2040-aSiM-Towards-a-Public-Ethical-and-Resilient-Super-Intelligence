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
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

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
