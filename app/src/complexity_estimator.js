// app/src/complexity_estimator.js
// Mission V6 — COMPLEXITY_ESTIMATOR
//
// Calcule AVANT toute orchestration ZORAN :
//   - complexity_score [0..1]
//   - ambiguity_score [0..1]
//   - causal_depth [0..1]
//   - risk_score [0..1]
//   - expected_gain [0..1]
//
// → depth_required ∈ { simple | medium | deep | fractal }
//
// Principe : éviter la sur-orchestration sur questions triviales.
// "Qui est X ?" doit déclencher SIMPLE, pas FRACTAL.

// Marqueurs de triviality (questions identité simple, factuelle)
const TRIVIAL_PATTERNS_RX = /^(qui est|qu['']est.?ce que|c['']est quoi|où (est|se trouve)|quand|combien|quelle est la (définition|signification)|comment s['']appelle|nom de)\b/i;

// Marqueurs de complexité causale
const CAUSAL_DEPTH_RX = /\b(pourquoi|comment se fait.il|d['']où vient|à cause de|expliqu\w+|origine\w*|provoqu\w+|entra[iî]n\w+|cause profonde|cause racine|mécanisme\w*)\b/gi;

// Marqueurs de profondeur multi-cadre
const MULTICADRE_RX = /\b(et\s+\w+\s+et\s+\w+|à la fois|simultanément|multi.?(factoriel\w*|cadre\w*|dimensionnel\w*)|interaction\w*|système\w* complexe\w*)\b/gi;

// Marqueurs de risque
const RISK_RX = /\b(critique|vital|urgent|dangereux|grave|catastroph|sécurit|santé|patient|effondre|défaill)\b/gi;

// Marqueurs d'ambiguïté (question floue, multiple sens possible)
const AMBIGUITY_RX = /\b(ou|ou bien|peut.être|différent\w* sens|ambigu|flou|imprécis)\b/gi;

// Marqueurs de profondeur attendue (question explicite)
const DEEP_REQUEST_RX = /\b(détaill(é|er)|exhaustif|analyse complète|étude|approfondi|en profondeur|tous les aspects|comparaison|synthèse|bilan)\b/gi;

// Marqueurs de domaine technique (augmente complexité)
// Note : pas de \b final car les mots français à accent (opposabilité, impédance)
// ne ferment pas avec word boundary ASCII. Le \b initial suffit.
const TECHNICAL_DOMAIN_RX = /\b(DTU|Eurocode|IEC|ISO\s+\d|HAS|jurisprudence\w*|jurisprudentiel\w*|arrêt\w*|article \d+|opposabilité|opposabilités|impédance|résistance|moment fléch\w*|amortissement|propagation\w*|isomorph\w*)(?=[^a-zA-Z]|$)/gi;

// Marqueurs d'action / comment (boost medium au minimum)
const ACTION_REQUEST_RX = /\b(comment\b|que faire|comment faire|étapes?\b|procédure|méthode|protocole)\b/i;

/**
 * Estime la complexité d'une question AVANT toute orchestration.
 * Gating hybride : score traçable + règles de routage.
 *
 * @param {string} question
 * @returns {object} estimate complet
 */
