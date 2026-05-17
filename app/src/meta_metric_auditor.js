// app/src/meta_metric_auditor.js
// Mission V8 — META_AUDIT_ANTI_GOODHART
//
// Audit des MÉTRIQUES elles-mêmes. Pour chaque KPI/score nommé dans
// une réponse, calcule des risques qui ne dépendent PAS de la valeur du
// score mais de la nature même du proxy.
//
// 9 risques par métrique :
//   1. manipulability_risk          — la métrique est-elle gameable ?
//   2. proxy_distance               — distance entre proxy et réalité visée
//   3. delayed_failure_risk         — risque collapse différé non capturé
//   4. scope_blindness              — la métrique manque-t-elle des dimensions ?
//   5. externality_risk             — externalisation possible des coûts ?
//   6. temporal_fragility           — KPI court terme qui se dégrade ?
//   7. incentive_distortion         — incitation perverse encodée ?
//   8. survivorship_bias_risk       — biais de sélection ?
//   9. measurement_capture_risk     — la mesure peut-elle être capturée ?

// Bibliothèque de KPI connus + leur profil de risque (calibration empirique)
const KPI_LIBRARY = {
  // SaaS
  'LTV/CAC': {
    aliases: ['ltv/cac', 'ltvcac', 'ltv:cac', 'ltv to cac'],
    manipulability_risk: 0.65, proxy_distance: 0.55, delayed_failure_risk: 0.70,
    scope_blindness: 0.50, externality_risk: 0.40, temporal_fragility: 0.65,
    incentive_distortion: 0.55, survivorship_bias_risk: 0.45, measurement_capture_risk: 0.50,
    note: 'gameable via subvention CAC court terme ou inflation LTV par cohort sélectif',
  },
  'NRR': {
    aliases: ['net revenue retention', 'nrr'],
    manipulability_risk: 0.50, proxy_distance: 0.40, delayed_failure_risk: 0.60,
    scope_blindness: 0.55, externality_risk: 0.35, temporal_fragility: 0.55,
    incentive_distortion: 0.50, survivorship_bias_risk: 0.70, measurement_capture_risk: 0.40,
    note: 'biais survivorship — exclut churned, peut masquer fuite massive',
  },
  'ROAS': {
    aliases: ['return on ad spend', 'roas'],
    manipulability_risk: 0.75, proxy_distance: 0.70, delayed_failure_risk: 0.65,
    scope_blindness: 0.65, externality_risk: 0.55, temporal_fragility: 0.75,
    incentive_distortion: 0.65, survivorship_bias_risk: 0.55, measurement_capture_risk: 0.60,
    note: 'attribution opaque, last-click bias, ignore organic cannibalization',
  },
  'NPS': {
    aliases: ['net promoter score', 'nps'],
    manipulability_risk: 0.55, proxy_distance: 0.60, delayed_failure_risk: 0.45,
    scope_blindness: 0.60, externality_risk: 0.25, temporal_fragility: 0.45,
    incentive_distortion: 0.55, survivorship_bias_risk: 0.50, measurement_capture_risk: 0.55,
    note: 'survey bias, mode collection biaise score',
  },
  'DPE': {
    aliases: ['dpe', 'diagnostic performance énergétique', 'classe énergétique'],
    manipulability_risk: 0.55, proxy_distance: 0.65, delayed_failure_risk: 0.55,
    scope_blindness: 0.70, externality_risk: 0.45, temporal_fragility: 0.40,
    incentive_distortion: 0.55, survivorship_bias_risk: 0.30, measurement_capture_risk: 0.50,
    note: 'ne capture pas inertie thermique, ventilation, comportement occupant',
  },
  'KPI': {
    aliases: ['kpi', 'indicateur clé'],
    manipulability_risk: 0.50, proxy_distance: 0.50, delayed_failure_risk: 0.50,
    scope_blindness: 0.55, externality_risk: 0.40, temporal_fragility: 0.50,
    incentive_distortion: 0.55, survivorship_bias_risk: 0.40, measurement_capture_risk: 0.45,
    note: 'KPI générique — risques variables selon contexte',
  },
  'biomarqueur': {
    aliases: ['biomarqueur', 'biomarker', 'surrogate endpoint', 'endpoint intermédiaire'],
    manipulability_risk: 0.45, proxy_distance: 0.80, delayed_failure_risk: 0.75,
    scope_blindness: 0.65, externality_risk: 0.30, temporal_fragility: 0.55,
    incentive_distortion: 0.40, survivorship_bias_risk: 0.40, measurement_capture_risk: 0.45,
    note: 'surrogate endpoint classique — Goodhart médical (HbA1c, LDL...)',
  },
  'click-through': {
    aliases: ['ctr', 'click-through rate', 'taux de clic'],
    manipulability_risk: 0.75, proxy_distance: 0.75, delayed_failure_risk: 0.55,
    scope_blindness: 0.65, externality_risk: 0.50, temporal_fragility: 0.65,
    incentive_distortion: 0.70, survivorship_bias_risk: 0.40, measurement_capture_risk: 0.65,
    note: 'click ≠ valeur, optimise pour clickbait',
  },
  'engagement': {
    aliases: ['engagement', 'time-on-site', 'session length'],
    manipulability_risk: 0.70, proxy_distance: 0.75, delayed_failure_risk: 0.60,
    scope_blindness: 0.70, externality_risk: 0.60, temporal_fragility: 0.55,
    incentive_distortion: 0.75, survivorship_bias_risk: 0.45, measurement_capture_risk: 0.60,
    note: 'engagement ≠ satisfaction, optimise pour addiction',
  },
  'precision': {
    aliases: ['precision', 'accuracy', 'taux de bonne réponse'],
    manipulability_risk: 0.40, proxy_distance: 0.55, delayed_failure_risk: 0.45,
    scope_blindness: 0.65, externality_risk: 0.30, temporal_fragility: 0.40,
    incentive_distortion: 0.45, survivorship_bias_risk: 0.55, measurement_capture_risk: 0.40,
    note: 'haute precision ≠ valeur réelle, ignore recall et coût erreur',
  },
};

