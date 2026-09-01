// app/src/causal_compression_engine.js
// Mission V11_CAUSAL_COMPRESSION_20260517
//
// Problème : les réponses expertes profondes se font TRONQUER en fin.
// Les conclusions, falsifications, actions urgentes disparaissent.
// → réponse juridiquement fragile, opérationnellement inutilisable.
//
// Solution : extraction structurée + ordre de préservation strict +
// budget terminal réservé. Compression CAUSALE, pas lexicale.

// ────────── PATTERNS DE SECTIONS CRITIQUES ──────────
// Markers explicites en début de phrase/paragraphe
const SECTION_PATTERNS = {
  danger: {
    rx: /\b(danger immédiat|urgence (vitale|absolue)?|évacuation|risque vital|effondrement (imminent|en cours)|mise en sécurité|étaiement (immédiat|provisoire)|action conservatoire)\b/i,
    priority: 1,
  },
  dominant_cause: {
    rx: /\b(cause (dominante|principale|prépondérante|première|directe)|origine (principale|dominante)|hypothèse dominante|tableau pathologique|étiologie principale)\b/i,
    priority: 2,
  },
  falsification: {
    rx: /\b(contre.?hypothèse|hypothèse alternative|à écarter|à infirmer|si .{1,40} alors|sinon|à l['']inverse|réfutation|si .{1,40} faux|test de falsification)\b/i,
    priority: 3,
  },
  instrumentation: {
    rx: /\b(sondage (CPT|pressiométrique|destructif)|caméra thermique|humidimètre|fissuromètre étalonné|inclinomètre|piézomètre|essai pénétrométrique|carottage|témoin (papier|plâtre)|note (de )?calcul|étude G[12]|infiltrométrie)\b/i,
    priority: 4,
  },
  urgent_actions: {
    rx: /\b(action\w* immédiate\w*|sous \d+\s*(jours?|h|heures?|semaines?)|étape 1|d['']abord|en premier|priorité (absolue|1)|tout de suite|sans délai)\b/i,
    priority: 5,
  },
  limits: {
    rx: /\b(limite\w* (de cette )?(analyse|conclusion|certitude)|à vérifier|à confirmer|sous réserve|hypothèse à valider|nécessite expertise|incertitude\w*|reste à (vérifier|valider|établir))\b/i,
    priority: 6,
  },
  cofactors: {
    rx: /\b(cofacteur\w*|facteur\w* aggravant\w*|amplificateur\w*|cumul (avec|de))\b/i,
    priority: 7,
  },
  examples: {
    rx: /\b(par exemple|exemple typique|exemple classique|cas (typique|d['']école)|illustration)\b/i,
    priority: 8,
  },
  context: {
    rx: /\b(dans (un |le )?contexte|en général|pour mémoire|historiquement|classiquement|par défaut)\b/i,
    priority: 9,
  },
  reformulations: {
    rx: /\b(autrement dit|en d['']autres termes|c['']est.à.dire|formulé différemment|en résumé|pour résumer|en bref|en conclusion)\b/i,
    priority: 10,
  },
};

// ────────── PHRASES BRUIT (à supprimer en priorité) ──────────
const NOISE_PHRASES_RX = /\b(il (est|convient) (important|essentiel|crucial|nécessaire) (de|que|à noter)|cela étant dit|au demeurant|d['']autre part|par ailleurs (il faut)?|de plus(?:,)?|en outre|de surcroît|qui plus est|notez bien que|gardez à l['']esprit|n['']oubliez pas que)\b/gi;

// ────────── EXTRACT_CAUSAL_CORE ──────────
/**
 * Découpe le texte en sections classées par priorité de préservation.
 * Chaque phrase est associée à sa section la plus prioritaire détectée.
 */
export function extractCausalCore(text) {
  if (!text || text.length < 30) {
    return { sections: {}, sentences: [], total_sentences: 0 };
  }

  // Split en phrases (gestion ponctuation FR)
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÿ])/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const sections = {
    danger: [], dominant_cause: [], falsification: [], instrumentation: [],
    urgent_actions: [], limits: [], cofactors: [], examples: [],
    context: [], reformulations: [], unclassified: [],
  };

  const classified = sentences.map((sentence, idx) => {
    // Trouve la section LA PLUS PRIORITAIRE qui matche
    let bestSection = 'unclassified';
    let bestPriority = 99;
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.rx.test(sentence) && pattern.priority < bestPriority) {
        bestSection = name;
        bestPriority = pattern.priority;
      }
    }
    sections[bestSection].push({ idx, text: sentence, priority: bestPriority });
    return { idx, section: bestSection, priority: bestPriority, text: sentence };
  });

  return {
    sections,
    sentences: classified,
    total_sentences: sentences.length,
    summary: Object.fromEntries(
      Object.entries(sections).map(([k, v]) => [k, v.length])
    ),
  };
}

// ────────── DETECT_REDUNDANCY_NOISE ──────────
/**
 * Identifie les phrases compressibles : bruit, répétitions, reformulations.
 */
