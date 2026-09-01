// tools/test_v4_detectors.mjs
// Validation empirique des 4 détecteurs V4 + domain_leak.

import {
  detectSeductiveButFragile, futureHiddenCost,
  perturbationRobustness, antiMonocauseEarlyLock,
  runFragilityDetector,
} from '../app/src/fragility_detector.js';
import { detectDomainLeak } from '../app/src/domain_leak.js';

const CASES = [
  {
    name: 'SEDUCTIVE_FRAGILE — Réponse confiante sans humilité',
    text: `Il faut absolument installer ce système. C'est toujours la meilleure solution
    et garantit certainement le résultat. Vous devez l'adopter sans aucun doute, c'est
    impératif. Aucune alternative n'est nécessaire.`,
    expect: { seductive_high: true, fragility_risk_high: true },
  },
  {
    name: 'HUMBLE_ROBUST — Réponse calibrée avec hedges',
    text: `Cette solution est probable mais à vérifier selon le contexte. En général
    elle fonctionne, sous réserve de validation par un expert. Plan B : si cette option
    échoue, recourir à l'alternative B. À condition que les variables restent stables.`,
    expect: { seductive_low: true, perturbation_robust: true },
  },
  {
    name: 'HIDDEN_COST — Gain immédiat ignore le long terme',
    text: `Pour une amélioration directe, installer ce composant donne un gain immédiat.
    Vous pouvez remplacer l'ancien système, optimiser le rendement, supprimer la
    redondance pour réduire les coûts. Effet immédiat garanti.`,
    expect: { hidden_cost_high: true },
  },
  {
    name: 'LONG_TERM_AWARE — Considère amortissement',
    text: `Installer ce composant donne un gain immédiat. Mais sur 5 ans, il faut
    considérer l'amortissement, la maintenance, le coût d'opportunité. À terme,
    l'effet cumulé peut créer une dette technique. Évaluer la durée de vie réelle.`,
    expect: { hidden_cost_low: true },
  },
  {
    name: 'EARLY_LOCK — Verrouillage causal précoce',
    text: `Le problème vient manifestement du joint d'étanchéité. C'est clairement
    à cause de ce composant que tout dysfonctionne. La cause est évidente : le joint
    est défectueux. S'explique uniquement par cette pièce.`,
    expect: { monocause_lock: true },
  },
  {
    name: 'ALTERNATIVE_EXPLORATION — Multi-hypothèses',
    text: `Plusieurs causes possibles à examiner : joint d'étanchéité, défaut de
    montage, fatigue matière, ou cofacteurs environnementaux. À distinguer aussi
    de hypothèses différentielles : surcharge, vibration, corrosion. Il faut
    envisager aussi un défaut de conception. En l'absence d'autres causes,
    examiner d'autres pistes avant de conclure.`,
    expect: { monocause_explored: true },
  },
  {
    name: 'DOMAIN_LEAK_BRUTAL — Refus en intro',
    text: `Désolé, ce n'est pas mon domaine de compétence. Je ne suis pas spécialiste
    de ce sujet. Veuillez consulter un expert qualifié.`,
    expect: { domain_leak: true },
  },
  {
    name: 'DOMAIN_LEAK_NONE — Réponse pleine',
    text: `Pour vérifier l'étanchéité, contrôler le joint silicone, vérifier la
    planéité de la surface, mesurer le couple de serrage à 35 Nm selon DTU 25.41.
    Inspecter visuellement les éventuelles déformations.`,
    expect: { domain_leak: false },
  },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V4 — fragility_detector + domain_leak');
console.log('═══════════════════════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const c of CASES) {
  console.log(`▶ ${c.name}`);
  const frag = runFragilityDetector(c.text);
  const leak = detectDomainLeak(c.text);
  console.log(`  fragility_risk      : ${frag.fragility_risk}`);
  console.log(`    seductive         : ${frag.detectors.seductive_but_fragile.score}`);
  console.log(`    hidden_cost       : ${frag.detectors.future_hidden_cost.score}`);
  console.log(`    perturbation_rob  : ${frag.detectors.perturbation_robustness.score}`);
  console.log(`    anti_monocause    : ${frag.detectors.anti_monocause_early_lock.score}`);
  console.log(`  domain_leak         : ${leak.score} (detected=${leak.leak_detected})`);

  let ok = true;
  if (c.expect.seductive_high && frag.detectors.seductive_but_fragile.score < 0.40) ok = false;
  if (c.expect.seductive_low && frag.detectors.seductive_but_fragile.score >= 0.40) ok = false;
  if (c.expect.fragility_risk_high && frag.fragility_risk < 0.40) ok = false;
  if (c.expect.hidden_cost_high && frag.detectors.future_hidden_cost.score < 0.40) ok = false;
  if (c.expect.hidden_cost_low && frag.detectors.future_hidden_cost.score >= 0.40) ok = false;
  if (c.expect.perturbation_robust && frag.detectors.perturbation_robustness.score < 0.60) ok = false;
  if (c.expect.monocause_lock && frag.detectors.anti_monocause_early_lock.score >= 0.40) ok = false;
  if (c.expect.monocause_explored && frag.detectors.anti_monocause_early_lock.score < 0.55) ok = false;
  if (c.expect.domain_leak === true && !leak.leak_detected) ok = false;
  if (c.expect.domain_leak === false && leak.leak_detected) ok = false;

  console.log(`  → ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT V4 : ${pass}/${pass + fail} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail === 0 ? 0 : 1);