// Détecte les KPI mentionnés dans un texte
function detectKPIs(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = [];
  for (const [name, profile] of Object.entries(KPI_LIBRARY)) {
    for (const alias of profile.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        found.push({ name, profile });
        break;
      }
    }
  }
  return found;
}

/**
 * Audite les métriques mentionnées dans une réponse.
 * Retourne pour chaque KPI son profil de risques + score composite.
 */
export function auditMetrics(responseText) {
  const kpis = detectKPIs(responseText);
  if (kpis.length === 0) {
    return {
      kpis_detected: [],
      worst_kpi: null,
      avg_manipulability: 0,
      avg_proxy_distance: 0,
      avg_delayed_failure: 0,
      meta_risk_composite: 0,
      verdict: 'no_kpi_detected',
    };
  }
  // Composite risk par KPI
  const audited = kpis.map(({ name, profile }) => {
    const composite = +(
      0.15 * profile.manipulability_risk
      + 0.15 * profile.proxy_distance
      + 0.15 * profile.delayed_failure_risk
      + 0.10 * profile.scope_blindness
      + 0.10 * profile.externality_risk
      + 0.10 * profile.temporal_fragility
      + 0.10 * profile.incentive_distortion
      + 0.08 * profile.survivorship_bias_risk
      + 0.07 * profile.measurement_capture_risk
    ).toFixed(3);
    return { name, ...profile, composite };
  });
  // Pire KPI
  const sorted = [...audited].sort((a, b) => b.composite - a.composite);
  const worst = sorted[0];
  // Moyennes
  const avg = key => +(audited.reduce((s, k) => s + k[key], 0) / audited.length).toFixed(3);
  return {
    kpis_detected: audited.map(k => k.name),
    audit_per_kpi: audited,
    worst_kpi: worst,
    avg_manipulability: avg('manipulability_risk'),
    avg_proxy_distance: avg('proxy_distance'),
    avg_delayed_failure: avg('delayed_failure_risk'),
    meta_risk_composite: worst.composite,
    verdict: worst.composite >= 0.65 ? 'high_meta_risk'
           : worst.composite >= 0.50 ? 'moderate_meta_risk'
           : 'low_meta_risk',
    warning: worst.composite >= 0.60
      ? `KPI ${worst.name} : ${worst.note}`
      : '',
  };
}
