// app/src/zoran_cta_engine.js
// Mission V9 — CTA (Call-To-Analysis) GENERATOR
//
// Génère 3 CTA obligatoires pour TOUTE réponse (pas seulement BTP) :
//   1. systemic_risk_cta       — risque caché / différé / Goodhart / dette
//   2. field_validation_cta    — mesures terrain qui trancheraient
//   3. counter_hypothesis_cta  — hypothèse alternative invalidante
//
// Objectif : forcer le système à ne JAMAIS conclure sans :
//   - examen du risque non-mesuré
//   - check empirique discriminant
//   - tentative de réfutation

import { detectDomain } from './domain_detection.js';
import { auditMetrics } from './meta_metric_auditor.js';

// Catalogues de mesures terrain par domaine
const FIELD_MEASURES_BY_DOMAIN = {
  btp: [
    'sondage destructif à plusieurs profondeurs',
    'caméra thermique infrarouge sur paroi suspecte',
    'humidimètre à pointes (Protimeter) sur 5+ points',
    'fissuromètre étalonné posé 6+ mois',
    'inclinomètre / accéléromètre triaxial',
    'essai pénétrométrique CPT in situ',
    'piézomètre nappe sur 12+ mois',
    'rapport BET structure avec note de calcul',
    'analyse argile gonflante laboratoire',
    'test étanchéité à l\'air infiltrométrie',
  ],
  medicine: [
    'NFS + plaquettes + CRP',
    'imagerie ciblée (échographie/IRM/scanner)',
    'biologie spécialisée (marqueurs spécifiques)',
    'ECG 12 dérivations + Holter 24h',
    'avis spécialiste contradictoire',
    'test fonctionnel spécifique au territoire',
    'biopsie / cytologie en cas de doute',
  ],
  legal: [
    'consultation des conclusions adverses',
    'examen des pièces matérielles',
    'audit chronologique des actes',
    'expertise contradictoire indépendante',
    'cite à témoin sur faits matériels',
    'recherche jurisprudence récente Cass.',
  ],
  physics: [
    'mesure indépendante par 2 instruments différents',
    'reproduction expérimentale par tiers',
    'analyse dimensionnelle',
    'check ordre de grandeur',
    'simulation numérique avec conditions limites variées',
  ],
  ai_robustness: [
    'évaluation sur dataset out-of-distribution',
    'perturbation adversariale (FGSM, PGD)',
    'test inversion temporelle / mutation prompt',
    'comparaison avec baseline non-LLM',
    'audit human-in-the-loop sur 100 cas',
  ],
  general: [
    'observation empirique reproductible',
    'mesure quantifiée indépendante',
    'avis contradictoire externe',
    'documentation traçable des hypothèses',
  ],
};

// Catalogues de risques systémiques par domaine
const SYSTEMIC_RISKS_BY_DOMAIN = {
  btp: [
    'dégradation différée à 5-10 ans non visible aujourd\'hui',
    'cofacteur géotechnique masqué (nappe, RGA, tassement)',
    'décennale engagée sans alerte préalable au maître d\'ouvrage',
    'cascade pathologique (humidité → corrosion armature → faiblesse structurelle)',
    'externalité voisine (mitoyen, voirie, hydrologie)',
  ],
  medicine: [
    'progression silencieuse non capturée par biomarqueur',
    'effet iatrogène cumulé sur 5+ ans',
    'cofacteur comorbidité non interrogé',
    'fenêtre thérapeutique manquée par retard diagnostique',
  ],
  legal: [
    'prescription en cours non identifiée',
    'opposabilité au tiers de bonne foi',
    'jurisprudence récente non considérée',
    'effet rétroactif d\'une décision récente',
  ],
  physics: [
    'régime non-linéaire ignoré hors domaine de validité',
    'effet quantique/relativiste à l\'échelle considérée',
    'biais de mesure systémique non corrigé',
  ],
  ai_robustness: [
    'dérive de distribution post-déploiement',
    'jailbreak adversarial non détecté',
    'spécification gaming (Goodhart sur métrique évaluation)',
  ],
  general: [
    'effet à long terme non mesuré',
    'externalité non comptabilisée',
    'biais de sélection survivants',
    'Goodhart sur métrique de succès',
  ],
};

/**
 * Génère le CTA #1 — risque systémique.
 */
