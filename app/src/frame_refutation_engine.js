// app/src/frame_refutation_engine.js
// Mission V8 — META_AUDIT_ANTI_GOODHART
//
// Génère automatiquement des contre-hypothèses qui attaquent la
// conclusion d'une réponse. Pour chaque succès apparent (ROAS élevé,
// LTV/CAC fort, DPE A), produit 3-5 alternatives systémiques :
//
//   "Et si le ROAS élevé provenait :
//     - d'un déplacement des coûts ?
//     - d'un effet promotionnel temporaire ?
//     - d'une dilution du support ?
//     - d'une dette réputationnelle ?"
//
// Le système attaque ses propres conclusions plutôt que de les célébrer.

import { auditMetrics } from './meta_metric_auditor.js';

// Templates de contre-hypothèses par catégorie (ground truth empirique)
const COUNTER_HYPOTHESIS_TEMPLATES = {
  cost_displacement: {
    pattern: 'Et si {metric} était soutenu par un déplacement des coûts ailleurs (support, marque, dette technique) ?',
    triggers: ['ROAS', 'LTV/CAC', 'CAC', 'rentabilité', 'marge'],
  },
  temporal_subsidy: {
    pattern: 'Et si {metric} était maintenu par une subvention temporaire qui ne sera pas reproductible ?',
    triggers: ['ROAS', 'NRR', 'croissance', 'revenu', 'ventes'],
  },
  survivorship_filter: {
    pattern: 'Et si {metric} ne reflétait que les survivants, masquant la fuite massive des churned ?',
    triggers: ['NRR', 'NPS', 'satisfaction', 'engagement'],
  },
  delayed_collapse: {
    pattern: 'Et si {metric} masquait une dégradation différée non encore visible (effet en 6-18 mois) ?',
    triggers: ['ROAS', 'engagement', 'biomarqueur', 'KPI', 'DPE'],
  },
  scope_blindness: {
    pattern: 'Et si {metric} ignorait des dimensions critiques non mesurées (qualité réelle, externalités, long terme) ?',
    triggers: ['DPE', 'KPI', 'biomarqueur', 'precision', 'score'],
  },
  incentive_distortion: {
    pattern: 'Et si l\'optimisation de {metric} avait créé une incitation perverse qui dégrade la qualité réelle ?',
    triggers: ['CTR', 'engagement', 'KPI', 'précision'],
  },
  proxy_drift: {
    pattern: 'Et si la corrélation historique entre {metric} et la valeur réelle s\'était érodée (proxy drift) ?',
    triggers: ['biomarqueur', 'KPI', 'précision', 'score', 'NPS'],
  },
  externalization: {
    pattern: 'Et si {metric} n\'incluait pas le coût supporté par d\'autres (clients, employés, environnement, futur) ?',
    triggers: ['ROAS', 'rentabilité', 'productivité', 'efficacité'],
  },
  measurement_capture: {
    pattern: 'Et si {metric} avait été capturée par ceux dont la performance est mesurée (gaming organisationnel) ?',
    triggers: ['KPI', 'NPS', 'précision', 'objectifs', 'OKR'],
  },
  goodhart_classique: {
    pattern: 'Et si {metric} avait cessé d\'être un bon proxy précisément parce qu\'elle est devenue cible (Goodhart) ?',
    triggers: ['*'],  // toujours applicable
  },
};

// Marqueurs de succès qui devraient déclencher contre-hypothèses
const SUCCESS_CLAIM_RX = /\b(excellent\w*|optimal\w*|maximal\w*|exceptionnel\w*|record|au.?dessus de la moyenne|supérieur à|atteint|dépassé|fort\w*\s*(croissance|amélioration|progression)|gain\w* (significatif|importants?)|résultat\w* (impressionnant\w*|remarquable\w*|excellent\w*))\b/gi;

