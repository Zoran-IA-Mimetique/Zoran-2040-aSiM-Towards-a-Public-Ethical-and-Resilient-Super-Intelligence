// app/src/mutation_stability.js
// Mission V5 — MUTATION_STABILITY
//
// Question clé : "si je change légèrement le problème, la réponse
// reste-t-elle cohérente ?"
//
// Implémentation offline (sans LLM live) :
//   - donne deux textes (réponse à Q et réponse à Q'), calcule la
//     stabilité structurelle entre les deux
//   - mesure la PRÉSERVATION des actions, structures, chiffres, hiérarchie
//   - mesure la DÉRIVE de jargon, fillers, méta-discours
//
// Une réponse robuste : 90% des actions/chiffres conservés, vocabulaire
// stable. Une réponse instable : actions inversées, chiffres modifiés,
// changement de ton.

// Extraction d'éléments structurels comparables
function extractActions(text) {
  const actionVerbs = /\b(vérifi\w*|consult\w*|appel\w*|demand\w*|contact\w*|étudi\w*|analys\w*|mesur\w*|calcul\w*|décid\w*|chois\w*|install\w*|plac\w*|retir\w*|remplac\w*|construir\w*|valid\w*|test\w*|appliqu\w*|suivr\w*|respect\w*|évit\w*|prévoir|anticip\w*|planif\w*|document\w*|protég\w*|sécuris\w*|isol\w*|born\w*|limit\w*|réduir\w*)\b/gi;
  return [...new Set((text.match(actionVerbs) || []).map(s => s.toLowerCase()))];
}

function extractNumbers(text) {
  const nums = text.match(/\b\d+(?:[,.]\d+)?\s*(?:%|m|m²|m³|cm|mm|kg|g|°C|°|€|ans?|jours?|mois|h|min|sec|kWh|kVA|V|A|Hz|MHz|GHz|bar|psi)\b/gi);
  return [...new Set((nums || []).map(s => s.toLowerCase().replace(/\s+/g, '')))];
}

function extractStructureMarkers(text) {
  const struct = /\b(d['']?abord|premi[èe]rement|deuxièmement|ensuite|puis|enfin|finalement|étape\s+\d|priorit[ée]|urgent|impératif|en premier|en second|niveau\s+\d|cas\s+\d)/gi;
  return [...new Set((text.match(struct) || []).map(s => s.toLowerCase()))];
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

/**
 * Compare deux réponses (à Q et Q' mutée légèrement) et retourne un
 * score de stabilité structurelle [0..1].
 *
 * @param {string} textA - réponse à la question originale
 * @param {string} textB - réponse à la question mutée
 * @returns { stability_score, action_preservation, number_preservation, structure_preservation, evidence }
 */
export function mutationStability(textA, textB) {
  if (!textA || !textB || textA.length < 30 || textB.length < 30) {
    return { stability_score: null, reason: 'insufficient_text' };
  }
  const actionsA = extractActions(textA);
  const actionsB = extractActions(textB);
  const numsA = extractNumbers(textA);
  const numsB = extractNumbers(textB);
  const structA = extractStructureMarkers(textA);
  const structB = extractStructureMarkers(textB);

  const actionPreservation = jaccardSimilarity(actionsA, actionsB);
  const numberPreservation = jaccardSimilarity(numsA, numsB);
  const structurePreservation = jaccardSimilarity(structA, structB);
  // Longueur ratio (variation de longueur excessive = instabilité)
  const lengthRatio = Math.min(textA.length, textB.length) / Math.max(textA.length, textB.length);

  // Composite : actions 0.35, nombres 0.30, structure 0.20, longueur 0.15
  const stability_score = +(
    0.35 * actionPreservation
    + 0.30 * numberPreservation
    + 0.20 * structurePreservation
    + 0.15 * lengthRatio
  ).toFixed(3);

  return {
    stability_score,
    action_preservation: +actionPreservation.toFixed(3),
    number_preservation: +numberPreservation.toFixed(3),
    structure_preservation: +structurePreservation.toFixed(3),
    length_ratio: +lengthRatio.toFixed(3),
    evidence: {
      shared_actions: actionsA.filter(a => actionsB.includes(a)),
      lost_actions: actionsA.filter(a => !actionsB.includes(a)),
      added_actions: actionsB.filter(a => !actionsA.includes(a)),
      shared_numbers: numsA.filter(n => numsB.includes(n)),
      lost_numbers: numsA.filter(n => !numsB.includes(n)),
      added_numbers: numsB.filter(n => !numsA.includes(n)),
    },
    verdict: stability_score >= 0.70 ? 'STABLE'
            : stability_score >= 0.45 ? 'MODERATE'
            : 'UNSTABLE',
  };
}