export function estimateComplexity(question) {
  if (!question || question.length < 3) {
    return {
      depth_required: 'simple',
      recommended_pipeline: 'baseline_only',
      complexity_score: 0,
      reasoning: ['question vide ou trop courte'],
    };
  }

  const trimmed = question.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0).length;
  const isTrivial = TRIVIAL_PATTERNS_RX.test(trimmed);
  const isAction = ACTION_REQUEST_RX.test(trimmed);
  const causalDepth = (trimmed.match(CAUSAL_DEPTH_RX) || []).length;
  const multicadre = (trimmed.match(MULTICADRE_RX) || []).length;
  const risk = (trimmed.match(RISK_RX) || []).length;
  const ambiguity = (trimmed.match(AMBIGUITY_RX) || []).length;
  const deepRequest = (trimmed.match(DEEP_REQUEST_RX) || []).length;
  const technical = (trimmed.match(TECHNICAL_DOMAIN_RX) || []).length;
  const subQuestions = (trimmed.match(/[?]/g) || []).length;
  const clauses = (trimmed.match(/[,;]/g) || []).length + (trimmed.match(/\bet\b/gi) || []).length;

  // Composantes (utilisées pour score traçable, pas pour routage)
  const c_length = Math.min(1, words / 40);
  const c_causal = Math.min(1, causalDepth * 0.40);
  const c_multi  = Math.min(1, multicadre * 0.50);
  const c_risk   = Math.min(1, risk * 0.40);
  const c_amb    = Math.min(1, ambiguity * 0.40);
  const c_deep   = Math.min(1, deepRequest * 0.50);
  const c_tech   = Math.min(1, technical * 0.30);
  const c_clauses = Math.min(0.3, clauses * 0.08);

  const trivialDiscount = isTrivial && words < 12 && causalDepth === 0 && technical === 0
    ? 0.50
    : isTrivial && words < 20 && causalDepth === 0
    ? 0.25
    : 0;

  let complexity_score = (
    0.10 * c_length
    + 0.20 * c_causal
    + 0.15 * c_multi
    + 0.15 * c_risk
    + 0.10 * c_amb
    + 0.15 * c_deep
    + 0.10 * c_tech
    + 0.05 * c_clauses
  );
  complexity_score = Math.max(0, complexity_score - trivialDiscount);
  complexity_score = +Math.min(1, complexity_score).toFixed(3);

  // ═══ GATING RULE-BASED ═══
  // Priorité 1 — triviality forte : "qui est X" court sans signal complexe
  let depth_required, recommended_pipeline;
  const fractalConditions = (deepRequest > 0 && (multicadre > 0 || risk > 0))
                         || (multicadre > 0 && technical > 0 && causalDepth > 0)
                         || (words > 25 && causalDepth > 0 && technical > 0);
  const deepConditions = causalDepth > 0 && (isAction || clauses >= 2 || words > 15)
                      || (multicadre > 0 && (causalDepth > 0 || words > 15))
                      || (technical > 0 && causalDepth > 0)
                      || (subQuestions >= 2 && (causalDepth > 0 || multicadre > 0));
  const mediumConditions = isAction
                        || causalDepth > 0
                        || technical > 0
                        || deepRequest > 0
                        || words > 20;

  if (fractalConditions) {
    depth_required = 'fractal';
    recommended_pipeline = 'full_v4_plus_adversarial';
  } else if (deepConditions) {
    depth_required = 'deep';
    recommended_pipeline = 'full_v4';
  } else if (mediumConditions && !(isTrivial && words < 12)) {
    depth_required = 'medium';
    recommended_pipeline = 'baseline_plus_rezo_light';
  } else {
    depth_required = 'simple';
    recommended_pipeline = 'baseline_only';
  }

  // Reasoning humain
  const reasoning = [];
  if (isTrivial) reasoning.push(`pattern trivial "qui est/c'est quoi/quand…"`);
  if (isAction) reasoning.push(`action/comment`);
  if (words < 12) reasoning.push(`question courte (${words} mots)`);
  if (causalDepth > 0) reasoning.push(`${causalDepth} marqueur(s) causal(aux)`);
  if (multicadre > 0) reasoning.push(`${multicadre} marqueur(s) multi-cadre`);
  if (risk > 0) reasoning.push(`${risk} marqueur(s) risque`);
  if (technical > 0) reasoning.push(`${technical} référence(s) technique(s)`);
  if (deepRequest > 0) reasoning.push(`${deepRequest} demande(s) profondeur explicite`);
  if (clauses >= 2) reasoning.push(`${clauses} clauses`);
  if (trivialDiscount > 0) reasoning.push(`-${trivialDiscount} discount triviality`);

  return {
    depth_required,
    recommended_pipeline,
    complexity_score,
    components: {
      length: +c_length.toFixed(3),
      causal: +c_causal.toFixed(3),
      multicadre: +c_multi.toFixed(3),
      risk: +c_risk.toFixed(3),
      ambiguity: +c_amb.toFixed(3),
      deep_request: +c_deep.toFixed(3),
      technical: +c_tech.toFixed(3),
      clauses: +c_clauses.toFixed(3),
      trivial_discount: trivialDiscount,
    },
    indicators: {
      is_trivial: isTrivial,
      words,
      sub_questions: subQuestions,
    },
    reasoning,
  };
}