// Marqueurs d'auto-réfutation déjà présents (réduit besoin de contre-hypothèses)
const SELF_REFUTATION_RX = /\b(et si|toutefois (il faut)?|cependant (il faut)?|attention (au|à la|aux)|mise en garde|risque (de|que)|peut être trompeur|à condition|sous réserve|attention au Goodhart|proxy à distinguer|au prix de|au détriment de)\b/gi;

/**
 * Génère des contre-hypothèses pertinentes à partir du contexte.
 *
 * @param {string} responseText - réponse à attaquer
 * @returns { counter_hypotheses, refutation_needed, self_refutation_present, evidence }
 */
export function generateCounterHypotheses(responseText) {
  if (!responseText || responseText.length < 50) {
    return { counter_hypotheses: [], refutation_needed: false, self_refutation_present: false };
  }

  // Détection des KPI mentionnés
  const audit = auditMetrics(responseText);
  const kpis = audit.kpis_detected;

  // Détection de claims de succès
  const successClaims = (responseText.match(SUCCESS_CLAIM_RX) || []).length;
  const selfRefutationCount = (responseText.match(SELF_REFUTATION_RX) || []).length;
  const self_refutation_present = selfRefutationCount >= 2;

  // Si pas de KPI ET pas de claim de succès → pas besoin de contre-hypothèses
  if (kpis.length === 0 && successClaims === 0) {
    return {
      counter_hypotheses: [],
      refutation_needed: false,
      self_refutation_present,
      reason: 'no_metric_no_success_claim',
    };
  }

  // Pour chaque KPI détecté, générer contre-hypothèses pertinentes
  const counter_hypotheses = [];
  const seen = new Set();
  for (const kpi of (kpis.length ? kpis : ['résultat'])) {
    for (const [category, template] of Object.entries(COUNTER_HYPOTHESIS_TEMPLATES)) {
      const applicable = template.triggers.includes('*')
        || template.triggers.some(t => kpi.toLowerCase().includes(t.toLowerCase()));
      if (!applicable) continue;
      const text = template.pattern.replace('{metric}', kpi);
      const key = `${category}:${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      counter_hypotheses.push({ category, text, kpi });
      if (counter_hypotheses.length >= 6) break;
    }
    if (counter_hypotheses.length >= 6) break;
  }

  return {
    counter_hypotheses,
    refutation_needed: counter_hypotheses.length > 0 && !self_refutation_present,
    self_refutation_present,
    self_refutation_count: selfRefutationCount,
    success_claims_count: successClaims,
    kpis_detected: kpis,
    evidence: counter_hypotheses.length > 0 && !self_refutation_present
      ? `${counter_hypotheses.length} contre-hypothèses possibles, ${selfRefutationCount} auto-réfutation présentes (besoin: ≥2)`
      : null,
  };
}

/**
 * Score de qualité d'auto-réfutation [0..1].
 * Haut = la réponse attaque déjà ses propres conclusions.
 * Bas = la réponse célèbre sans douter → demande contre-hypothèses.
 */
export function frameRefutationScore(responseText) {
  const r = generateCounterHypotheses(responseText);
  if (r.counter_hypotheses.length === 0) {
    return { score: 1.0, reason: 'no_refutation_needed' };
  }
  // Présence d'auto-réfutation (positif) vs besoin de contre-hypothèses (négatif)
  const need = r.counter_hypotheses.length;
  const have = r.self_refutation_count;
  // Score : 1 si auto-réfutation suffit (have/need >= 0.5), 0 si zéro
  const ratio = Math.min(1, have / Math.max(1, need * 0.5));
  return {
    score: +ratio.toFixed(3),
    counter_hypotheses_needed: need,
    self_refutation_present: have,
    fires: ratio < 0.30,
    hint: ratio < 0.30
      ? `Réponse célèbre sans réfuter (${need} contre-hypothèses non couvertes). Ajouter "et si...", "attention au Goodhart", "mise en garde".`
      : '',
  };
}