export function generateSystemicRiskCTA({ question, responseText = '', domain = null }) {
  const dom = domain || detectDomain(question || '').key || 'general';
  const risks = SYSTEMIC_RISKS_BY_DOMAIN[dom] || SYSTEMIC_RISKS_BY_DOMAIN.general;
  // Si réponse contient KPI → injecter audit méta-risque
  const metricAudit = auditMetrics(responseText);
  const kpiNote = metricAudit.kpis_detected.length > 0
    ? ` Attention particulièrement à : ${metricAudit.worst_kpi?.name} (risque ${metricAudit.meta_risk_composite}).`
    : '';
  return {
    kind: 'systemic_risk',
    title: 'Risque caché ou différé',
    question: 'Quel est le risque caché ou différé non mesuré ?',
    examples: risks.slice(0, 3),
    kpi_warning: kpiNote || null,
    text: `**Risque systémique à examiner** : ${risks.slice(0, 3).join(' · ')}.${kpiNote}`,
  };
}

/**
 * Génère le CTA #2 — validation terrain.
 */
export function generateFieldValidationCTA({ question, responseText = '', domain = null }) {
  const dom = domain || detectDomain(question || '').key || 'general';
  const measures = FIELD_MEASURES_BY_DOMAIN[dom] || FIELD_MEASURES_BY_DOMAIN.general;
  return {
    kind: 'field_validation',
    title: 'Validation terrain',
    question: 'Quelles mesures terrain permettraient réellement de trancher ?',
    examples: measures.slice(0, 4),
    text: `**Mesures terrain discriminantes** : ${measures.slice(0, 4).join(' · ')}.`,
  };
}

/**
 * Génère le CTA #3 — contre-hypothèse.
 */
export function generateCounterHypothesisCTA({ question, responseText = '', domain = null }) {
  // Templates de contre-hypothèses génériques
  const templates = [
    'la cause réelle est ailleurs (cofacteur masqué)',
    'le signal observé est artefact de mesure',
    'la corrélation est inversée temporellement',
    'un facteur tiers explique les deux phénomènes (confounder)',
    'le diagnostic est correct mais la priorité est ailleurs (urgence cachée)',
    'la solution proposée crée une dette différée plus grande que le gain immédiat',
  ];
  return {
    kind: 'counter_hypothesis',
    title: 'Hypothèse alternative',
    question: 'Quelle hypothèse alternative plausible pourrait invalider cette conclusion ?',
    examples: templates.slice(0, 3),
    text: `**Contre-hypothèses à tester** : ${templates.slice(0, 3).join(' · ')}.`,
  };
}

/**
 * Génère les 3 CTA agrégés pour une réponse donnée.
 */
export function generateAllCTAs({ question, responseText = '', domain = null }) {
  return {
    systemic_risk: generateSystemicRiskCTA({ question, responseText, domain }),
    field_validation: generateFieldValidationCTA({ question, responseText, domain }),
    counter_hypothesis: generateCounterHypothesisCTA({ question, responseText, domain }),
  };
}

/**
 * Détecte si une réponse contient DÉJÀ les 3 CTA (ne pas dupliquer).
 */
const CTA_PRESENCE_RX = {
  systemic_risk:     /\b(risque (caché|différé|systémique)|dette invisible|collapse différé|Goodhart|effet à long terme non|externalité non)\b/i,
  field_validation:  /\b(mesures terrain|instrumentation|à vérifier (par|sur le terrain)|sondage|caméra thermique|biopsie|reproduction expérimentale|données discriminantes)\b/i,
  counter_hypothesis:/\b(et si|hypothèse alternative|contre.?hypothèse|à réfuter|pourrait être (en fait|plutôt)|confounder|biais de mesure)\b/i,
};

export function detectCTAPresence(text) {
  if (!text) return { all_present: false, present: {}, missing: ['systemic_risk', 'field_validation', 'counter_hypothesis'] };
  const present = {};
  const missing = [];
  for (const [kind, rx] of Object.entries(CTA_PRESENCE_RX)) {
    present[kind] = rx.test(text);
    if (!present[kind]) missing.push(kind);
  }
  return {
    all_present: missing.length === 0,
    present,
    missing,
    coverage: +((3 - missing.length) / 3).toFixed(3),
  };
}
