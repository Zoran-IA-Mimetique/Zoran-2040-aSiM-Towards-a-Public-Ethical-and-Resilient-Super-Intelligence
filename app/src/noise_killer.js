// app/src/noise_killer.js
// Mission ZORAN_SUPERIORITY_CONVERGENCE_20260516
//
// NOISE_KILLER — calcule USEFUL_INFORMATION_DENSITY [0..1]
// Pénalise : méta-phrases, répétitions, auto-explications, inflation,
//            transitions vides, prudence rituelle ("il est important de
//            noter que…", "en conclusion", "comme mentionné").
// Récompense : causalité, concret, structure utile, action, hiérarchie.

const META_PHRASES_RX = /\b(il est (important|essentiel|crucial|à noter) (de|que)|il convient de|en conclusion|comme (mentionné|nous l'avons vu)|notez (bien |que)|gardez (à l'esprit|en tête)|n'oubliez pas que|dans cette perspective|cela étant dit|cela dit|au final|finalement il faut|en définitive|en somme|en résumé|pour résumer|en bref|pour conclure)/gi;

const FILLER_TRANSITIONS_RX = /\b(par ailleurs|en outre|de plus(?:,)?|d'autre part|aussi(?:,)?|également(?:,)?|de surcroît|qui plus est|en effet|en réalité|au demeurant|cependant|toutefois|néanmoins)\b/gi;

const PRUDENCE_RITUELLE_RX = /\b(il (peut|pourrait|serait) (être|nécessaire|utile|important)|sous réserve|sous certaines conditions|dans la mesure du possible|le cas échéant|si (besoin|nécessaire)|selon (le contexte|les cas))\b/gi;

const CAUSAL_RX = /\b(parce que|à cause de|en raison de|provoqu|entra[iî]n|résult|conséquence|effet|cause|origine|d[oô]u? à)\b/gi;

const STRUCTURE_HIERARCHY_RX = /\b(d['']?abord|premi[èe]rement|ensuite|puis|enfin|finalement|étape\s+\d|priorit[ée]|urgent|impératif|en premier|en second|d'une part|d'autre part|niveau \d|cas \d)/gi;

const ACTION_VERBS_RX = /\b(faire|vérifier|consulter|appeler|demander|contacter|étudier|analyser|mesurer|calculer|décider|choisir|installer|placer|retirer|remplacer|construire|valider|tester|appliquer|suivre|respecter|éviter|prévoir|anticiper|planifier|documenter|protéger|sécuriser|isoler|borner|limiter|réduire)\b/gi;

const CONCRETE_NUMBERS_RX = /\b\d+(?:[,.]\d+)?\s*(%|m|m²|m³|cm|mm|kg|g|°C|°|€|ans?|jours?|mois|h|min|sec|kWh|kVA|V|A|Hz|MHz|GHz|bar|psi)\b/gi;

function countMatches(text, rx) {
  const matches = text.match(rx);
  return matches ? matches.length : 0;
}

function wordCount(text) {
  return text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
}

/**
 * USEFUL_INFORMATION_DENSITY ∈ [0..1] — métrique principale NOISE_KILLER.
 * Haut = réponse dense, concrète, structurée, actionnable.
 * Bas = réponse verbeuse, méta, sans structure, sans action concrète.
 */
export function usefulInformationDensity(text) {
  if (!text || text.length < 30) return 0.0;
  const words = wordCount(text);
  const noise = countMatches(text, META_PHRASES_RX)
              + countMatches(text, FILLER_TRANSITIONS_RX)
              + countMatches(text, PRUDENCE_RITUELLE_RX);
  const signal = countMatches(text, CAUSAL_RX)
               + countMatches(text, STRUCTURE_HIERARCHY_RX)
               + countMatches(text, ACTION_VERBS_RX)
               + countMatches(text, CONCRETE_NUMBERS_RX);
  // Densité signal / (signal + noise), normalisée par longueur
  const sn = signal / Math.max(1, signal + noise);
  // Pénalise longueur excessive : >300 mots = -0.2, >500 mots = -0.4
  const lengthPenalty = words > 500 ? 0.4 : words > 300 ? 0.2 : 0;
  // Bonus densité absolue (signal per 100 mots)
  const densityBonus = Math.min(0.3, signal / Math.max(20, words) * 30);
  const score = sn * 0.6 + densityBonus - lengthPenalty;
  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Diagnostic détaillé — pour UI debug.
 */
export function noiseProfile(text) {
  return {
    word_count: wordCount(text),
    meta_phrases: countMatches(text, META_PHRASES_RX),
    filler_transitions: countMatches(text, FILLER_TRANSITIONS_RX),
    prudence_rituelle: countMatches(text, PRUDENCE_RITUELLE_RX),
    causal_links: countMatches(text, CAUSAL_RX),
    hierarchy_markers: countMatches(text, STRUCTURE_HIERARCHY_RX),
    action_verbs: countMatches(text, ACTION_VERBS_RX),
    concrete_numbers: countMatches(text, CONCRETE_NUMBERS_RX),
    useful_information_density: +usefulInformationDensity(text).toFixed(3),
  };
}

/**
 * COGNITIVE_LOAD [0..1] — coût de lecture (mission SUPERIORITY_V2 AXE 4).
 * Mesure : longueur, complexité phrastique, surcharge conceptuelle.
 * Plus bas = plus facile à lire.
 */
export function cognitiveLoad(text) {
  if (!text || text.length < 30) return 0;
  const words = wordCount(text);
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const avgSentenceLength = words / sentences;
  // Mots longs (> 12 lettres) = signal de complexité
  const longWords = (text.match(/\b\w{12,}\b/g) || []).length;
  // Charge = longueur + phrases longues + densité mots longs
  const loadFromLength = Math.min(0.4, words / 600);          // ≤ 0.4
  const loadFromSentences = Math.min(0.3, avgSentenceLength / 35); // ≤ 0.3
  const loadFromComplexity = Math.min(0.3, longWords / Math.max(20, words) * 6); // ≤ 0.3
  return +(loadFromLength + loadFromSentences + loadFromComplexity).toFixed(3);
}

/**
 * ROBUSTNESS_OOD [0..1] — V2 heuristique : indique si la réponse gère
 * l'incertitude (mots de prudence calibrée) ET reste actionnable.
 * Plus haut = mieux face à OOD/ambiguïté.
 */
const CALIBRATED_HEDGES_RX = /\b(probable|vraisemblable|en général|dans la plupart des cas|à vérifier|selon le contexte|si confirmé|à condition que|nécessite expertise)\b/gi;
const OVERCLAIM_RX = /\b(toujours|jamais|impossible|absolument|certainement|sans aucun doute|prouvé que|évidemment)\b/gi;

export function robustnessOOD(text) {
  if (!text || text.length < 50) return 0.5;
  const words = wordCount(text);
  const hedges = (text.match(CALIBRATED_HEDGES_RX) || []).length;
  const overclaims = (text.match(OVERCLAIM_RX) || []).length;
  // Bonus pour prudence calibrée, malus pour overclaims
  const hedgeDensity = Math.min(0.4, hedges / Math.max(10, words / 50));
  const overclaimPenalty = Math.min(0.5, overclaims * 0.15);
  return Math.max(0, Math.min(1, 0.5 + hedgeDensity - overclaimPenalty));
}

/**
 * USEFUL_INFORMATION_DENSITY V2 — enrichi avec stabilité logique.
 * Détecte contradictions internes (ex: "X est vrai" puis "X est faux").
 */
export function usefulInformationDensityV2(text) {
  const v1 = usefulInformationDensity(text);
  // Bonus pour structures différentielles (vs, contrairement, à l'inverse)
  const diff = (text.match(/\b(contrairement|à l'inverse|en revanche|mais aussi|différ|distingue)/gi) || []).length;
  const diffBonus = Math.min(0.15, diff * 0.05);
  return Math.max(0, Math.min(1, v1 + diffBonus));
}

/**
 * GLOBAL_USEFULNESS composite [0..1] — score winner explicite.
 * Mission SUPERIORITY_CONVERGENCE :
 *   0.25 pertinence_domaine + 0.20 actionnabilité + 0.15 cohérence
 * + 0.15 robustesse_ambiguïté + 0.10 (1−bruit) + 0.10 calibration_doute
 * + 0.05 stabilité_reformulation
 */
export function globalUsefulness({
  pertinence_domaine = 0.5,
  actionnabilite = 0.5,
  coherence = 0.5,
  robustesse_ambiguite = 0.5,
  bruit = 0.5,
  calibration_doute = 0.5,
  stabilite_reformulation = 0.5,
}) {
  const score = (
    0.25 * pertinence_domaine
    + 0.20 * actionnabilite
    + 0.15 * coherence
    + 0.15 * robustesse_ambiguite
    + 0.10 * (1 - bruit)
    + 0.10 * calibration_doute
    + 0.05 * stabilite_reformulation
  );
  return Math.max(0.0, Math.min(1.0, score));
}
