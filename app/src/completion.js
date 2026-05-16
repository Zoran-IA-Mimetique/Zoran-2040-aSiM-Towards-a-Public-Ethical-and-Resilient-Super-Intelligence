// app/src/completion.js
// Mission ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516
//
// Détecte les troncatures de réponses LLM (max_tokens atteint, phrase
// coupée mid-mot, fin sans ponctuation, mot connecteur en suspens).
// Pénalise dans le score runtime.

// Mots connecteurs en suspens (réponse coupée en mid-thought)
const SUSPENDED_CONNECTORS_RX = /\b(et|mais|donc|car|parce que|ou bien|ainsi|cependant|toutefois|néanmoins|en effet|de plus|par exemple|notamment|surtout|finalement|enfin|pour|avec|sans|si|même si)\s*[,.]?\s*$/i;

// Listes à puces qui se terminent sur un nouvel élément vide
const TRUNCATED_LIST_RX = /(\n\s*[-•*]\s+[^\n]{0,5})$/;

/**
 * Détecte si une réponse semble tronquée.
 * Retourne { truncated, reasons[], confidence [0..1] }.
 */
export function detectTruncation(text, usage = null) {
  if (!text || !text.trim()) return { truncated: true, reasons: ['empty'], confidence: 1.0 };
  const trimmed = text.trim();
  const reasons = [];
  let confidence = 0;

  // 1. Ne se termine pas par ponctuation forte
  const lastChar = trimmed.slice(-1);
  if (!/[.!?…]/.test(lastChar) && !/[»"')\]]/.test(lastChar)) {
    reasons.push('no_final_punctuation');
    confidence += 0.40;
  }

  // 2. Termine par connecteur en suspens
  if (SUSPENDED_CONNECTORS_RX.test(trimmed)) {
    reasons.push('suspended_connector');
    confidence += 0.50;
  }

  // 3. Termine par une puce de liste vide
  if (TRUNCATED_LIST_RX.test(trimmed)) {
    reasons.push('truncated_list_item');
    confidence += 0.45;
  }

  // 4. Termine par tiret ou virgule
  if (/[,–—-]\s*$/.test(trimmed)) {
    reasons.push('mid_clause_cut');
    confidence += 0.30;
  }

  // 5. Usage indique max_tokens atteint (stop_reason = "max_tokens")
  // L'API Claude renvoie stop_reason dans la réponse principale, pas usage
  // mais on peut inférer si output_tokens est suspicieusement proche de max
  if (usage && usage.output_tokens && usage.output_tokens >= 850) {
    // Si on a demandé max 900 et reçu 850+, fort risque de cut
    reasons.push('output_near_max');
    confidence += 0.20;
  }

  // 6. Termine par "..." ou "etc" ou similaire (incertitude finale)
  if (/\b(etc\.?|\.\.\.|…)\s*$/.test(trimmed)) {
    reasons.push('vague_ending');
    confidence += 0.15;
  }

  confidence = Math.min(1.0, confidence);
  return {
    truncated: confidence >= 0.35,
    reasons,
    confidence: +confidence.toFixed(2),
  };
}

/**
 * Calcule completion_integrity [0..1] :
 * 1.0 = réponse complète bien finie
 * 0.0 = réponse manifestement tronquée
 */
export function completionIntegrity(text, usage = null) {
  const t = detectTruncation(text, usage);
  return +(1.0 - t.confidence).toFixed(3);
}

/**
 * Pénalité de troncature [0..1] à soustraire du score runtime.
 */
export function truncationPenalty(text, usage = null) {
  const t = detectTruncation(text, usage);
  return t.truncated ? Math.min(0.50, 0.20 + t.confidence * 0.30) : 0;
}

/**
 * Mesure d'actionnabilité terrain : présence de termes métier concrets
 * (vocabulaire technique, références normatives, étapes opérationnelles).
 */
const TERRAIN_TERMS_RX = /\b(BET|IPN|IPE|HEB|DTU|NF|EN|ISO|RT2012|RE2020|Consuel|Apave|Veritas|architecte|maître d'œuvre|MOE|maître d'ouvrage|MOA|béton|acier|charpente|ferraillage|descente de charges?|contreventement|fondations?|semelle|linteau|jambage|chevêtre|étaiement|tassement|fissure|étanchéité|isolation|VMC|électricien|plombier|maçon|géomètre|expert|bureau d'études?|bureau de contrôle|déclaration préalable|permis|mairie|notaire|assurance|garantie|décennale|biennale|RC pro)\b/gi;

export function terrainAlignment(text) {
  if (!text) return 0;
  const matches = text.match(TERRAIN_TERMS_RX);
  if (!matches) return 0;
  const uniq = new Set(matches.map(m => m.toLowerCase()));
  // Densité : nombre de termes uniques / 8 = saturation
  return Math.min(1.0, uniq.size / 8);
}

/**
 * field_actionability composite : actionability_score interne combiné
 * avec terrain_alignment (vocabulaire métier réel).
 * Plus haut = plus exploitable chantier/terrain.
 */
export function fieldActionability({ text, judgeActionability = 0.5 }) {
  const terrain = terrainAlignment(text);
  return +(0.6 * judgeActionability + 0.4 * terrain).toFixed(3);
}
