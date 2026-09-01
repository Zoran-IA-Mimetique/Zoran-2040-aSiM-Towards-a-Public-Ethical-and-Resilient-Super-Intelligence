// app/src/causal_density.js
// Mission V10 — DENSITÉ CAUSALE vs DENSITÉ LEXICALE
//
// Réponse au diagnostic V10 :
// btpOperationalScore V9.1 rankait JARGON_DECORATIF #1 et
// VRAI_TERRAIN_SANS_JARGON #6 (drift +5 / -4). Le scoring mesurait
// la rhétorique technique, pas l'expertise causale.
//
// 3 métriques correctives :
//   1. causal_compression_ratio    — densité causale par mot
//   2. useless_jargon_penalty      — jargon sans rôle causal
//   3. discriminant_measure_density — mesures qui trancheraient vraiment

// ─── MARQUEURS CAUSAUX (compactent l'analyse) ───
const CAUSAL_LINK_RX = /\b(suspecter|confirmer|à cause de|parce que|car|en raison de|provoqu\w+|entra[iî]n\w+|résult\w+ de|d[ûu] à|d[oôò] à|cause (dominante|racine|principale|probable)|hypothèse (dominante|alternative|principale)|si confirmé|à vérifier|évoque|signe de|suggère|indique|implique|conduit à|aboutit à|étape \d|sous \d+ (jours?|mois|semaines?)|sinon|à condition que|sous réserve|sans (quoi|quoi))\b/gi;

