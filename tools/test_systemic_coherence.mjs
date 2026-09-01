// tools/test_systemic_coherence.mjs
// Test empirique : les détecteurs Goodhart fonctionnent-ils sur des
// textes canoniques ? Pas de LLM, juste validation des heuristiques.

import {
  resilienceScore, multiscaleCoherence, falseBenefitDetection,
  causalRobustness, longTermViability, systemicCoherenceScore,
  systemicCoherenceReport,
} from '../app/src/systemic_coherence.js';

import {
  detectFalseOptimization, detectProxyCollapse, detectMetricTunnel,
  detectLocalVsGlobalConflict, runAntiGoodhart,
} from '../app/src/anti_goodhart.js';

// ───────── CAS DE TEST ─────────
const CASES = [
  {
    name: 'BAD_GOODHART_PURE — Réponse Goodhart classique',
    text: `Pour améliorer la performance, il faut maximiser le KPI de productivité,
    augmenter le score de satisfaction et optimiser le DPE du bâtiment. On va
    pousser au maximum chaque indicateur pour gouverner uniquement par la
    métrique de performance. La seule cause du problème est le manque
    d'optimisation locale.`,
    expect: { goodhart_high: true, systemic_low: true },
  },
  {
    name: 'GOOD_SYSTEMIC — Réponse cohérence systémique',
    text: `Le DPE est un proxy utile mais ne capture pas la réalité terrain :
    inertie thermique, qualité d'air, durabilité long terme. Optimiser au prix
    d'une élimination des marges de ventilation crée une dette invisible à
    moyen terme. Cause multi-factorielle : ponts thermiques + comportements
    occupants + cofacteurs climatiques. À vérifier sur 5 ans : effet rebond
    possible. Préserver redondance et marges de sécurité reste prioritaire.`,
    expect: { goodhart_high: false, systemic_high: true },
  },
  {
    name: 'NEUTRAL — Réponse technique sans signal Goodhart',
    text: `La toiture présente une fuite localisée. Vérifier l'étanchéité au
    niveau de la noue. Coût estimé 800 €. Délai 2 jours. Prévoir intervention
    par temps sec.`,
    expect: { goodhart_low: true, systemic_neutral: true },
  },
  {
    name: 'BAD_LOCAL_GLOBAL — Optimisation locale destructrice',
    text: `Pour résoudre le problème immédiat, on va optimiser ce composant
    spécifique et maximiser son rendement. Gain immédiat garanti à court terme
    uniquement, à pousser au maximum pour driver à fond la performance locale.`,
    expect: { goodhart_high: true },
  },
  {
    name: 'GOOD_MULTICAUSE — Robustesse causale élevée',
    text: `Le diagnostic est multi-factoriel : interaction entre fragilité
    osseuse, médication anticoagulante et déclin cognitif progressif. Cofacteurs
    environnementaux à considérer. Corrélation n'est pas causalité — la chute
    peut résulter de la conjonction de plusieurs facteurs, pas d'une cause
    unique. Effet en cascade probable sur 6-12 mois.`,
    expect: { causal_high: true, goodhart_low: true },
  },
];

// ───────── EXÉCUTION ─────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST EMPIRIQUE — SYSTEMIC_COHERENCE + ANTI_GOODHART');
console.log('═══════════════════════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const c of CASES) {
  console.log(`▶ ${c.name}`);
  const sysReport = systemicCoherenceReport(c.text);
  const goodReport = runAntiGoodhart(c.text);
  console.log(`  systemic_coherence  : ${sysReport.composite}`);
  console.log(`    resilience        : ${sysReport.resilience}`);
  console.log(`    multiscale        : ${sysReport.multiscale}`);
  console.log(`    false_benefit_det : ${sysReport.false_benefit_detec}`);
  console.log(`    causal_robust     : ${sysReport.causal_robustness}`);
  console.log(`    long_term         : ${sysReport.long_term_viability}`);
  console.log(`  goodhart_risk       : ${goodReport.goodhart_risk}`);
  console.log(`  fired_count         : ${goodReport.fired_count}/4`);
  for (const [code, check] of Object.entries(goodReport.checks)) {
    if (check.fires) {
      console.log(`    ⚠ ${code} (score ${check.score}) — ${check.hint.slice(0, 80)}`);
    }
  }
  // Validation des attentes
  let ok = true;
  if (c.expect.goodhart_high && goodReport.goodhart_risk < 0.30) ok = false;
  if (c.expect.goodhart_low && goodReport.goodhart_risk >= 0.30) ok = false;
  // Composite 5 axes : 0.5 = bon, 0.35 = faible. Calibration empirique.
  if (c.expect.systemic_high && sysReport.composite < 0.45) ok = false;
  if (c.expect.systemic_low && sysReport.composite >= 0.35) ok = false;
  if (c.expect.causal_high && sysReport.causal_robustness < 0.7) ok = false;
  if (c.expect.systemic_neutral && (sysReport.composite < 0.20 || sysReport.composite > 0.50)) ok = false;
  console.log(`  → ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT : ${pass}/${pass + fail} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail === 0 ? 0 : 1);
