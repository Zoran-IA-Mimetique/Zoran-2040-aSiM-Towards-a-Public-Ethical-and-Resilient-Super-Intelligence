// app/src/adversarial_survivability_engine.js
// Mission V12_ADVERSARIAL_SURVIVABILITY_20260517
//
// Le moteur ne cherche plus "la réponse la plus convaincante" mais
// "les hypothèses qui survivent à la destruction hostile".
//
// 5 couches, MINIMAL, destructif, falsifiable. Pas de scoring cosmétique.

import { validatePhysicalCausality } from './physical_causality_validator.js';

// ============ LAYER 1 — CLAIM EXTRACTION ============
// Extrait claims atomiques : causalité, temporalité, instrumentation, responsabilité.

const CAUSAL_CLAIM_RX = /\b([\w\s'éèàùâêîôûäëïöü-]{3,40})\s+(?:cause|causent|expliqu\w+|provoqu\w+|entra[iî]n\w+|amplifi\w+|résult\w+|révèl\w+)\s+([\w\s'éèàùâêîôûäëïöü-]{3,40})/gi;
const TEMPORAL_CLAIM_RX = /\b(\d+(?:[,.]\d+)?\s*(?:jours?|mois|ans?|h|heures?|semaines?|min)|sous \d+|à \d+\s*(?:ans?|mois)|en \d{4})\b/gi;
const INSTRUMENTATION_RX = /\b(sondage\s+\w+|CPT|fissuromètre|humidimètre|caméra thermique|carottage|piézomètre|inclinomètre|essai pénétrométrique|témoin papier|note de calcul|G\d\s*\w*)\b/gi;
const RESPONSIBILITY_RX = /\b(article \d+|décennale|RCP|assurance|opposab\w+|jurisprudence|Cass\. \d+e civ\.|tribunal|expertise judiciaire)\b/gi;
const PREDICTION_RX = /\b((?:à|sur|dans|sous) (?:\d+\s*(?:ans?|mois|jours?)|\d+ ans?)|long terme|court terme|différé|sera|deviendra|risque (?:de|que))\b/gi;

export function extractClaims(text) {
  if (!text || text.length < 30) return { claims: [], total: 0 };
  const claims = [];
  let m;
  CAUSAL_CLAIM_RX.lastIndex = 0;
  while ((m = CAUSAL_CLAIM_RX.exec(text)) !== null) {
    claims.push({ type: 'causal', cause: m[1].trim(), effect: m[2].trim(), raw: m[0] });
  }
  const temporal = [...text.matchAll(TEMPORAL_CLAIM_RX)].map(m => ({ type: 'temporal', value: m[0] }));
  const instrumentation = [...text.matchAll(INSTRUMENTATION_RX)].map(m => ({ type: 'instrumentation', tool: m[0] }));
  const responsibility = [...text.matchAll(RESPONSIBILITY_RX)].map(m => ({ type: 'responsibility', ref: m[0] }));
  const predictions = [...text.matchAll(PREDICTION_RX)].map(m => ({ type: 'prediction', horizon: m[0] }));
  return {
    claims: [...claims, ...temporal, ...instrumentation, ...responsibility, ...predictions],
    by_type: {
      causal: claims.length,
      temporal: temporal.length,
      instrumentation: instrumentation.length,
      responsibility: responsibility.length,
      prediction: predictions.length,
    },
    total: claims.length + temporal.length + instrumentation.length + responsibility.length + predictions.length,
  };
}

// ============ LAYER 2 — HOSTILE REFUTATION ============
// Pour chaque claim causal, génère contre-hypothèses adversariales.

const COUNTER_TEMPLATES = [
  c => `Et si "${c.effect}" causait en réalité "${c.cause}" (inversion temporelle) ?`,
  c => `Et si un facteur tiers caché expliquait à la fois "${c.cause}" et "${c.effect}" (confondant) ?`,
  c => `Et si "${c.cause}" était corrélé mais non causal de "${c.effect}" (artefact statistique) ?`,
  c => `Et si le mécanisme physique entre "${c.cause}" et "${c.effect}" était incompatible à l'échelle visée ?`,
];

export function generateRefutations(claims) {
  const refutations = [];
  for (const c of claims.claims.filter(c => c.type === 'causal')) {
    for (const tmpl of COUNTER_TEMPLATES) {
      refutations.push({ for_claim: c.raw, counter: tmpl(c) });
    }
  }
  return refutations;
}

// ============ LAYER 3 — PHYSICAL SURVIVABILITY ============
// Délègue au validator existant + 6 tests de compatibilité.

const SCALE_INCOMPAT_PATTERNS = [
  { micro: /\b(condensation|salpêtre|moisi)/i, macro: /\b(tassement|effondrement|mouvement (de )?fondation)/i },
  { micro: /\b(ventilation|aération)/i, macro: /\b(fondation|tassement|liquéfaction)/i },
];

const THERMODYNAMIC_VIOLATIONS = [
  { rx: /\b(?:effet|conséquence)\s+(?:précède|avant|antérieur).*cause/i, type: 'temporal_inversion' },
];

