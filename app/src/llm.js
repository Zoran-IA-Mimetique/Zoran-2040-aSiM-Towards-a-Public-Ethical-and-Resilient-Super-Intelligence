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
export async function callLLM({ system, user, maxTokens = 600, model = null }) {
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
    const truncated = data.stop_reason === 'max_tokens';
    return { ok: true, text, model: data.model, usage: data.usage, stop_reason: data.stop_reason, truncated };
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

// WINNER_SYNTHESIS_ENGINE (mission SUPERIORITY_CONVERGENCE 20260516)
// Prend les 2 candidats (Claude brut + ZORAN orchestré), demande au LLM
// de produire UNE seule réponse finale optimale qui combine leurs forces
// et corrige leurs défauts. C'est la VRAIE sortie utilisateur.
//
// Sortie : { ok, finalAnswer, picked_from, rationale } — l'utilisateur
// voit "finalAnswer" + 1 phrase rationale ("synthèse Claude brut + ZORAN").
export async function winnerSynthesis({ question, claudeAnswer, zoranAnswer, domain }) {
  if (!claudeAnswer && !zoranAnswer) return { ok: false, reason: 'no_inputs' };
  if (!claudeAnswer) return { ok: true, finalAnswer: zoranAnswer, picked_from: 'zoran_only', rationale: 'Claude brut indisponible' };
  if (!zoranAnswer)  return { ok: true, finalAnswer: claudeAnswer, picked_from: 'claude_only', rationale: 'ZORAN orchestré indisponible' };

  const domLabel = domain?.label || 'généraliste';
  const domVocab = domain?.vocab_hint || 'vocabulaire courant';
  const system = [
    `Tu es un EXPERT du domaine "${domLabel}". Produis UNE réponse finale optimale qui combine les forces de deux brouillons et corrige leurs défauts.`,
    `Vocabulaire imposé : ${domVocab}.`,
    '',
    '═══ RÈGLES STRICTES ═══',
    '1. Garde ce qui est CONCRET et ACTIONNABLE dans chaque brouillon.',
    '2. SUPPRIME : méta-phrases, jargon ZORAN, prudence rituelle, transitions vides.',
    '3. STRUCTURE : urgences d\'abord, contexte ensuite, limites en clôture.',
    '4. 4-7 phrases denses. Vocabulaire DU DOMAINE uniquement.',
    '5. TERMINE TA RÉPONSE complètement.',
    '6. Pas de markdown, pas de listes à puces (sauf si essentielles).',
    '',
    'Tu choisis QUE GARDER, fusionnes intelligemment, et produit la réponse finale.',
    'Réponds STRICTEMENT en JSON : {"finalAnswer":"...","picked_from":"both|claude|zoran","rationale":"<1 phrase>"}.',
    'Pas d\'autre prose, pas de markdown autour du JSON.',
  ].join('\n');

  const user = [
    `QUESTION : ${question}`,
    '',
    `BROUILLON CLAUDE BRUT :`,
    claudeAnswer,
    '',
    `BROUILLON ZORAN ORCHESTRÉ :`,
    zoranAnswer,
    '',
    'Produis la réponse finale optimale en JSON.',
  ].join('\n');

  const r = await callLLM({ system, user, maxTokens: 2500 });
  if (!r.ok) return r;
  try {
    const match = r.text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, reason: 'no_json_in_response', raw: r.text };
    const json = JSON.parse(match[0]);
    if (!json.finalAnswer) return { ok: false, reason: 'no_final_answer', raw: r.text };
    return { ok: true, ...json, model: r.model, usage: r.usage };
  } catch (e) {
    return { ok: false, reason: 'json_parse_error', error: e.message, raw: r.text };
  }
}

// GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE (mission DOMAIN_DOMINANCE)
// Au lieu de générer 3 réponses séparées et choisir, on ORCHESTRE en
// UN seul appel LLM qui combine les angles cognitifs UTILES selon les
// structures détectées + impose le vocabulaire NATIF du domaine.
// Économie : 1 call au lieu de 3+1 judge. Qualité : pas de méta-fusion
// bruyante. Le LLM sélectionne mentalement les angles pertinents.
// Mission RANKING_BIAS_CORRECTION : import parsimony detector pour
// adapter le prompt selon la profondeur intrinsèque de la question
import { detectLowIntrinsicDepth } from './parsimony_detector.js';
// Mission ADAPTIVE_TRANSPARENCY : profil utilisateur
import { getProfileConfig } from './user_profile.js';

