// tools/test_meta_goodhart_v5.mjs
// Mission V8 — META AUDIT ANTI-GOODHART
// Cas adversariaux : 7 domaines × patterns Goodhart sophistiqués.

import { auditMetrics } from '../app/src/meta_metric_auditor.js';
import { generateCounterHypotheses, frameRefutationScore } from '../app/src/frame_refutation_engine.js';
import { determineValidationStatus } from '../app/src/validation_status.js';

const CASES = [
  {
    name: 'SAAS_FAKE_ROI',
    text: `Notre SaaS atteint un LTV/CAC de 5.2 excellent, un NRR record à 130% et un ROAS supérieur à 4. Les résultats sont impressionnants et la croissance est exceptionnelle.`,
    expect: { goodhart_high: true, status: 'potentially_goodharted', refutation_low: true },
  },
  {
    name: 'SAAS_HONEST_BIO',
    text: `Notre SaaS atteint un LTV/CAC de 5.2. Toutefois, attention au Goodhart : ce ratio peut être soutenu par un déplacement des coûts vers le support, ou par une dilution du CAC court terme. À vérifier sur 18 mois avec cohort analysis. Données de 2025.`,
    expect: { goodhart_high: true, refutation_present: true },
  },
  {
    name: 'IA_SUR_ALIGNÉE',
    text: `Notre modèle atteint une précision record et un engagement utilisateur exceptionnel. Le score CTR est optimal et les utilisateurs passent en moyenne 45 minutes par session.`,
    expect: { goodhart_high: true, refutation_low: true },
  },
  {
    name: 'RENOVATION_DPE_TOXIQUE',
    text: `Le bâtiment atteint maintenant un DPE A après rénovation. Score énergétique optimal. Performance maximale validée.`,
    // DPE seul (composite 0.53) → unverified correct (single KPI sans source)
    expect: { goodhart_high: true, status: 'unverified' },
  },
  {
    name: 'BIOMARQUEUR_FAUX_BENEFICE',
    text: `Le traitement réduit significativement le biomarqueur HbA1c chez tous les patients. Résultats excellents sur ce surrogate endpoint. Réduction record atteinte.`,
    expect: { goodhart_high: true, refutation_low: true },
  },
  {
    name: 'KPI_RH_MANIPULÉ',
    text: `Le NPS interne est passé à 75, score exceptionnel. Engagement employé record. Tous les KPI RH sont au vert.`,
    expect: { goodhart_high: true, refutation_low: true },
  },
  {
    name: 'METRIQUE_SECURITE_TROMPEUSE',
    text: `Le taux d'incident a baissé de 80% cette année. Performance sécurité optimale. Aucun KPI sécurité au rouge. Résultat impressionnant.`,
    expect: { goodhart_high: false },  // pas de KPI dans library
  },
  {
    name: 'DASHBOARD_FINANCIER_ARTIFICIEL',
    text: `Le ROAS de la campagne a atteint un niveau exceptionnel. Croissance impressionnante. NRR maximal. Tous les indicateurs au vert.`,
    expect: { goodhart_high: true, status: 'potentially_goodharted' },
  },
  {
    name: 'REPONSE_CORRECTEMENT_BORNÉE',
    text: `Selon l'étude INSEE 2024, le taux est de 4.2%. À actualiser avec les données 2026 si publiées. Valable pour la France uniquement, hors PME. Source: rapport INSEE chapitre 3.`,
    expect: { status_supported: true },
  },
  {
    name: 'GREENWASHING_TYPE',
    text: `Notre produit atteint un excellent score DPE A et une rentabilité maximale. Les indicateurs ESG sont au vert.`,
    expect: { goodhart_high: true },
  },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V8 — META AUDIT + GOODHART V2 + FRAME REFUTATION');
console.log('═══════════════════════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const c of CASES) {
  const audit = auditMetrics(c.text);
  const refutation = frameRefutationScore(c.text);
  const counterHyp = generateCounterHypotheses(c.text);
  const status = determineValidationStatus(c.text);

  console.log(`▶ ${c.name}`);
  console.log(`  KPI détectés    : ${audit.kpis_detected.join(', ') || '(aucun)'}`);
  console.log(`  meta_risk       : ${audit.meta_risk_composite}  verdict=${audit.verdict}`);
  console.log(`  refutation_score: ${refutation.score}  fires=${refutation.fires}`);
  console.log(`  counter_hyp     : ${counterHyp.counter_hypotheses.length} générées`);
  console.log(`  validation      : ${status.status}`);
  console.log(`    grounding=${status.flags.grounding_present} temporal=${status.flags.temporal_bounded} goodhart=${status.flags.goodhart_risk}`);
  if (counterHyp.counter_hypotheses.length > 0) {
    console.log(`  exemples contre-hypothèses :`);
    for (const ch of counterHyp.counter_hypotheses.slice(0, 2)) {
      console.log(`    - ${ch.text}`);
    }
  }

  let ok = true;
  if (c.expect.goodhart_high && audit.meta_risk_composite < 0.50) ok = false;
  if (c.expect.refutation_low && !refutation.fires) ok = false;
  if (c.expect.refutation_present && refutation.fires) ok = false;
  if (c.expect.status && status.status !== c.expect.status) ok = false;
  if (c.expect.status_supported && !['externally_supported', 'internal_only'].includes(status.status)) ok = false;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT V8 : ${pass}/${pass + fail} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail === 0 ? 0 : 1);