export function physicalSurvivability(text, claims) {
  // Délégation au validator existant (causal direction, scale)
  const physReport = validatePhysicalCausality(text);
  const failures = [];
  // Tests supplémentaires V12
  for (const pat of SCALE_INCOMPAT_PATTERNS) {
    if (pat.micro.test(text) && pat.macro.test(text)) {
      failures.push({ type: 'scale_micro_macro', reason: 'pathologie micro liée à effet macro improbable' });
    }
  }
  for (const v of THERMODYNAMIC_VIOLATIONS) {
    if (v.rx.test(text)) {
      failures.push({ type: v.type, reason: 'cause/effet inversés temporellement' });
    }
  }
  // Survivability score : 1 = tout passe, 0 = tout cassé
  const baseSurvival = physReport.score;
  const v12Penalty = Math.min(0.5, failures.length * 0.20);
  return {
    survivability: +Math.max(0, baseSurvival - v12Penalty).toFixed(3),
    physical_violations: physReport.violations,
    v12_violations: failures,
    total_failures: physReport.n_high_severity + failures.length,
  };
}

// ============ LAYER 4 — TRIBUNAL MODE ============
// Détecte ce qu'un expert adverse attaquerait : instrumentation manquante,
// preuve absente, falsifiabilité absente.

export function tribunalAttack(text, claims) {
  const attacks = [];
  // Manque d'instrumentation pour les claims causaux
  const causalCount = claims.by_type.causal;
  const instrumCount = claims.by_type.instrumentation;
  if (causalCount > 0 && instrumCount === 0) {
    attacks.push({
      kind: 'no_instrumentation',
      adverse_question: 'Quelle mesure terrain valide la cause prétendue ?',
      severity: 'high',
    });
  }
  // Pas de bornage temporel sur prédictions
  if (claims.by_type.prediction > 0 && claims.by_type.temporal === 0) {
    attacks.push({
      kind: 'no_temporal_bound',
      adverse_question: 'Sur quel horizon exact la prédiction est-elle valide ?',
      severity: 'high',
    });
  }
  // Pas de référence légale sur claims décennale
  if (/décennale|impropre destination|gros œuvre/i.test(text) && claims.by_type.responsibility === 0) {
    attacks.push({
      kind: 'no_legal_reference',
      adverse_question: 'Quel article exact fonde votre revendication décennale ?',
      severity: 'medium',
    });
  }
  // Pas de quantification (chiffres, seuils, unités)
  const hasQuantification = /\b\d+(?:[,.]\d+)?\s*(?:mm|cm|m|kN|MPa|°C|%|Pa|Hz|bar)\b/.test(text);
  if (causalCount > 0 && !hasQuantification) {
    attacks.push({
      kind: 'no_quantification',
      adverse_question: 'Pouvez-vous chiffrer les seuils, échelles, unités ?',
      severity: 'medium',
    });
  }
  // Falsifiabilité absente
  const hasFalsification = /\b(contre.?hypothèse|à écarter|sinon|si .{1,30} faux|à infirmer)\b/i.test(text);
  if (causalCount > 0 && !hasFalsification) {
    attacks.push({
      kind: 'no_falsification',
      adverse_question: 'Quelle observation invaliderait votre conclusion ?',
      severity: 'high',
    });
  }
  return attacks;
}

// ============ LAYER 5 — IRREVERSIBILITY FILTER ============
// Filtre final : combien de claims survivent ?

export function irreversibilityFilter(text) {
  const claims = extractClaims(text);
  const refutations = generateRefutations(claims);
  const physical = physicalSurvivability(text, claims);
  const tribunalAttacks = tribunalAttack(text, claims);

  // Compteur de survie
  const totalCausalClaims = claims.by_type.causal;
  // Claims détruits = inversions physiques + violations échelle
  const destroyed = physical.physical_violations.length + physical.v12_violations.length;
  // Claims fragiles = ceux pour lesquels tribunal a des attaques high severity
  const fragile = tribunalAttacks.filter(a => a.severity === 'high').length;
  // Claims survivants = causaux - détruits - fragiles
  const survivors = Math.max(0, totalCausalClaims - destroyed - fragile);

  // Niveau de confiance global
  const totalClaims = claims.total;
  const confidence = totalClaims === 0 ? 0
    : +(survivors / Math.max(1, totalCausalClaims)).toFixed(3);

  // Score V12 = composite survivability
  // Composite : 0.4 × physical + 0.3 × (1 - fragile_ratio) + 0.3 × confidence
  const fragileRatio = totalCausalClaims === 0 ? 0 : Math.min(1, fragile / totalCausalClaims);
  const v12_score = +(
    0.40 * physical.survivability
    + 0.30 * (1 - fragileRatio)
    + 0.30 * confidence
  ).toFixed(3);

  return {
    v12_score,
    claims_extracted: claims.total,
    causal_claims: totalCausalClaims,
    claims_destroyed: destroyed,
    claims_fragile: fragile,
    claims_survivors: survivors,
    physical_survivability: physical.survivability,
    physical_violations: physical.physical_violations,
    v12_violations: physical.v12_violations,
    tribunal_attacks: tribunalAttacks,
    counter_hypotheses_generated: refutations.length,
    confidence_level: confidence,
    verdict: v12_score >= 0.70 ? 'SURVIVES_CONTRADICTORY'
           : v12_score >= 0.50 ? 'PARTIALLY_FRAGILE'
           : v12_score >= 0.30 ? 'STRUCTURALLY_FRAGILE'
           : 'DESTROYED_BY_CONTRADICTORY',
  };
}

// ============ EXPORT PRINCIPAL ============
export function adversarialSurvivability(text) {
  return irreversibilityFilter(text);
}
