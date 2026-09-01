// app/src/parsimony_detector.js
// Mission ZORAN_RUNTIME_RANKING_BIAS_CORRECTION_20260517
//
// Corrige le biais "richesse apparente" : pour une question simple
// (règle de trois, calcul direct, fait fermé), la meilleure réponse
// est la plus COURTE et CIBLÉE, pas la plus enrichie.
//
// Cas validé empiriquement : question "1 micron × surface océans = X piscines ?"
//   Humain : Claude brut 17/20 > ReZo 14 > Orchestré 12
//   ZORAN actuel : Orchestré 17 > ReZo 15.5 > Claude brut 15 (INVERSÉ)
//
// 4 fonctions :
//   1. detectLowIntrinsicDepth(question) — calcul/conversion/fait fermé
//   2. localSufficiency(text, question) — suffisance minimale
//   3. digressionPenalty(text, question) — concepts hors-scope introduits
//   4. computeParsimony(text, question) — composite

// ────────── 1. DÉTECTION QUESTION À FAIBLE PROFONDEUR INTRINSÈQUE ──────────

// Marqueurs de calcul direct / règle de trois
const CALCUL_DIRECT_RX = /\b(combien|quelle quantité|combien de|combien y a-t-il|combien (mesure|pèse|coûte|fait)|nombre de|quantité de|à combien|calcul|conversion|convertir)\b/i;
const CHIFFRES_DANS_QUESTION_RX = /\b\d+(?:[,.\s]\d+)*\s*(?:%|m|km|cm|mm|µm|micron|kg|g|tonne|°C|€|h|min|sec|jour|mois|an|m²|m³|km²|km³|piscine|litre|hectare)\b/i;
const FAIT_FERME_RX = /\b(qui est|qu['']est.?ce que|quand|où|combien|quel\w*\s+(est|sont)|c['']est quoi)\b/i;
const QUESTION_UNIQUE_RX = /^[^?]*\?\s*$/; // une seule question dans le texte
const SIMPLE_COMPARISON_RX = /\b(plus (grand|petit|long|court|lourd|léger) que|équivaut à|correspond à|représente)\b/i;

/**
 * Détecte si une question est à faible profondeur intrinsèque.
 * → règle de trois, conversion, calcul, fait fermé.
 */
export function detectLowIntrinsicDepth(question) {
  if (!question || question.length < 5) {
    return { low_intrinsic: false, score: 0, reasons: [] };
  }
  const reasons = [];
  let score = 0;

  if (CALCUL_DIRECT_RX.test(question)) {
    reasons.push('calcul direct ("combien")');
    score += 0.30;
  }
  if (CHIFFRES_DANS_QUESTION_RX.test(question)) {
    reasons.push('chiffres avec unités présents');
    score += 0.20;
  }
  if (FAIT_FERME_RX.test(question)) {
    reasons.push('pattern fait fermé');
    score += 0.20;
  }
  if (QUESTION_UNIQUE_RX.test(question.trim())) {
    reasons.push('question unique');
    score += 0.10;
  }
  if (SIMPLE_COMPARISON_RX.test(question)) {
    reasons.push('comparaison simple');
    score += 0.10;
  }
  // Pénalise les questions longues (probablement complexes)
  const wordCount = question.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 40) {
    score -= 0.30;
    reasons.push(`question longue (${wordCount} mots) → moins probable simple`);
  } else if (wordCount < 20) {
    score += 0.10;
    reasons.push(`question courte (${wordCount} mots)`);
  }

  score = Math.max(0, Math.min(1, score));
  return {
    low_intrinsic: score >= 0.40,
    score: +score.toFixed(3),
    reasons,
    word_count: wordCount,
  };
}

// ────────── 2. LOCAL SUFFICIENCY ──────────
// Détecte si la réponse va à l'essentiel sans surcharge.

const FORMULE_CALCUL_RX = /\b\d+[\d,.\s]*\s*(?:×|\*|÷|\/|\+|\-|=)\s*\d+|10\s*[⁰¹²³⁴⁵⁶⁷⁸⁹\^]/;
const RESULTAT_NUMERIQUE_RX = /\b≈?\s*\d+(?:[,.\s]\d+)*\s*(?:piscines?|m³|km³|kg|tonne|millions?|milliards?|%|°C|m|km|cm)\b/i;

