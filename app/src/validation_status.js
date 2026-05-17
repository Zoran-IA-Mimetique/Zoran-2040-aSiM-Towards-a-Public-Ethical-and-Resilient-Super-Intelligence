// app/src/validation_status.js
// Mission V8 — META_AUDIT_ANTI_GOODHART
//
// Étiquette automatiquement chaque réponse avec un statut de validation
// externe explicite :
//
//   internal_only           → cohérence interne uniquement, pas de source
//   externally_supported    → mentionne sources/références vérifiables
//   unverified              → claims présents sans preuve ni disclaimer
//   temporally_unstable     → claims sur futur sans bornage temporel
//   potentially_goodharted  → KPI critique sans contre-hypothèse
//
// 7 couches de cohérence à distinguer :
//   internal_coherence        — logique interne
//   operational_usefulness    — utilité pragmatique
//   empirical_grounding       — ancrage réel (sources, mesures)
//   systemic_resilience       — robustesse globale
//   anti_goodhart_strength    — résistance manipulation KPI
//   temporal_stability        — stabilité long terme
//   frame_completeness        — couverture des angles morts

import { auditMetrics } from './meta_metric_auditor.js';
import { frameRefutationScore } from './frame_refutation_engine.js';
import { systemicCoherenceReport } from './systemic_coherence.js';
import { runAntiGoodhart } from './anti_goodhart.js';

// Marqueurs d'ancrage externe
const EMPIRICAL_GROUNDING_RX = /\b(selon (l['']?étude|la recherche|le rapport|wikipédia|l['']INSEE|l['']OMS|la HAS|le ministère)|source\s*:|réf(érence)?\s*:|cite|étude (de|du|publiée)|publication\w* dans|paper\w*|article scientifique|d['']après (les |le )?(données|chiffres|statistiques)|page \d+ de|chapitre \d+)\b/gi;

// Marqueurs de bornage temporel
const TEMPORAL_BOUNDS_RX = /\b(au moment de|en \d{4}|à la date de|sous réserve d['']?évolution|peut évoluer|à recontrôler|à actualiser|données de \d{4}|chiffres de \d{4}|valide jusqu['']?en|jusqu['']?à preuve du contraire)\b/gi;

// Marqueurs de scope explicite
const SCOPE_EXPLICIT_RX = /\b(dans le contexte (de|du|des)|en France uniquement|pour les (PME|grands comptes|particuliers|professionnels)|cas spécifique de|hors (exception\w*|cas particulier\w*)|à l['']exclusion de|ne s['']?applique pas à|valable pour|champ d['']application)\b/gi;

/**
 * Détermine le statut de validation externe d'une réponse.
 */
export function determineValidationStatus(responseText) {
  if (!responseText || responseText.length < 50) {
    return { status: 'insufficient_text', layers: {}, evidence: [] };
  }

  // Métriques sous-jacentes
  const metricAudit = auditMetrics(responseText);
  const refutation = frameRefutationScore(responseText);
  const sysCoherence = systemicCoherenceReport(responseText);
  const goodhart = runAntiGoodhart(responseText);

  // Marqueurs explicites
  const groundingCount = (responseText.match(EMPIRICAL_GROUNDING_RX) || []).length;
  const temporalBounds = (responseText.match(TEMPORAL_BOUNDS_RX) || []).length;
  const scopeExplicit = (responseText.match(SCOPE_EXPLICIT_RX) || []).length;

  // 7 LAYERS DE COHÉRENCE
  const layers = {
    internal_coherence:        +(0.5 + (sysCoherence.causal_robustness - 0.5)).toFixed(3),
    operational_usefulness:    +sysCoherence.composite.toFixed(3),
    empirical_grounding:       +Math.min(1, groundingCount * 0.30).toFixed(3),
    systemic_resilience:       +sysCoherence.resilience.toFixed(3),
    anti_goodhart_strength:    +(1 - goodhart.goodhart_risk).toFixed(3),
    temporal_stability:        +Math.min(1, 0.40 + temporalBounds * 0.20).toFixed(3),
    frame_completeness:        +refutation.score.toFixed(3),
  };

  // STATUS DÉRIVÉ
  let status;
  const reasons = [];
  if (groundingCount >= 2 && metricAudit.kpis_detected.length === 0) {
    status = 'externally_supported';
    reasons.push(`${groundingCount} sources/références citées`);
  } else if (metricAudit.meta_risk_composite >= 0.60 && refutation.fires) {
    status = 'potentially_goodharted';
    reasons.push(`KPI ${metricAudit.worst_kpi?.name} risque ${metricAudit.meta_risk_composite}`);
    reasons.push(`auto-réfutation insuffisante (score ${refutation.score})`);
  } else if (metricAudit.kpis_detected.length > 0 && groundingCount === 0) {
    status = 'unverified';
    reasons.push(`${metricAudit.kpis_detected.length} KPI(s) mentionnés sans source`);
  } else if (temporalBounds === 0 && /\b(toujours|jamais|sera|deviendra|aura|d['']?ici \d+ ans)\b/i.test(responseText)) {
    status = 'temporally_unstable';
    reasons.push(`claims temporels sans bornage`);
  } else {
    status = 'internal_only';
    reasons.push(`cohérence interne sans ancrage externe explicite`);
  }

  const evidence = [
    ...reasons,
    `grounding=${groundingCount}, temporal=${temporalBounds}, scope=${scopeExplicit}`,
  ];

  return {
    status,
    layers,
    evidence,
    metric_audit: metricAudit,
    refutation_score: refutation.score,
    flags: {
      grounding_present: groundingCount > 0,
      temporal_bounded: temporalBounds > 0,
      scope_explicit: scopeExplicit > 0,
      kpi_present: metricAudit.kpis_detected.length > 0,
      goodhart_risk: goodhart.goodhart_risk,
      counter_hypotheses_present: refutation.score >= 0.50,
    },
  };
}
