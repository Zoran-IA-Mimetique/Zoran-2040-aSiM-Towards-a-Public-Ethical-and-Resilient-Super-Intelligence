// app/src/truncation_detector_v11.js
// Mission V11_CAUSAL_COMPRESSION
//
// 4 métriques runtime obligatoires :
//   1. terminal_integrity_score    — conclusion/falsification/action/limites présentes ?
//   2. causal_retention_ratio      — % causalité conservée vs original
//   3. useful_density_after_compression — densité utile après compression
//   4. compression_damage_index    — quoi détruit ?

import { extractCausalCore, PRESERVATION_ORDER } from './causal_compression_engine.js';

// ────────── TERMINAL INTEGRITY SCORE ──────────
/**
 * Vérifie que les éléments TERMINAUX critiques sont présents
 * dans la fin du texte (dernier tiers).
 *
 * Composantes :
 *   - conclusion explicite
 *   - falsification/contre-hypothèse
 *   - action finale claire
 *   - limites/incertitudes
 */
const TERMINAL_CONCLUSION_RX = /(\b(en conclusion|conclusion (provisoire|principale|finale)?|verdict|décision|bilan|au final|donc|ainsi|par conséquent)\b|\*?\*?conclusion\*?\*?\s*:)/i;
const TERMINAL_FALSIFICATION_RX = /(\b(contre.?hypothèse|hypothèse alternative|à infirmer|à écarter|sinon|si .{1,30} faux|à condition que|sous réserve)\b|\*?\*?contre.?hypothèse\*?\*?\s*:|\*?\*?réfutation\*?\*?\s*:)/i;
const TERMINAL_ACTION_RX = /(\b(action\w*|étape\s+\d|sous \d+\s*(j|h|jour|mois|semaine)|à faire|prochaine étape|recommand\w+)\b|\*?\*?actions?\*?\*?\s*:|\*?\*?action immédiate\*?\*?\s*:)/i;
const TERMINAL_LIMITS_RX = /(\b(limit\w*|à vérifier|à valider|incertitude|reste à|hypothèse à valider|nécessite (expertise|confirmation))\b|\*?\*?limites?\*?\*?\s*:)/i;

export function terminalIntegrityScore(text) {
  if (!text || text.length < 100) {
    return { score: 0, components: {}, reason: 'text_too_short' };
  }
  // Fenêtre terminale : max(dernier tiers, 400 derniers chars)
  // Pour les textes courts, garder une fenêtre fixe assez large
  const tierStart = Math.floor(text.length * 0.66);
  const fixedStart = Math.max(0, text.length - 400);
  const sliceStart = Math.min(tierStart, fixedStart);
  const terminal = text.slice(sliceStart);

  const hasConclusion = TERMINAL_CONCLUSION_RX.test(terminal);
  const hasFalsification = TERMINAL_FALSIFICATION_RX.test(terminal);
  const hasAction = TERMINAL_ACTION_RX.test(terminal);
  const hasLimits = TERMINAL_LIMITS_RX.test(terminal);

  // Détection truncation abrupte (fin sans ponctuation finale, dernière phrase incomplète)
  const lastChars = text.slice(-20);
  const truncatedEnd = !/[.!?]$/.test(lastChars.trim());

  const components = {
    conclusion_present: hasConclusion,
    falsification_present: hasFalsification,
    action_present: hasAction,
    limits_present: hasLimits,
    truncated_end: truncatedEnd,
  };

  // Score composite : chaque composante = 0.25, malus si tronqué
  const baseScore = (
    (hasConclusion ? 0.20 : 0)
    + (hasFalsification ? 0.30 : 0)  // pondération forte : c'est ce qui saute en 1er
    + (hasAction ? 0.25 : 0)
    + (hasLimits ? 0.25 : 0)
  );
  const truncationPenalty = truncatedEnd ? 0.30 : 0;
  const score = +Math.max(0, Math.min(1, baseScore - truncationPenalty)).toFixed(3);

  return {
    score,
    components,
    missing: Object.entries(components)
      .filter(([k, v]) => k !== 'truncated_end' && !v)
      .map(([k]) => k),
    verdict: score >= 0.80 ? 'COMPLETE'
           : score >= 0.50 ? 'PARTIAL'
           : score >= 0.25 ? 'DEGRADED'
           : 'CRITICAL_TRUNCATION',
  };
}

// ────────── CAUSAL RETENTION RATIO ──────────
/**
 * Compare core causal extrait avant/après compression.
 * Retourne % de sections critiques conservées.
 */