/**
 * Mesure la suffisance locale : la réponse contient-elle le calcul
 * + le résultat, sans expansion excessive ?
 */
export function localSufficiency(text, question) {
  if (!text || text.length < 20) return { score: 0, evidence: [] };

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const lowIntrinsic = detectLowIntrinsicDepth(question);
  const hasFormule = FORMULE_CALCUL_RX.test(text);
  const hasResultat = RESULTAT_NUMERIQUE_RX.test(text);

  // Pour question simple : suffisance = présence formule + résultat / longueur
  if (!lowIntrinsic.low_intrinsic) {
    // Pas une question simple → pas pertinent
    return { score: 1.0, applicable: false, evidence: ['question complexe — sufficient non appliqué'] };
  }

  // Question simple : récompense COURT + COMPLET, pénalise LONG
  let score = 0;
  if (hasFormule) score += 0.30;
  if (hasResultat) score += 0.30;
  // Bonus brièveté
  const briefnessBonus = wordCount <= 80 ? 0.40
                        : wordCount <= 150 ? 0.20
                        : wordCount <= 250 ? 0.00
                        : -0.20;
  score += briefnessBonus;
  score = +Math.max(0, Math.min(1, score)).toFixed(3);

  return {
    score,
    applicable: true,
    has_formule: hasFormule,
    has_result: hasResultat,
    word_count: wordCount,
    briefness_bonus: briefnessBonus,
    evidence: [
      hasFormule ? '✓ formule présente' : '✗ pas de formule',
      hasResultat ? '✓ résultat chiffré' : '✗ pas de résultat clair',
      `longueur ${wordCount} mots → bonus ${briefnessBonus.toFixed(2)}`,
    ],
  };
}

// ────────── 3. DIGRESSION PENALTY ──────────
// Pénalise l'introduction de concepts hors-scope.

// Concepts qui s'introduisent souvent en digression
const TYPICAL_DIGRESSIONS = [
  { rx: /\b(CO[₂2]|carbone|émissions? carbone)\b/i, label: 'CO₂/carbone' },
  { rx: /\b(pollution|polluant|microplastique|écotoxicité)\b/i, label: 'pollution' },
  { rx: /\b(dessalement|usine de dessalement)\b/i, label: 'dessalement' },
  { rx: /\b(Amazone|fleuve|débit hydrologique)\b/i, label: 'cours d\'eau' },
  { rx: /\b(évaporation|cycle de l['']eau|précipitations)\b/i, label: 'cycle eau' },
  { rx: /\b(microlayer|pellicule de surface|micro.?couche océanique)\b/i, label: 'microlayer' },
  { rx: /\b(réchauffement climatique|changement climatique)\b/i, label: 'climat' },
  { rx: /\b(biodiversité|écosystème|chaîne alimentaire)\b/i, label: 'biodiversité' },
];

/**
 * Détecte les digressions hors-scope.
 * Plus haut = plus de pénalité.
 */
export function digressionPenalty(text, question) {
  if (!text) return { penalty: 0, detected: [] };

  // Vérifier quels concepts apparaissent dans la réponse MAIS PAS dans la question
  const detected = [];
  for (const dig of TYPICAL_DIGRESSIONS) {
    const inResponse = dig.rx.test(text);
    const inQuestion = dig.rx.test(question || '');
    if (inResponse && !inQuestion) {
      detected.push(dig.label);
    }
  }

  // Pour question simple, chaque digression pénalise
  const lowIntrinsic = detectLowIntrinsicDepth(question);
  const multiplier = lowIntrinsic.low_intrinsic ? 0.15 : 0.05; // moins pénalisant si question complexe
  const penalty = +Math.min(0.6, detected.length * multiplier).toFixed(3);

  return {
    penalty,
    detected,
    multiplier_used: multiplier,
    rationale: lowIntrinsic.low_intrinsic
      ? 'question simple — toute digression compte'
      : 'question complexe — digressions tolérées avec léger malus',
  };
}

// ────────── 4. COGNITIVE EFFICIENCY ──────────
// Information utile / coût de lecture.

