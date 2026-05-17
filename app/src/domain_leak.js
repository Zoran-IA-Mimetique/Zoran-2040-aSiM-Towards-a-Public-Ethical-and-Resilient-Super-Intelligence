// app/src/domain_leak.js
// Mission V4 — DOMAIN_LEAK_KILLER
//
// Détecte les patterns destructeurs d'immersion :
//   "Désolé, ce n'est pas du BTP."
//   "Cette question ne relève pas de ma spécialité."
//   "Je ne peux pas répondre à cela."
//   "Hors de mon domaine."
//
// Ces patterns sont catastrophiques en runtime :
//   - cassent l'immersion utilisateur
//   - démontrent un échec du routing en amont
//   - produisent une réponse zéro-valeur
//   - signalent un refus de service quand un refus de service n'est pas pertinent
//
// Distinction importante : NE PAS PÉNALISER les refus légitimes (sécurité,
// éthique, ressources insuffisantes). Pénaliser uniquement les refus dûs
// à une mauvaise détection de domaine.

const DOMAIN_REFUSAL_RX = /\b(désolé[,\s]+(ce|cette|cela)?\s*(n['']est|ne (relève|fait|porte))|ce n['']est pas (mon |ma |du |de la |de l['']|un sujet)|hors (de )?(mon |ma )?(domaine|compétence|spécialité|expertise)|pas (ma|mon) (spécialité|domaine|expertise)|cette question ne (relève|porte|concerne) pas|je ne peux pas répondre à (cette|ce)|sortir de mon (champ|domaine)|en dehors de (mes|ma) (compétences|spécialité))\b/gi;

const SELF_DEFLECTION_RX = /\b(je ne suis pas (un |une )?(expert|spécialiste|qualifié|compétent)|consultez un (vrai |véritable )?(expert|spécialiste|professionnel)|adressez.?vous à|orientez.?vous vers|reportez.?vous à)/gi;

const META_APOLOGY_RX = /\b((je suis )?désolé\w*|veuillez (m['']excuser|pardonner)|excusez.?moi|toutes mes excuses|mes excuses)\b/gi;

const REFUSAL_INTRO_RX = /^[\s\S]{0,150}\b(désolé|hélas|malheureusement|je crains|je regrette|je ne (peux|pourrai))/i;

/**
 * Détecte les patterns de "fuite de domaine" — la réponse refuse de
 * répondre alors que la question est légitime.
 *
 * @param {string} text - réponse à analyser
 * @param {object} ctx  - { question, domain (optionnel) }
 * @returns { leak_detected, score, evidence, hint }
 */
export function detectDomainLeak(text, ctx = {}) {
  if (!text) return { leak_detected: false, score: 0, evidence: [], hint: '' };

  const refusals = (text.match(DOMAIN_REFUSAL_RX) || []);
  const deflections = (text.match(SELF_DEFLECTION_RX) || []);
  const apologies = (text.match(META_APOLOGY_RX) || []);
  const introRefusal = REFUSAL_INTRO_RX.test(text);

  // Score : refus en intro = très grave (toute la réponse est gâchée),
  // refus n'importe où dans le texte = modéré.
  let score = 0;
  if (introRefusal) score += 0.50;
  score += Math.min(0.30, refusals.length * 0.20);
  score += Math.min(0.20, deflections.length * 0.10);
  score += Math.min(0.10, Math.max(0, apologies.length - 1) * 0.05);
  score = +Math.min(1, score).toFixed(3);

  const leak_detected = score >= 0.30;

  const evidence = [];
  if (introRefusal) evidence.push('refus en intro (premier 150 chars)');
  if (refusals.length > 0) evidence.push(`${refusals.length} refus domaine: "${refusals[0]}"`);
  if (deflections.length > 0) evidence.push(`${deflections.length} auto-déflection: "${deflections[0]}"`);
  if (apologies.length >= 2) evidence.push(`${apologies.length} excuses méta`);

  return {
    leak_detected,
    score,
    evidence,
    hint: leak_detected
      ? `Réponse en refus de domaine. La question doit être routée vers une route compétente, pas refusée. Reformuler en répondant au fond.`
      : '',
  };
}