export function causalRetentionRatio(original_text, compressed_text) {
  const original = extractCausalCore(original_text);
  const compressed = extractCausalCore(compressed_text);

  // Compter présence des sections prioritaires (priority 1-6)
  const criticalSections = ['danger', 'dominant_cause', 'falsification',
                            'instrumentation', 'urgent_actions', 'limits'];

  let originalCritical = 0;
  let retainedCritical = 0;
  const retention_by_section = {};

  for (const section of criticalSections) {
    const origCount = original.sections[section]?.length || 0;
    const compCount = compressed.sections[section]?.length || 0;
    if (origCount > 0) {
      originalCritical++;
      const retention = Math.min(1, compCount / origCount);
      retention_by_section[section] = +retention.toFixed(3);
      if (compCount > 0) retainedCritical++;
    } else {
      retention_by_section[section] = null; // absent dans original
    }
  }

  const ratio = originalCritical > 0 ? retainedCritical / originalCritical : 1.0;
  return {
    ratio: +ratio.toFixed(3),
    original_critical_sections: originalCritical,
    retained_critical_sections: retainedCritical,
    retention_by_section,
    verdict: ratio >= 0.80 ? 'WELL_PRESERVED'
           : ratio >= 0.50 ? 'PARTIALLY_PRESERVED'
           : 'CRITICAL_LOSS',
  };
}

// ────────── USEFUL DENSITY AFTER COMPRESSION ──────────
/**
 * Densité utile = (sections critiques préservées) / mots après compression.
 * Plus haut = meilleure compression causale.
 */
export function usefulDensityAfterCompression(compressed_text) {
  if (!compressed_text || compressed_text.length < 30) return 0;
  const core = extractCausalCore(compressed_text);
  const wordCount = compressed_text.split(/\s+/).filter(w => w.length > 0).length;

  // Compte phrases dans sections prioritaires (1-6)
  let criticalSentences = 0;
  for (const section of ['danger', 'dominant_cause', 'falsification',
                         'instrumentation', 'urgent_actions', 'limits']) {
    criticalSentences += core.sections[section]?.length || 0;
  }

  // Densité = phrases critiques / 50 mots (normalisé pour facteur 1.0 à ~6 phrases critiques / 100 mots)
  const density = (criticalSentences / Math.max(20, wordCount)) * 25;
  return +Math.min(1, density).toFixed(3);
}

// ────────── COMPRESSION DAMAGE INDEX ──────────
/**
 * Quantifie ce qui a été DÉTRUIT par compression.
 * Plus haut = plus de dégâts (mauvais).
 */
export function compressionDamageIndex(original_text, compressed_text) {
  const origIntegrity = terminalIntegrityScore(original_text);
  const compIntegrity = terminalIntegrityScore(compressed_text);
  const retention = causalRetentionRatio(original_text, compressed_text);

  // Damage = perte d'intégrité terminale + perte de causalité critique
  const integrityLoss = Math.max(0, origIntegrity.score - compIntegrity.score);
  const causalLoss = Math.max(0, 1 - retention.ratio);

  // Composante perte spécifique : si l'original avait conclusion+falsification mais pas compressed
  const lostCriticalComponents = [];
  if (origIntegrity.components.conclusion_present && !compIntegrity.components.conclusion_present)
    lostCriticalComponents.push('conclusion');
  if (origIntegrity.components.falsification_present && !compIntegrity.components.falsification_present)
    lostCriticalComponents.push('falsification');
  if (origIntegrity.components.action_present && !compIntegrity.components.action_present)
    lostCriticalComponents.push('action');
  if (origIntegrity.components.limits_present && !compIntegrity.components.limits_present)
    lostCriticalComponents.push('limits');

  // Si compressed introduit un truncated_end alors qu'original n'en avait pas
  const introducedTruncation = !origIntegrity.components.truncated_end
                            && compIntegrity.components.truncated_end;

  const damageScore = +Math.min(1,
    0.40 * integrityLoss
    + 0.30 * causalLoss
    + 0.10 * lostCriticalComponents.length / 4
    + 0.20 * (introducedTruncation ? 1 : 0)
  ).toFixed(3);

  return {
    damage_index: damageScore,
    integrity_loss: +integrityLoss.toFixed(3),
    causal_loss: +causalLoss.toFixed(3),
    lost_critical_components: lostCriticalComponents,
    introduced_truncation: introducedTruncation,
    verdict: damageScore >= 0.50 ? 'SEVERE_DAMAGE'
           : damageScore >= 0.25 ? 'MODERATE_DAMAGE'
           : damageScore >= 0.10 ? 'MINOR_DAMAGE'
           : 'ACCEPTABLE',
  };
}

// ────────── RAPPORT GLOBAL ──────────
export function fullTruncationReport(original_text, compressed_text) {
  return {
    terminal_integrity: terminalIntegrityScore(compressed_text),
    causal_retention: causalRetentionRatio(original_text, compressed_text),
    useful_density_after: usefulDensityAfterCompression(compressed_text),
    damage_index: compressionDamageIndex(original_text, compressed_text),
  };
}
