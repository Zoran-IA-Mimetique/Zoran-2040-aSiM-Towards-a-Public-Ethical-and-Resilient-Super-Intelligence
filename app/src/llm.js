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
const ECONOMY_STORAGE = 'zoran.economy.mode';
const MIGRATION_TAG = 'zoran.migration.v2_multi_default';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

// MIGRATION v2 : force-reset economy mode pour tous les utilisateurs
// (les versions précédentes pouvaient avoir laissé un état incohérent
//  dans localStorage qui forçait le single-answer mode).
try {
  if (localStorage.getItem(MIGRATION_TAG) !== '1') {
    localStorage.removeItem('zoran.bench.enabled');
    localStorage.removeItem(ECONOMY_STORAGE);      // ← force défaut = multi-winner ON
    localStorage.setItem(MIGRATION_TAG, '1');
    console.log('[ZORAN] migration v2 appliquée : economy mode reset → multi-winner par défaut');
  }
} catch (_) {}

// Renvoie true si l'utilisateur a coché "Mode économe" (1 seule réponse)
// Par défaut false = comparaison multi-winner complète activée
export function getBenchmarkEnabled() {
  try { return localStorage.getItem(ECONOMY_STORAGE) === '1'; } catch (_) { return false; }
}
export function setBenchmarkEnabled(on) {
  try { localStorage.setItem(ECONOMY_STORAGE, on ? '1' : '0'); } catch (_) {}
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

// Mission MULTI_WINNER_REFORMULATION : reformule la question selon la
// LENTILLE COGNITIVE de la stratégie (pas une paraphrase lexicale).
export async function reformulateQuestion({ question, strategyLabel, laws }) {
  const lawsCtx = (laws || []).slice(0, 6).map(l =>
    `• ${l.id} — ${l.title}`).join('\n');
  const system = [
    `Tu es ZORAN-${strategyLabel}. Tu vas REFORMULER la question utilisateur selon ta lentille cognitive propre.`,
    'Cadre cognitif activé :',
    lawsCtx || '(aucun cadre)',
    '',
    'Règles STRICTES :',
    '1. La reformulation doit révéler COMMENT ta stratégie pense le problème.',
    '2. PAS de paraphrase superficielle. Reformulation = changement de cadrage cognitif.',
    '3. UNE seule phrase, 12-25 mots maximum.',
    '4. Français, dense, pas de markdown.',
    '5. Termine sans point d\'interrogation final (formuler en assertion problématique).',
    '',
    'Exemple générique :',
    '  Question : "comment réduire l\'hallucination ?"',
    '  Frugale : "minimiser la surface d\'erreur en compressant les sources actives au strict nécessaire"',
    '  Anti-hallu : "garantir que chaque assertion runtime soit traçable à une loi vérifiable"',
    '  Structurelle : "articuler les cadres local-intermédiaire-global pour borner l\'espace d\'inférence"',
  ].join('\n');
  return await callLLM({ system, user: question, maxTokens: 120 });
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
// Mission SILENT_LAW_GUIDANCE : les lois deviennent INFRASTRUCTURE INVISIBLE.
// Elles guident le RAISONNEMENT sans contaminer le LANGAGE de la réponse.
export async function synthesizeRoute({ question, laws, strategyLabel }) {
  if (!laws || !laws.length) return { ok: false, reason: 'no_laws' };
  const lawsCtx = laws.slice(0, 10).map(l => {
    const title = l.title || '';
    const desc = (l.html_description || l.description || '').slice(0, 200);
    return `• ${l.id} — ${title}${desc ? ' : ' + desc : ''}`;
  }).join('\n');
  // Adaptation par stratégie : chacune influence un AXE de la cognition,
  // pas le vocabulaire de surface.
  const ANGLE_BY_STRATEGY = {
    frugale: 'Réponse la plus BRÈVE et ESSENTIELLE possible. Coupe tout détail non actionnable.',
    'anti-hallu': 'Réponse PRUDENTE. Distingue ce qui est sûr de ce qui est incertain. Renvoie vers expert/source quand pertinent.',
    structurelle: 'Articule clairement plusieurs niveaux : court terme/long terme, immédiat/systémique, local/global. Sans nommer ces niveaux.',
    temporelle: 'Distingue court terme vs long terme. Mentionne ce qui change avec le temps. Sans utiliser le mot "temporel".',
    'runtime rapide': 'Réponse rapide à utiliser immédiatement, sans préambule.',
    propag_forte: 'Anticipe les effets en cascade. Mentionne les conséquences indirectes.',
  };
  const angle = ANGLE_BY_STRATEGY[(strategyLabel || '').toLowerCase()] || ANGLE_BY_STRATEGY[strategyLabel] || '';

  const system = [
    `Tu es un expert généraliste qui pense via l'angle cognitif "${strategyLabel}".`,
    'Tu as activé MENTALEMENT ces cadres internes (NE JAMAIS LES CITER ni les nommer dans la réponse) :',
    lawsCtx,
    '',
    '════ RÈGLES STRICTES — INFRASTRUCTURE INVISIBLE (mission SILENT_LAW_GUIDANCE) ════',
    '',
    'Les cadres ci-dessus sont des CONTRAINTES SILENCIEUSES. Ils guident ta sélection,',
    'ton bornage, ta prudence — JAMAIS ton vocabulaire.',
    '',
    '✓ FAIRE :',
    '  - Répondre dans le LANGAGE PROFESSIONNEL du domaine de la question (BTP, juridique,',
    '    médical, projet, etc.). Utiliser les termes que l\'utilisateur emploierait lui-même.',
    '  - Pour BTP : "étude structure", "BET", "descente de charges", "contreventement",',
    '    "DTU", "bureau de contrôle", "Consuel", etc.',
    '  - Pour juridique : articles de loi, jurisprudence, parties, etc.',
    '  - Donner des actions concrètes, vérifications, étapes immédiates.',
    '  - 3-5 phrases denses, en français, sans markdown.',
    '',
    '✗ INTERDICTIONS ABSOLUES (mission anti-jargon) :',
    '  - NE JAMAIS utiliser : "loi", "cadre", "lentille cognitive", "S_local", "S_global",',
    '    "propagation", "frugalité", "borne", "auditabilité", "invariance morphologique",',
    '    "cohérence multi-cadres", "palier cognitif", "attracteur", "sous-graphe".',
    '  - NE JAMAIS citer des IDs de lois : pas de WP11-008, GHUC-002, ULG-001, etc.',
    '  - NE JAMAIS dire "selon le cadre", "depuis la perspective", "en activant la loi".',
    '  - NE JAMAIS faire de méta-discours sur ta façon de penser.',
    '',
    `Angle "${strategyLabel}" : ${angle}`,
    '',
    'EXEMPLE — Question BTP "supprimer murs porteurs" :',
    '  ✗ MAUVAIS : "Il faut préserver l\'invariance morphologique en propageant les charges."',
    '  ✓ CORRECT : "Avant tout : étude structure obligatoire par un BET, calcul descente',
    '             de charges, IPN ou IPE en remplacement, validation bureau de contrôle.',
    '             Sans cette étude, risque d\'effondrement immédiat ou différé."',
  ].join('\n');
  return await callLLM({ system, user: question, maxTokens: 600 });
}

// LLM-as-judge : classement argumenté /20 avec points forts/faibles concrets
// Mission ARGUMENTED_RUNTIME_RANKING : remplace le verdict opaque par
// un jugement explicite, argumenté, mesurable et utilisateur-centré.
export async function judgeResponses({ question, responses, reformulations = null }) {
  const labels = responses.map((r, i) => `${i+1}. [${r.label}]`).join(', ');
  const numbered = responses.map((r, i) => {
    const ref = reformulations ? `REFORMULATION : ${reformulations[i] || '(absente)'}\n` : '';
    return `[CANDIDAT ${i+1} — ${r.label}]\n${ref}RÉPONSE : ${r.text || '(vide)'}\n`;
  }).join('\n');
  const system = [
    'Tu es un JUGE COGNITIF NEUTRE. Évalue plusieurs réponses à une question utilisateur.',
    'Le user veut une réponse CONCRÈTE, ACTIONNABLE, du DOMAINE de sa question.',
    'Une réponse "très cohérente et fascinante" sans utilité concrète PERD.',
    '',
    '═══ POUR CHAQUE CANDIDAT, attribue les scores [0..1] : ═══',
    '  - precision           : justesse factuelle apparente',
    '  - hallucination       : risque d\'invention (0=aucun, 1=max)',
    '  - noise               : verbosité inutile (0=dense, 1=bruyant)',
    '  - coherence           : cohérence interne',
    '  - actionability_score : actions/étapes concrètes immédiates',
    '  - practical_relevance : utilité réelle pour le user de la question',
    '  - compression_quality : essentiel sans détails parasites',
    '  - semantic_delta      : écart sémantique vs autres candidats',
    '',
    '═══ NOTE /20 ARGUMENTÉE — argumented_grade_20 ═══',
    '  Sur 20. Pas arbitraire. Doit correspondre à l\'aide concrète apportée au user.',
    '  Barème indicatif : 18-20 excellent et actionnable · 15-17 bon · 12-14 moyen ·',
    '  8-11 faible (jargon excessif, trop abstrait, peu actionnable) · ≤7 inutile.',
    '',
    '═══ JUSTIFICATION OBLIGATOIRE par candidat ═══',
    '  - strengths  : 1 à 3 points forts CONCRETS (pas "très cohérent")',
    '  - weaknesses : 1 à 3 points faibles CONCRETS (jargon, abstraction, oubli, etc.)',
    '  - noise_detected : 1 phrase si bruit identifié, sinon ""',
    '  - hallucination_risk : 1 phrase si risque, sinon ""',
    '  - comment : 1 phrase synthèse',
    '',
    'INTERDIT : "réponse très cohérente et fascinante", "intéressant", "élégant".',
    'OBLIGATOIRE : pointer une faiblesse réelle même sur le winner.',
    '',
    '═══ DIVERGENCE GLOBALE [0..1] ═══',
    '  - reformulation_divergence : divergence COGNITIVE des reformulations',
    '  - response_divergence      : divergence SÉMANTIQUE des réponses',
    '',
    '═══ FORMAT — JSON pur, aucune autre prose, aucun markdown ═══',
    '{"verdict":"<label gagnant>",',
    ' "verdict_reason":"<phrase argumentant le winner>",',
    ' "reformulation_divergence":0.0, "response_divergence":0.0,',
    ' "scores":[{',
    '   "label":"<l>","precision":0.0,"hallucination":0.0,"noise":0.0,"coherence":0.0,',
    '   "actionability_score":0.0,"practical_relevance":0.0,"compression_quality":0.0,',
    '   "semantic_delta":0.0,"argumented_grade_20":0.0,',
    '   "strengths":["..."],"weaknesses":["..."],',
    '   "noise_detected":"...","hallucination_risk":"...","comment":"..."',
    ' },...]}',
  ].join('\n');
  const user = `QUESTION ORIGINALE : ${question}\n\nCANDIDATS (${labels}) :\n\n${numbered}`;
  const r = await callLLM({ system, user, maxTokens: 2500 });
  if (!r.ok) return r;
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