const INFORMATION_MARKERS_RX = /\b\d+(?:[,.\s]\d+)*\s*(?:%|m|km|cm|mm|µm|kg|g|tonne|°C|€|h|min|jour|mois|an|m²|m³|km²|km³|piscine|million\w*|milliard\w*)|\b(parce que|donc|=|≈|conclusion|verdict)\b/gi;

export function cognitiveEfficiency(text) {
  if (!text || text.length < 20) return 0;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const infoMarkers = (text.match(INFORMATION_MARKERS_RX) || []).length;
  // Ratio info / mots (normalisé)
  const ratio = infoMarkers / Math.max(20, wordCount);
  return +Math.min(1, ratio * 50).toFixed(3); // 1 info / 50 mots = score 1.0
}

// ────────── 5. CTA COUNT (pénalité excès) ──────────
// Plus de 1 CTA sur question simple = pénalité.

const CTA_BLOCK_RX = /\*?\*?CTA(?:\s+coh[ée]rents?)?\*?\*?\s*[:\-—]/gi;
const CTA_NUMBERED_RX = /^\s*\d+\.\s*\*\(.+?\)\*/gm;

export function ctaExcessPenalty(text, question) {
  if (!text) return { penalty: 0, cta_count: 0 };
  const blockCount = (text.match(CTA_BLOCK_RX) || []).length;
  const numberedCount = (text.match(CTA_NUMBERED_RX) || []).length;
  const ctaCount = Math.max(blockCount, Math.floor(numberedCount / 1));

  const lowIntrinsic = detectLowIntrinsicDepth(question);
  let penalty = 0;
  if (lowIntrinsic.low_intrinsic) {
    // Pour question simple : 0 CTA = OK, 1 CTA = OK, 2+ CTA = pénalité
    if (ctaCount >= 3) penalty = 0.30;
    else if (ctaCount === 2) penalty = 0.15;
    else penalty = 0;
  } else {
    // Question complexe : 3 CTA OK, 4+ pénalité légère
    if (ctaCount >= 5) penalty = 0.15;
    else if (ctaCount === 4) penalty = 0.05;
    else penalty = 0;
  }

  return {
    penalty,
    cta_count: ctaCount,
    low_intrinsic_question: lowIntrinsic.low_intrinsic,
    rationale: lowIntrinsic.low_intrinsic
      ? `question simple : ${ctaCount} CTA(s) ${ctaCount > 1 ? '= surcharge' : 'OK'}`
      : `question complexe : ${ctaCount} CTA(s) tolérés`,
  };
}

// ────────── 6. COMPOSITE PARSIMONY ──────────
/**
 * Score composite parcimonie [0..1].
 * Haut = réponse parcimonieuse adaptée à la profondeur de la question.
 * Bas = réponse surchargée vs besoin réel.
 */
export function computeParsimony(text, question) {
  const lid = detectLowIntrinsicDepth(question);
  const ls = localSufficiency(text, question);
  const dp = digressionPenalty(text, question);
  const ce = cognitiveEfficiency(text);
  const cta = ctaExcessPenalty(text, question);

  // Composite : base sur efficacité cognitive,
  // + suffisance locale si applicable,
  // - pénalités digression + CTA excès
  let score;
  if (lid.low_intrinsic) {
    // Question simple : poids fort sur suffisance + briefness
    score = 0.50 * ls.score + 0.30 * ce - 0.20 * dp.penalty - 0.20 * cta.penalty;
  } else {
    // Question complexe : poids fort sur efficacité, malus léger digressions
    score = 0.50 * ce + 0.30 * (1 - dp.penalty) - 0.10 * cta.penalty + 0.20;
  }
  score = +Math.max(0, Math.min(1, score)).toFixed(3);

  return {
    parsimony_score: score,
    low_intrinsic_depth: lid,
    local_sufficiency: ls,
    digression_penalty: dp,
    cognitive_efficiency: ce,
    cta_excess: cta,
    verdict: score >= 0.70 ? 'optimal_parsimony'
           : score >= 0.50 ? 'acceptable'
           : score >= 0.30 ? 'surchargée'
           : 'sur_ingénierie',
  };
}
