// app/src/superiority_deltas.js
// Extrait de superiority.js (ZORAN_CORE_OS_FOUNDATION — découplage god-function).
//
// Bloc PUR : calcul des deltas vs baseline + score composite
// runtime_superiority + winner_delta. Aucun appel LLM — entièrement
// testable hors-ligne.
//
// Comportement IDENTIQUE au bloc inline d'origine (déplacement mécanique,
// zéro modification de logique). Voir tools/superiority_units_check.mjs.

import { fieldActionability } from './completion.js';

// Le juge LLM retourne parfois "CANDIDAT N — label" au lieu de "label"
// → normaliser les labels avant matching.
function normalizeLabel(lbl) {
  if (!lbl) return '';
  return String(lbl).replace(/^CANDIDAT\s*\d+\s*[—\-:]\s*/i, '').trim();
}

function findScore(scores, target) {
  const tn = normalizeLabel(target);
  return scores.find(s => normalizeLabel(s.label) === tn)
      || scores.find(s => normalizeLabel(s.label).includes(tn))
      || scores.find(s => tn.includes(normalizeLabel(s.label)));
}

// Calcule le tableau `deltas` à partir du verdict du juge et des réponses
// déjà annotées (annotateResponses). responses[0] = baseline de référence.
// Retourne [] si le juge n'a pas produit de scores parsables.
export function computeDeltas({ judge, responses }) {
  const deltas = [];
  if (!judge || !judge.scores) return deltas;

  const baseline = responses[0];
  const baselineScore = findScore(judge.scores, baseline.label) || judge.scores[0];
  for (const r of responses) {
    const s = findScore(judge.scores, r.label);
    if (!s) continue;
    // Mission SILENT_LAW_GUIDANCE : enrichit deltas avec scores méta-bruit
    const respObj = responses.find(rr => rr.label === r.label) || {};
    deltas.push({
      label: r.label,
      precision: s.precision,
      hallucination: s.hallucination,
      noise: s.noise,
      coherence: s.coherence,
      semantic_delta: s.semantic_delta ?? 0,
      // Métriques objectives méta-bruit (mesurées localement, pas par juge)
      jargon_density: respObj.jargon_density ?? 0,
      user_distance: respObj.user_distance ?? 0,
      practical_usefulness: respObj.practical_usefulness ?? 0,
      meta_noise: respObj.meta_noise ?? 0,
      concrete_runtime_alignment: respObj.concrete_runtime_alignment ?? 0,
      jargon_terms_found: respObj.jargon_terms_found || [],
      // Deltas vs baseline (positif = ZORAN mieux sauf hallu/noise où négatif = mieux)
      precision_delta: +(s.precision - baselineScore.precision).toFixed(3),
      hallucination_delta: +(s.hallucination - baselineScore.hallucination).toFixed(3),
      noise_delta: +(s.noise - baselineScore.noise).toFixed(3),
      coherence_delta: +(s.coherence - baselineScore.coherence).toFixed(3),
      // Nouveaux scores juge (mission ARGUMENTED_RUNTIME_RANKING)
      actionability_score: s.actionability_score ?? 0,
      practical_relevance: s.practical_relevance ?? 0,
      compression_quality: s.compression_quality ?? 0,
      // Mission RUNTIME_SPECIALIZATION + RESPONSE_COMPLETION
      domain_fitness: respObj.domain_fitness ?? null,
      terrain_alignment: respObj.terrain_alignment ?? 0,
      completion_integrity: respObj.completion_integrity ?? 1,
      truncated: respObj.truncated || false,
      truncation_penalty: respObj.truncation_penalty || 0,
      truncation_reasons: respObj.truncation_reasons || [],
      field_actionability: +fieldActionability({
        text: respObj.text,
        judgeActionability: s.actionability_score ?? 0.5,
      }).toFixed(3),
      argumented_grade_20: s.argumented_grade_20 ?? null,
      strengths: s.strengths || [],
      weaknesses: s.weaknesses || [],
      noise_detected: s.noise_detected || '',
      hallucination_risk: s.hallucination_risk || '',
      // Mission SYSTEMIC_SELECTION V3
      systemic_coherence: respObj.systemic_coherence || null,
      goodhart: respObj.goodhart || null,
      // Mission V4 — fragilité + domain_leak
      fragility: respObj.fragility || null,
      domain_leak: respObj.domain_leak || null,
      // Mission V5 — seductive complexity
      seductive_complexity: respObj.seductive_complexity || null,
      // Mission V6 — overthink détection
      overthink: respObj.overthink || null,
      // Mission V7 — identity hallu risk
      identity_hallu_risk: respObj.identity_hallu_risk || null,
      // Mission V9 — CTA + BTP analysis
      cta_presence: respObj.cta_presence || null,
      btp_analysis: respObj.btp_analysis || null,
      ctas_suggested: respObj.ctas_suggested || null,
      // Mission RANKING_BIAS_CORRECTION : parsimonie propagée
      parsimony: respObj.parsimony || null,
      // Score composite : intègre concret + anti-jargon - pénalité troncature
      runtime_superiority: +(
        0.22 * (s.precision - baselineScore.precision)
        + 0.22 * (baselineScore.hallucination - s.hallucination)
        + 0.13 * (baselineScore.noise - s.noise)
        + 0.13 * (s.coherence - baselineScore.coherence)
        + 0.10 * ((respObj.concrete_runtime_alignment ?? 0.5) - (responses[0].concrete_runtime_alignment ?? 0.5))
        + 0.10 * ((responses[0].meta_noise ?? 0.5) - (respObj.meta_noise ?? 0.5))
        + 0.10 * ((respObj.terrain_alignment ?? 0) - (responses[0].terrain_alignment ?? 0))
        - (respObj.truncation_penalty ?? 0)
      ).toFixed(3),
      comment: s.comment || '',
    });
  }
  // Calcul winner_delta = écart de chaque candidat vs le 1er (au sens runtime_superiority)
  const sortedBySup = [...deltas].sort((a, b) => b.runtime_superiority - a.runtime_superiority);
  if (sortedBySup.length) {
    const top = sortedBySup[0].runtime_superiority;
    for (const d of deltas) d.winner_delta = +(top - d.runtime_superiority).toFixed(3);
  }
  return deltas;
}