export function detectRedundancyNoise(text) {
  if (!text) return { noise_phrases: [], reformulation_pairs: [], wordy_count: 0 };

  const noisePhrases = (text.match(NOISE_PHRASES_RX) || []);

  // Détection de doublons sémantiques approchés (phrases avec 70%+ vocabulaire commun)
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  const reformulationPairs = [];
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const wordsA = new Set(sentences[i].toLowerCase().split(/\s+/).filter(w => w.length > 4));
      const wordsB = new Set(sentences[j].toLowerCase().split(/\s+/).filter(w => w.length > 4));
      if (wordsA.size < 3 || wordsB.size < 3) continue;
      const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
      const overlap = intersection / Math.min(wordsA.size, wordsB.size);
      if (overlap >= 0.65) {
        reformulationPairs.push({ a_idx: i, b_idx: j, overlap: +overlap.toFixed(2) });
      }
    }
  }

  return {
    noise_phrases: noisePhrases.slice(0, 10),
    noise_count: noisePhrases.length,
    reformulation_pairs: reformulationPairs.slice(0, 5),
    reformulation_count: reformulationPairs.length,
    wordy_count: noisePhrases.length + reformulationPairs.length,
  };
}

// ────────── PRIORITY_PRESERVATION_ORDER ──────────
/**
 * Retourne l'ordre canonique de préservation (selon mission V11).
 * Sections à garder en priorité absolue.
 */
export const PRESERVATION_ORDER = [
  'danger',              // 1. danger immédiat
  'dominant_cause',      // 2. causalité dominante
  'falsification',       // 3. contre-hypothèse / falsification
  'instrumentation',     // 4. instrumentation discriminante
  'urgent_actions',      // 5. actions immédiates
  'limits',              // 6. limites épistémologiques
  'cofactors',           // 7. cofacteurs (secondaire)
  'examples',            // 8. exemples
  'context',             // 9. contexte secondaire
  'reformulations',      // 10. reformulations
];

export function priorityPreservationOrder() {
  return [...PRESERVATION_ORDER];
}

// ────────── RESERVE_TERMINAL_BUDGET ──────────
/**
 * Calcule le budget terminal à réserver pour conclusion+limites+action+falsif.
 * Mission : 15-20% du budget total.
 *
 * @param {number} total_budget_tokens - budget total alloué
 * @returns { terminal_tokens, body_tokens, ratio }
 */
export function reserveTerminalBudget(total_budget_tokens) {
  const ratio = 0.18; // 18% — milieu de la plage 15-20%
  const terminal_tokens = Math.floor(total_budget_tokens * ratio);
  const body_tokens = total_budget_tokens - terminal_tokens;
  return {
    terminal_tokens,
    body_tokens,
    ratio,
    note: `réservé ${terminal_tokens} tokens pour conclusion/falsification/limites/actions finales`,
  };
}

// ────────── COMPRESS_CAUSAL ──────────
/**
 * Compresse un texte expert pour tenir dans un budget de mots.
 * GARDE l'ordre de priorité strictement. Coupe les sections basses.
 *
 * @param {string} text
 * @param {number} target_words - cible en nombre de mots
 * @returns { compressed_text, kept_sections, dropped_sections, stats }
 */
export function compressCausal(text, target_words = 250) {
  const core = extractCausalCore(text);
  const noise = detectRedundancyNoise(text);

  // Sentences à supprimer en priorité : bruit + reformulations
  const noiseIndices = new Set();
  // Marquer les phrases qui matchent noise patterns
  core.sentences.forEach(s => {
    if (NOISE_PHRASES_RX.test(s.text)) noiseIndices.add(s.idx);
    NOISE_PHRASES_RX.lastIndex = 0;
  });
  // Marquer la 2e phrase de chaque paire reformulation (garder la 1ère)
  for (const pair of noise.reformulation_pairs) {
    noiseIndices.add(pair.b_idx);
  }

  // Construire l'output dans l'ordre du texte original MAIS uniquement
  // les phrases dont le rang prioritaire le permet
  const kept = [];
  const dropped = [];
  let wordCount = 0;

  // 1ère passe : garder TOUTES les phrases priorité 1-6 (sections critiques)
  // 2ème passe : ajouter les phrases priorité 7-10 si budget restant
  for (let pass = 1; pass <= 2; pass++) {
    const maxPriority = (pass === 1) ? 6 : 10;
    for (const s of core.sentences) {
      if (kept.some(k => k.idx === s.idx)) continue;
      if (s.priority > maxPriority && pass === 1) continue;
      if (noiseIndices.has(s.idx)) {
        dropped.push({ ...s, reason: 'noise_or_reformulation' });
        continue;
      }
      const sw = s.text.split(/\s+/).length;
      if (wordCount + sw > target_words) {
        dropped.push({ ...s, reason: 'budget_exceeded' });
        continue;
      }
      kept.push(s);
      wordCount += sw;
    }
  }

  // Re-ordonner les kept dans l'ordre du texte original
  kept.sort((a, b) => a.idx - b.idx);
  const compressed_text = kept.map(k => k.text).join(' ');

  const keptSections = {};
  const droppedSections = {};
  for (const s of kept) keptSections[s.section] = (keptSections[s.section] || 0) + 1;
  for (const s of dropped) droppedSections[s.section] = (droppedSections[s.section] || 0) + 1;

  return {
    compressed_text,
    original_word_count: text.split(/\s+/).length,
    compressed_word_count: wordCount,
    target_words,
    compression_ratio: +(wordCount / Math.max(1, text.split(/\s+/).length)).toFixed(3),
    kept_sections: keptSections,
    dropped_sections: droppedSections,
    sentences_kept: kept.length,
    sentences_dropped: dropped.length,
  };
}
