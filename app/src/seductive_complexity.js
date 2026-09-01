// app/src/seductive_complexity.js
// Mission V5 — SEDUCTIVE_COMPLEXITY_PENALTY
//
// Détecte les réponses qui paraissent intelligentes par densité
// technique artificielle : mots longs, vocabulaire rare, sentences
// complexes, terminologie pédante — SANS structure utile (actions,
// hiérarchie, chiffres concrets).
//
// Pattern adversarial : une réponse peut tromper le scoring V1-V4
// en empilant du vocabulaire sophistiqué tout en restant vide.
// Cette métrique pénalise cette stratégie.
//
// Inputs : texte + scores existants (jargon, actions, etc.)
// Output : { score: [0..1], evidence, hint }
//   score haut = complexité artificielle suspecte

// Mots rares / pédants (≥ 11 lettres, latin/grec savant)
const PEDANTIC_LONG_WORDS_RX = /\b\w{12,}\b/g;
// Tournures intellectuelles peu utiles
const INTELLECTUAL_FILLERS_RX = /\b(paradigme|épistémique|ontologique|herméneutique|téléologique|axiomatique|tautologique|isomorphique|fractal\w*|résonan\w*|systémolog|méta.?théorique|méta.?cognitif|méta.?systémique|holistique|émergence|émerger)\b/gi;
// Phrases longues (> 40 mots = soupçon)
function avgSentenceLengthWords(text) {
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sents.length === 0) return 0;
  const lens = sents.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  return lens.reduce((a, b) => a + b, 0) / lens.length;
}
// Marqueurs d'utilité concrète (annulent la pénalité)
const CONCRETE_UTILITY_RX = /\b(\d+(?:[,.]\d+)?\s*(%|m|m²|m³|cm|mm|kg|°C|€|h|min|jours?|ans?|mois)|étape\s+\d|priorité\s+\d|niveau\s+\d|vérifi(er|cation)|mesurer|appliquer|installer|remplacer|tester)\b/gi;

/**
 * SEDUCTIVE_COMPLEXITY_PENALTY [0..1] — pénalise densité technique
 * artificielle quand peu d'utilité concrète.
 */
export function seductiveComplexity(text) {
  if (!text || text.length < 100) {
    return { score: 0, evidence: [], hint: '' };
  }
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const pedanticWords = (text.match(PEDANTIC_LONG_WORDS_RX) || []).length;
  const intellectualFillers = (text.match(INTELLECTUAL_FILLERS_RX) || []).length;
  const avgSentLen = avgSentenceLengthWords(text);
  const concreteUtility = (text.match(CONCRETE_UTILITY_RX) || []).length;

  // Densité de complexité : mots longs + fillers
  const complexityDensity = (pedanticWords + intellectualFillers * 2) / Math.max(20, words);
  // Bonus phrases longues
  const sentenceLengthBonus = avgSentLen > 35 ? 0.20 : avgSentLen > 25 ? 0.10 : 0;
  // Discount selon utilité concrète (annule la pénalité)
  const utilityDiscount = Math.min(0.6, concreteUtility / Math.max(5, words / 50) * 0.30);

  const rawScore = Math.min(1, complexityDensity * 5 + sentenceLengthBonus);
  const score = +Math.max(0, Math.min(1, rawScore - utilityDiscount)).toFixed(3);

  return {
    score,
    evidence: score >= 0.30 ? [
      `${pedanticWords} mots ≥12 lettres, ${intellectualFillers} fillers intellectuels`,
      `phrase moy ${avgSentLen.toFixed(1)} mots`,
      `${concreteUtility} marqueurs concrets`,
    ] : [],
    hint: score >= 0.40
      ? `Complexité artificielle suspecte : ${pedanticWords} mots savants, ${concreteUtility} actions concrètes seulement. Simplifier vocabulaire, ajouter chiffres/actions.`
      : '',
    word_count: words,
    pedantic_words: pedanticWords,
    intellectual_fillers: intellectualFillers,
    avg_sentence_length: +avgSentLen.toFixed(1),
    concrete_utility: concreteUtility,
  };
}