const COUNTERFACTUAL_RX = /\b(contre.?hypothèse|et si|sinon|à l'inverse|au contraire|mais aussi|alternative|à écarter|à confirmer|sauf si|à moins que|hypothèse à valider|si erroné|si infirmé)\b/gi;

const HIERARCHY_DECISION_RX = /\b(étape \d|d['']abord|en premier|priorité \d|prioritaire|urgent|immédiat\w*|sous (\d+ )?(jours?|h|semaines?|mois)|si.*alors|si confirmé|à \d+ mois|niveau \d)\b/gi;

// ─── MESURES DISCRIMINANTES (trancheraient entre hypothèses) ───
// Mesures avec spécificité élevée : instrument + cible + seuil
const DISCRIMINANT_MEASURE_RX = /\b(sondage (CPT|pressiométrique|destructif|carottage)( à \d+m?)?|humidimètre (à pointes?|Protimeter)|fissuromètre( étalonné)?|caméra thermique( infrarouge)?|inclinomètre|piézomètre|essai pénétrométrique|carottage béton|témoin (papier|plâtre|verre)|extensométrie|corrélation saisonnière|note de calcul Eurocode|G2 PRO|relevé topographique|relevé géomètre|analyse alcali.?réaction|test infiltrométrie|Q4Pa|n50|infrarouge ΔT)\b/gi;

// Mesures vagues / non-discriminantes (faux signal d'expertise)
const VAGUE_MEASURE_RX = /\b(faire un audit( général)?|vérifier|inspecter visuellement|prendre des photos|demander (un|des|\d+) devis?|consulter (le |la |un |une )?(spécialiste|expert|professionnel)|appeler quelqu['']un|surveiller|garder un œil|regarder|examiner)\b/gi;

// ─── JARGON DÉCORATIF (termes techniques sans rôle causal proche) ───
// On considère qu'un terme jargon est "utile" s'il est suivi/précédé
// d'un marqueur causal dans une fenêtre de 50 caractères.
const TECHNICAL_JARGON_RX = /\b(IPN|HEA|HEB|UPN|UAP|module de Young|fluage|fatigue|contreventement|moment fléchissant|effort tranchant|cisaillement|flambement|Eurocode\s*\d?|DTU\s*\d+(?:\.\d+)?|NF\s*(?:P|EN|C)\s*\d+|alcali.?réaction|RAG|RAS|carbonatation|étiopathogénie|tableau pathologique|psi(?:-value)?|HbA1c|surrogate endpoint)\b/gi;

// ─── METRICS ───

/**
 * CAUSAL_COMPRESSION_RATIO [0..1]
 * Mesure la densité de marqueurs causaux + décisionnels par mot.
 * Haut = compact et causal (expert), bas = verbeux sans causalité.
 */
export function causalCompressionRatio(text) {
  if (!text || text.length < 30) return 0;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const causal = (text.match(CAUSAL_LINK_RX) || []).length;
  const counterfactual = (text.match(COUNTERFACTUAL_RX) || []).length;
  const hierarchy = (text.match(HIERARCHY_DECISION_RX) || []).length;
  // Marqueurs pondérés : causal direct (1.0), contrefactuel (1.5), hiérarchie (0.8)
  const weightedSignal = causal + counterfactual * 1.5 + hierarchy * 0.8;
  // Densité brute : signal / words, normalisée par 0.10 (10 marqueurs / 100 mots = max)
  const density = weightedSignal / Math.max(20, words);
  return +Math.min(1, density / 0.10).toFixed(3);
}

/**
 * DISCRIMINANT_MEASURE_DENSITY [0..1]
 * Ratio de mesures spécifiques (qui trancheraient) sur total des mesures mentionnées.
 * Haut = mesures discriminantes ciblées, bas = liste vague ou exhaustive.
 */
export function discriminantMeasureDensity(text) {
  if (!text || text.length < 30) return 0;
  const discriminant = (text.match(DISCRIMINANT_MEASURE_RX) || []).length;
  const vague = (text.match(VAGUE_MEASURE_RX) || []).length;
  const total = discriminant + vague;
  if (total === 0) return 0;
  // Ratio brut, bonus si au moins 1 mesure discriminante avec spécification
  const ratio = discriminant / total;
  // Bonus pour spécification quantitative (ex: "CPT à 2/4m", "fissuromètre 6 mois")
  const quantified = (text.match(/\b(à \d+m|\d+\s*mois|\d+\s*jours|\d+\s*Nm|\d+\s*MPa|\d+\s*°C|\d+\s*points?|Q\dPa|n50)\b/gi) || []).length;
  const quantifiedBonus = Math.min(0.20, quantified * 0.05);
  return +Math.min(1, ratio + quantifiedBonus).toFixed(3);
}

/**
 * USELESS_JARGON_PENALTY [0..1]
 * Mesure la proportion de jargon technique SANS rôle causal proche.
 * Haut = beaucoup de jargon décoratif (mauvais), bas = jargon justifié.
 */
export function uselessJargonPenalty(text) {
  if (!text || text.length < 30) return 0;
  const jargonMatches = [...text.matchAll(TECHNICAL_JARGON_RX)];
  if (jargonMatches.length === 0) return 0;
  // Pour chaque jargon trouvé, on vérifie si un marqueur causal apparaît
  // dans une fenêtre de ±60 caractères autour de lui.
  let useful = 0;
  let useless = 0;
  // Réutilise regex globalement
  CAUSAL_LINK_RX.lastIndex = 0;
  const causalPositions = [];
  let m;
  while ((m = CAUSAL_LINK_RX.exec(text)) !== null) {
    causalPositions.push(m.index);
  }
  for (const j of jargonMatches) {
    const jPos = j.index;
    const nearbyCausal = causalPositions.some(c => Math.abs(c - jPos) < 80);
    if (nearbyCausal) useful++;
    else useless++;
  }
  // Pénalité : proportion de jargon orphelin (sans causalité proche)
  const ratio = useless / jargonMatches.length;
  // Amplifié par densité : 5+ jargons orphelins = max
  const densityWeight = Math.min(1, useless / 4);
  return +Math.min(1, ratio * densityWeight).toFixed(3);
}

/**
 * HYPOTHESIS_REDUCTION_SCORE [0..1]
 * Un vrai expert RÉDUIT l'espace des hypothèses (élimine, priorise).
 * Un faux expert l'AGRANDIT (liste sans hiérarchie).
 */
export function hypothesisReductionScore(text) {
  if (!text || text.length < 30) return 0;
  // Marqueurs d'élimination/priorisation
  const reduction = (text.match(/\b(éliminer|écarter|exclure|peu probable|improbable|hypothèse dominante|cause (dominante|principale|prépondérante|première)|le plus probable|en priorité|d['']abord|étape 1|principal\w*|probable mais à confirmer)\b/gi) || []).length;
  // Marqueurs d'accumulation sans hiérarchie
  const accumulation = (text.match(/\b(de nombreux|de multiples|plusieurs (causes|hypothèses|facteurs)|divers|différents|tout (un|une|le|la) (ensemble|panel)|cela peut être|il y a beaucoup|il existe (de )?(nombreuses?|multiples?))\b/gi) || []).length;
  const signal = reduction - accumulation * 0.5;
  if (signal <= 0) return 0;
  return +Math.min(1, signal / 4).toFixed(3);
}

/**
 * CAUSAL_DENSITY composite — V10 anti-rhétorique.
 * Combine les 4 métriques pour un score unique qui devrait favoriser
 * EXPERT_COURT et pénaliser JARGON_DECORATIF.
 *
 * Formule :
 *   0.30 × causal_compression_ratio
 * + 0.25 × discriminant_measure_density
 * + 0.20 × hypothesis_reduction
 * - 0.25 × useless_jargon_penalty  (pénalité)
 */
export function causalDensityScore(text) {
  const ccr = causalCompressionRatio(text);
  const dmd = discriminantMeasureDensity(text);
  const ujp = uselessJargonPenalty(text);
  const hrs = hypothesisReductionScore(text);
  const composite = +(
    0.30 * ccr
    + 0.25 * dmd
    + 0.20 * hrs
    - 0.25 * ujp
  ).toFixed(3);
  // Borne [0, 1]
  const bounded = Math.max(0, Math.min(1, composite));
  return {
    score: +bounded.toFixed(3),
    components: {
      causal_compression_ratio: ccr,
      discriminant_measure_density: dmd,
      useless_jargon_penalty: ujp,
      hypothesis_reduction: hrs,
    },
    verdict: bounded >= 0.50 ? 'high_causal_density'
           : bounded >= 0.30 ? 'moderate'
           : bounded >= 0.15 ? 'low'
           : 'rhetoric_only',
  };
}