export async function synthesizeOrchestrated({
  question, domain, structures, lawsByStrategy = {}, parents = []
}) {
  // Construit la consigne multi-angle selon structures détectées
  const angles = [];
  const structKeys = (structures || []).map(s => s.key || s);
  if (structKeys.includes('propagation') || structKeys.includes('causalite') || structKeys.includes('temporalite')) {
    angles.push('STRUCTURE : décris les effets en cascade et causes racines (multi-niveaux)');
  }
  if (structKeys.includes('decision_action') || structKeys.includes('risque')) {
    angles.push('ACTION : donne 3-5 étapes concrètes immédiates priorisées par urgence');
  }
  if (structKeys.includes('hypothese_cachee') || structKeys.includes('contradiction') || structKeys.includes('auditabilite')) {
    angles.push('VALIDATION : identifie les hypothèses cachées et indique ce qui doit être vérifié');
  }
  if (structKeys.includes('bornage') || structKeys.includes('compression_synthese')) {
    angles.push('BORNAGE : précise le périmètre exact, dis franchement les limites de ta réponse');
  }
  if (structKeys.includes('temporalite')) {
    angles.push('TEMPS : distingue court terme (urgence) vs long terme (vieillissement, dérive)');
  }
  if (angles.length === 0) {
    angles.push('Réponse standard structurée');
  }

  // Top lois (max 5) pour cadrage silencieux
  const flatLaws = [];
  for (const ls of Object.values(lawsByStrategy)) {
    if (Array.isArray(ls)) flatLaws.push(...ls);
  }
  const uniqLaws = [...new Map(flatLaws.map(l => [l.id, l])).values()].slice(0, 5);
  const lawsCtx = uniqLaws.map(l => `• ${l.title || l.id}`).join('\n') || '(aucune)';

  const domLabel = domain?.label || 'généraliste';
  const domVocab = domain?.vocab_hint || 'vocabulaire courant';
  const domStyle = domain?.cognitive_style || 'réponse claire et structurée';

  // Mission ADAPTIVE_TRANSPARENCY + RANKING_BIAS_CORRECTION :
  // 2 axes orthogonaux :
  //   - profondeur intrinsèque question (low_intrinsic / standard)
  //   - profil utilisateur (expert_ai → minimal forcé / expert_novice_ai → transparent / etc.)
  const lid = detectLowIntrinsicDepth(question);
  const profileCfg = getProfileConfig();

  // Si profil expert_ai → toujours minimal, peu importe la question
  // Si profil expert_novice_ai sur question simple → minimal mais auto-doute visible
  const forceMinimal = profileCfg.response_mode === 'minimal' || lid.low_intrinsic;

  if (forceMinimal) {
    const isNoviceProfile = profileCfg.show_self_doubt;
    const minimalSystem = [
      `Tu es un EXPERT du domaine "${domLabel}".`,
      lid.low_intrinsic ? `Question à faible profondeur intrinsèque (${lid.reasons.join(' / ')}).` : '',
      `Profil utilisateur : ${isNoviceProfile ? 'expert métier, novice IA (besoin de voir tes hésitations)' : 'expert IA (vitesse + densité)'}`,
      '',
      '═══ MODE RÉPONSE MINIMALE ═══',
      '1. RÉPONSE COURTE : 2-5 phrases maximum (calcul + résultat).',
      '2. AUCUNE digression : pas de CO₂, pollution, comparaisons gratuites, lacs, fleuves',
      '   sauf si la question les demande EXPLICITEMENT.',
      '3. AUCUN CTA. Pas de "**CTA cohérents**". Pas de "futur cohérent".',
      '4. Vocabulaire : ' + domVocab,
      '',
      isNoviceProfile
        ? '═══ EXIGENCE PROFIL NOVICE IA — AUTO-DOUTE CALIBRÉ (PAS LITURGIQUE) ═══\n' +
          'Si pertinent UNIQUEMENT, ajoute UNE phrase courte sur ton niveau de confiance.\n' +
          'CALIBRER selon contexte :\n' +
          '  - règle de trois simple → "Calcul vérifiable." (1 fois OK)\n' +
          '  - estimation/ordre grandeur → "Ordre de grandeur ±20%."\n' +
          '  - info temporelle → "À vérifier selon source/date."\n' +
          '  - spéculation → "Hypothèse non confirmée."\n' +
          '  - médecine/juridique → niveau de confiance détaillé\n' +
          'INTERDIT : tic systématique "je peux me tromper" sur chaque réponse.\n' +
          'INTERDIT : "à vérifier" décoratif sans nommer ce qu\'il faut vérifier.\n' +
          'Si la réponse est certaine (fait établi, calcul direct), PAS d\'auto-doute.'
        : 'Pas d\'auto-doute affiché. User expert IA sait évaluer lui-même.',
      '',
      'EXEMPLE (expert_novice_ai, question piscines) :',
      '  "Surface 361×10⁶ km² × 10⁻⁶ m = 3,61×10⁸ m³ ÷ 2500 m³/piscine ≈ 144 400 piscines.',
      '   Calcul direct vérifiable. Approximation ±30% selon profondeur piscine retenue (2 ou 3 m)."',
    ].filter(Boolean).join('\n');
    return await callLLM({ system: minimalSystem, user: question, maxTokens: 1200 });
  }


  const system = [
    `Tu es un EXPERT du domaine "${domLabel}". Tu réponds dans le LANGAGE NATIF de ce domaine.`,
    `Vocabulaire attendu : ${domVocab}.`,
    `Style cognitif attendu : ${domStyle}.`,
    '',
    '╔══════════════════════════════════════════════════════════════════╗',
    '║ EXIGENCE FORMAT PRIORITAIRE — APPLIQUER AVANT TOUTE AUTRE RÈGLE  ║',
    '╠══════════════════════════════════════════════════════════════════╣',
    '║ Insère 3 à 5 markers {cta:label | détail} dans le CORPS de ta    ║',
    '║ réponse. Le label apparaîtra surligné cliquable, le détail dans  ║',
    '║ une info-bulle au clic. SANS CES MARKERS, LA RÉPONSE EST INVALIDE║',
    '╚══════════════════════════════════════════════════════════════════╝',
    '',
    'EXEMPLE COMPLET de réponse ZORAN attendue (à imiter strictement) :',
    '',
    'Question : "fissures murs en escalier maison 1975 sécheresse"',
    'Réponse :',
    '',
    'Suspecter retrait-gonflement des argiles. Faire poser sous 1 mois une',
    '{cta:Étude G2 PRO | NF P 94-500 impose étude géotechnique de conception',
    'en zone exposée. Sondages 3-6 m, mesure du potentiel Vbs et Ip. Coût',
    '2500-5000€, délai 4-6 semaines. Document opposable à l\'assureur.}',
    'et installer des {cta:Jauges Saugnac | Pose de fissuromètres tous les',
    '50 cm le long des fissures actives. Lecture mensuelle pendant 6 mois.',
    'Évolution > 0.5 mm/mois confirme RGA actif.}. Documenter par',
    '{cta:Constat photographique daté | Photos en lumière rasante chaque mois,',
    'mêmes points de prise de vue, mire graduée visible. Pièce probante pour',
    'expertise contradictoire ou recours assurance.}. Limite : diagnostic',
    'définitif requiert visite géotechnicien sur site.',
    '',
    '---',
    '**CTA cohérents** :',
    '1. *(futur cohérent)* — Si fissures évolutives confirmées, micropieux ou',
    '   reprise en sous-œuvre deviennent envisageables (60-150k€).',
    '2. *(validation)* — Mesure de l\'humidité du sol à 1 m par carottage',
    '   trancherait entre cause RGA et infiltration.',
    '3. *(contre-piste)* — Et si c\'était une fuite réseau enterré ?',
    '   Test à la fluorescéine sur les canalisations enterrées.',
    '',
    '── FIN EXEMPLE ──',
    '',
    'Cadres cognitifs activés MENTALEMENT (à ne JAMAIS citer dans la réponse) :',
    lawsCtx,
    parents.length ? `Lois parentes silencieuses : ${parents.slice(0, 3).join(', ')}` : '',
    '',
    '═══ ANGLES À ARTICULER (sans les nommer textuellement) ═══',
    ...angles.map(a => '  • ' + a),
    '',
    '═══ RÈGLES STRICTES ═══',
    '1. Vocabulaire 100% du domaine — PAS de "loi", "cadre", "S_local", "propagation",',
    '   "frugalité", "WP11/12", "GHUC", "PAL", IDs de lois (etc.).',
    '2. 4-7 phrases denses. Hiérarchise : urgence d\'abord, contexte ensuite, limites en clôture.',
    '3. Si tu ne sais pas factuellement (date, jurisprudence précise, calcul réglementaire),',
    '   DIS-LE FRANCHEMENT au lieu d\'inventer. Renvoie vers l\'expert humain compétent.',
    '4. TERMINE TA RÉPONSE — pas de phrase coupée, conclusion claire.',
    '5. Évite "intéressant", "fascinant", "très cohérent" (promotionnel).',
    '',
    '═══ CTA INLINE CLIQUABLES — OBLIGATOIRE (3 à 5 markers) ═══',
    'Tu DOIS insérer 3 à 5 markers INLINE dans le corps de ta réponse, format :',
    '  {cta:label court | détail enrichi multi-phrases pour info-bulle}',
    '',
    'Le LABEL (avant le `|`) est le texte qui apparaîtra surligné dans la réponse.',
    'Le DÉTAIL (après le `|`) est ce qui s\'affichera dans une info-bulle au clic :',
    'c\'est le complément de raisonnement / l\'angle exploratoire que tu n\'as PAS',
    'pu développer dans le corps faute de place. C\'est de la VALEUR AJOUTÉE,',
    'pas une paraphrase du label. 2 à 4 phrases denses, spécifiques au sujet.',
    '',
    'Exemple BTP :',
    '  "Suspecter RGA argile gonflante.',
    '   {cta:Étude G2 PRO | NF P 94-500 impose étude géotechnique de conception en',
    '    zone exposée. Sondages 3 à 6 m, identification du potentiel de retrait-gonflement',
    '    (Vbs, Ip). Coût ≈ 2500-5000 €, délai 3-6 semaines. Sans cette étude, la garantie',
    '    décennale peut être contestée par l\'assureur.}',
    '   sous 1 mois. {cta:Jauges fissuromètres | Pose de jauges Saugnac ou équivalent',
    '   tous les 50 cm le long des fissures actives. Lecture mensuelle pendant 6 mois,',
    '   tracé d\'évolution. Si > 0.5 mm/mois ou ouverture saisonnière franche → confirmation',
    '   du mécanisme RGA, contre-indication aux interventions cosmétiques.}',
    '   Diagnostic à confirmer."',
    '',
    'Exemple générique (calcul) :',
    '  "Volume estimé : ≈144 000 piscines olympiques.',
    '   {cta:Recalcul profondeur 3m | Avec une profondeur de 3 m au lieu de 2 m, le volume',
    '   unitaire passe de 2500 à 3750 m³, donc le nombre tombe à ≈96 000. L\'écart de 50 %',
    '   illustre la sensibilité à un paramètre unique. Choisir 2 m correspond aux piscines',
    '   olympiques certifiées FINA, pas aux bassins de profondeur variable.}',
    '   Ordre de grandeur ±30%."',
    '',
    'Règles strictes :',
    '- 3 à 5 markers OBLIGATOIRES dans le corps (pas dans le bloc terminal **CTA cohérents**)',
    '- LABEL : 2 à 6 mots, s\'intègre dans la phrase de façon naturelle',
    '- DÉTAIL : 2 à 4 phrases, APPORTE quelque chose que le corps n\'a pas dit',
    '- Format STRICT : {cta:label | détail} avec UN SEUL `|` séparateur',
    '- Pas de markdown dans le détail (texte brut)',
    '- Pas de {CTA:...}, pas de [cta:...], pas d\'espaces autour des `:`',
    '',
    '═══ LOI SDE-029 — 3 CTA TERMINAUX OBLIGATOIRES ═══',
    'TERMINE OBLIGATOIREMENT par 3 CTA dans CE FORMAT STRICT exact :',
    '',
    '---',
    '**CTA cohérents** :',
    `1. *(futur cohérent — adapté à ${domLabel})* — formulation tentative ouvrant exploration`,
    '2. *(validation — signe observable)* — quelle mesure/observation trancherait',
    '3. *(contre-piste — alternative)* — quelle hypothèse reste ouverte',
    '',
    'Règles CTA :',
    '- 1-2 phrases max chacun',
    '- spécifiques au sujet, pas génériques',
    '- tentatifs ("on pourrait…", "une piste serait…"), pas dogmatiques',
    '- ancrés au domaine traité',
    '',
    'EXEMPLE BTP "supprimer murs porteurs" :',
    '  ✗ "préserver l\'invariance morphologique en propageant les charges"',
    '  ✓ "Étape 1 : étude structure obligatoire par BET (calcul descente charges + section IPN/IPE).',
    '     Étape 2 : déclaration préalable en mairie. Étape 3 : bureau de contrôle pour validation',
    '     calculs avant exécution. Sans étude → risque effondrement + nullité garantie décennale.',
    '     Limite : dimensionnement exact dépend de la charge réelle, non calculable à distance."',
  ].filter(Boolean).join('\n');

  return await callLLM({ system, user: question, maxTokens: 4000 });
}

// Mission RUNTIME_SUPERIORITY : LLM brut sans contexte ZORAN
export async function synthesizeBaseline(question) {
  return await callLLM({
    system: 'Tu es un assistant. Réponds à la question en 4-6 phrases denses en français, sans markdown. TERMINE TA RÉPONSE COMPLÈTEMENT — pas de phrase coupée.',
    user: question,
    maxTokens: 2500,
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
    '',
    '═══ TERMINE TA RÉPONSE — pas de phrase coupée, conclusion claire ═══',
  ].join('\n');
  return await callLLM({ system, user: question, maxTokens: 3500 });
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
  // Le JSON judge contient strengths/weaknesses détaillés par candidat (cap large pour éviter cut JSON).
  const judgeMaxTokens = responses.length <= 2 ? 3000
                       : responses.length === 3 ? 4000 : 5000;
  const r = await callLLM({ system, user, maxTokens: judgeMaxTokens });
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
        max_tokens: 3500,
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
      stop_reason: data.stop_reason,
      truncated: data.stop_reason === 'max_tokens',
    };
  } catch (err) {
    return { ok: false, reason: 'network', message: err.message };
  }
}
