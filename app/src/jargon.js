// app/src/jargon.js
// Mission ZORAN_SILENT_LAW_GUIDANCE_AND_CONCRETE_RUNTIME_ALIGNMENT_20260516
//
// Mesure quantitative du méta-bruit ZORAN dans une réponse LLM :
//   - jargon_density   : ratio de mots jargon ZORAN sur total mots
//   - user_distance    : 1 - overlap lexical entre réponse et question (domaine user)
//   - practical_usefulness : heuristique d'actionnabilité (verbes d'action concrets)
//   - meta_noise composite : jargon + abstraction + auto-référence
//
// Tous les scores ∈ [0..1]. Plus bas = mieux pour jargon/meta/distance.

// Termes ZORAN à proscrire de la réponse utilisateur standard
const JARGON_LIST = [
  // Familles
  'ulg', 'dve', 'ude', 'ghuc', 'wp11', 'wp12', 'sde', 'pal',
  // Métriques internes
  's_local', 's_global', 'hs', 'topic_relevance', 'propagation_cost',
  'frugality_score', 'velocity_score', 'attractor_tier', 'superior_law',
  // Méta-concepts
  'invariance morphologique', 'cohérence multi-cadres', 'palier cognitif',
  'attracteur', 'cadre cognitif', 'lentille cognitive', 'sous-graphe',
  'compositionnel', 'discovery sandbox', 'oracle adaptive',
  // ID patterns (compté séparément par regex)
];

// Regex pour détecter les ID de lois ZORAN (WP11-008, GHUC-002-a-i, etc.)
const LAW_ID_RX = /\b(ULG|DVE|UDE|GHUC|WP1[12]|SDE|PAL)-\d{1,3}(-[a-z](-[iv]+)?)?\b/gi;

// Mots-outils français à exclure du calcul user_distance (stopwords)
const STOPWORDS = new Set([
  'le','la','les','de','du','des','un','une','et','ou','à','au','aux',
  'en','dans','sur','par','pour','avec','sans','que','qui','quoi','dont',
  'ce','cet','cette','ces','mon','ma','mes','ton','ta','tes','son','sa','ses',
  'notre','votre','leur','leurs','je','tu','il','elle','nous','vous','ils','elles',
  'est','sont','être','a','ont','avoir','fait','faire','peut','peuvent','doit','doivent',
  'plus','moins','très','aussi','encore','déjà','si','non','oui','pas','ne','ni',
  'mais','donc','car','or','alors','aussi','puis','ensuite','d','l','s','t','n','m','c','j',
]);

function tokens(text) {
  if (!text) return [];
  return String(text).toLowerCase()
    .replace(/[.,;:!?()[\]{}"«»'']/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

/**
 * Densité de jargon ZORAN dans une réponse [0..1].
 * 0 = aucun jargon, ~0.05 = acceptable, >0.10 = pollué.
 */
export function jargonDensity(text) {
  if (!text) return 0;
  const lower = String(text).toLowerCase();
  const toks = tokens(text);
  if (!toks.length) return 0;
  let jargonHits = 0;
  // Compte les termes jargon (single + multi-word)
  for (const term of JARGON_LIST) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = lower.match(rx);
    if (matches) jargonHits += matches.length;
  }
  // Compte les IDs de lois (WP11-008, GHUC-002-a-i, etc.)
  const ids = String(text).match(LAW_ID_RX);
  if (ids) jargonHits += ids.length;
  // Densité = hits / total mots (capé à 1.0)
  return Math.min(1.0, jargonHits / Math.max(10, toks.length));
}

/**
 * Distance lexicale entre la réponse et le domaine de la question [0..1].
 * 0 = réponse utilise le vocabulaire de la question (proche du domaine user).
 * 1 = réponse complètement étrangère au vocabulaire question.
 */
export function userDistance(answerText, questionText) {
  if (!answerText || !questionText) return 0.5;
  const qTokens = new Set(tokens(questionText).filter(t => !STOPWORDS.has(t)));
  const aTokens = tokens(answerText).filter(t => !STOPWORDS.has(t));
  if (!qTokens.size || !aTokens.length) return 0.5;
  // Combien de mots-clés de la question apparaissent dans la réponse
  let overlap = 0;
  const aSet = new Set(aTokens);
  for (const q of qTokens) if (aSet.has(q)) overlap++;
  const ratio = overlap / qTokens.size;
  return Math.max(0, Math.min(1, 1 - ratio));
}

/**
 * Utilité pratique heuristique [0..1] : présence de verbes d'action,
 * références concrètes, absence de pure abstraction.
 */
const ACTION_VERBS_RX = /\b(faire|vérifier|consulter|appeler|demander|contacter|étudier|analyser|mesurer|calculer|décider|choisir|sélectionner|installer|placer|poser|retirer|enlever|remplacer|réparer|construire|démolir|signer|valider|approuver|refuser|tester|essayer|appliquer|suivre|respecter|éviter|prévoir|anticiper|planifier|organiser|documenter|noter|enregistrer|sauvegarder|protéger|sécuriser|isoler|borner|limiter|réduire|augmenter)\b/gi;

export function practicalUsefulness(text) {
  if (!text) return 0;
  const toks = tokens(text);
  if (toks.length < 10) return 0.2;
  const actions = (text.match(ACTION_VERBS_RX) || []).length;
  // Densité de verbes d'action : 1 toutes les 20 mots = base good
  const actionDensity = Math.min(1.0, (actions / toks.length) * 20);
  // Pénalise longueur excessive (verbosité)
  const lengthPenalty = Math.min(1.0, 600 / Math.max(100, toks.length));
  return Math.max(0, Math.min(1, 0.5 * actionDensity + 0.5 * lengthPenalty));
}

/**
 * Méta-bruit composite [0..1] — plus bas = mieux.
 * 0.40 jargon + 0.40 user_distance + 0.20 (1 − practical)
 */
export function metaNoise({ answerText, questionText }) {
  const jd = jargonDensity(answerText);
  const ud = userDistance(answerText, questionText);
  const pu = practicalUsefulness(answerText);
  return Math.max(0, Math.min(1, 0.40 * jd + 0.40 * ud + 0.20 * (1 - pu)));
}

/**
 * Score composite "alignement runtime concret" [0..1] — plus haut = mieux.
 * Inverse partiel de meta_noise + bonus practical.
 */
export function concreteRuntimeAlignment({ answerText, questionText }) {
  const mn = metaNoise({ answerText, questionText });
  const pu = practicalUsefulness(answerText);
  return Math.max(0, Math.min(1, (1 - mn) * 0.7 + pu * 0.3));
}

/**
 * Détection rapide pour UI : retourne la liste des termes jargon
 * concrètement trouvés dans la réponse (pour warning visuel).
 */
export function detectJargonTerms(text) {
  if (!text) return [];
  const found = new Set();
  const lower = String(text).toLowerCase();
  for (const term of JARGON_LIST) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) found.add(term);
  }
  const ids = String(text).match(LAW_ID_RX);
  if (ids) for (const id of ids) found.add(id);
  return [...found];
}
