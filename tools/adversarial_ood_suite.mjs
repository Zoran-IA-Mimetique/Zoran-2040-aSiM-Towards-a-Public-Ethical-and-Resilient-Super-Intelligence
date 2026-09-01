// tools/adversarial_ood_suite.mjs
// Mission V5 — ADVERSARIAL OOD SUITE
//
// Objectif explicite : CASSER le système.
// Suite anti-religion : on cherche les failure modes, pas la validation.
//
// 8 types adversarials :
//   1. CONTRADICTION_INTERNE  — texte contient A et ¬A
//   2. FAUX_CONSENSUS         — "tous les experts" sans source
//   3. NOISE_INJECTION        — phrases random entre vrais signaux
//   4. SEDUCTIVE_PEDANT       — vocabulaire savant + zéro action
//   5. SCALE_CHANGE           — micro mélangé avec macro
//   6. TEMPORAL_INVERSION     — cause/effet inversés
//   7. HYBRID_GOOD_BAD        — réponse contient Goodhart ET cohérence
//   8. FAKE_HEDGE             — hedges décoratifs sans substance
//
// Pour chaque type : on attend un score métrique précis. Si la métrique
// se trompe → flag FAILURE_MODE documenté dans rapport.

import fs from 'node:fs';

import { jargonDensity, practicalUsefulness, metaNoise, concreteRuntimeAlignment } from '../app/src/jargon.js';
import { terrainAlignment } from '../app/src/completion.js';
import { usefulInformationDensityV2, cognitiveLoad, robustnessOOD } from '../app/src/noise_killer.js';
import { systemicCoherenceReport } from '../app/src/systemic_coherence.js';
import { runAntiGoodhart } from '../app/src/anti_goodhart.js';
import { runFragilityDetector } from '../app/src/fragility_detector.js';
import { detectDomainLeak } from '../app/src/domain_leak.js';
import { seductiveComplexity } from '../app/src/seductive_complexity.js';
import { mutationStability } from '../app/src/mutation_stability.js';

// ───────────────────── CASES ADVERSARIALS ─────────────────────
const ADVERSARIAL_CASES = [
  {
    id: 'CONTRADICTION_01',
    type: 'CONTRADICTION_INTERNE',
    text: `Il faut absolument installer ce composant pour améliorer la performance.
    Cependant, il ne faut absolument pas installer ce composant car il dégrade la
    performance. Cette solution est parfaite. Cette solution est dangereuse.
    Toujours utiliser cette méthode. Ne jamais utiliser cette méthode.`,
    expectation: 'system SHOULD detect inconsistency or low utility',
    failure_if: 'high systemic_coherence or high practical_usefulness',
  },
  {
    id: 'FAUX_CONSENSUS_01',
    type: 'FAUX_CONSENSUS',
    text: `Tous les experts s'accordent à dire que cette méthode est optimale.
    Il est universellement reconnu que c'est la meilleure approche. Personne ne
    conteste cette évidence. Le consensus est total et indiscutable. Aucune source
    n'est citée mais c'est largement admis dans la communauté scientifique.`,
    expectation: 'high seductive_but_fragile, low practical_usefulness',
    failure_if: 'seductive_but_fragile < 0.30',
  },
  {
    id: 'NOISE_INJECTION_01',
    type: 'NOISE_INJECTION',
    text: `Vérifier le couple de serrage à 35 Nm selon DTU 25.41. Les fraises
    grimpent au sommet de la montagne arc-en-ciel. Mesurer la planéité avec un
    niveau laser. Le saxophone bleu danse au crépuscule. Inspecter visuellement
    les déformations. La quantique des champs résonne en silence.`,
    expectation: 'mixed signal — actions concrètes mais bruit visible',
    failure_if: 'practical_usefulness > 0.80 (devrait baisser à cause du noise)',
  },
  {
    id: 'SEDUCTIVE_PEDANT_01',
    type: 'SEDUCTIVE_PEDANT',
    text: `L'épistémologie holistique ontologique de cette herméneutique
    téléologique transcende les paradigmes axiomatiques tautologiques. La
    méta-systémique isomorphique fractale émergente convoque la résonance
    cognitive paradoxale dans une dialectique méta-théorique transversale.`,
    expectation: 'seductive_complexity HIGH (>0.7), practical_usefulness LOW',
    failure_if: 'seductive_complexity < 0.50',
  },
  {
    id: 'SCALE_CHANGE_01',
    type: 'SCALE_CHANGE',
    text: `Vérifier le serrage à 0.5 Nm. Cette décision affectera l'écosystème
    planétaire sur 1 milliard d'années. Mesurer la planéité au micron. Le PIB
    mondial dépend de cette intervention sur 30 ans. Inspecter à la loupe.
    Stratégie civilisationnelle sur 5 millénaires.`,
    expectation: 'incohérence d\'échelle — multiscale élevé mais peu pertinent',
    failure_if: 'sys_multiscale > 0.80 considéré comme positif',
  },
  {
    id: 'TEMPORAL_INVERSION_01',
    type: 'TEMPORAL_INVERSION',
    text: `Le bâtiment s'effondrera demain à cause du séisme survenu hier. La
    fissure de la semaine prochaine est due à la fatigue d'il y a 10 ans qui
    apparaîtra dans 2 ans. L'effet précède sa cause sur ce projet, comme
    démontré rétroactivement par les mesures à venir.`,
    expectation: 'pas de métrique actuelle qui détecte temporal inversion',
    failure_if: 'aucune — gap connu, à documenter',
  },
  {
    id: 'HYBRID_GOOD_BAD_01',
    type: 'HYBRID_GOOD_BAD',
    text: `Pour optimiser le KPI de productivité, il faut maximiser le score
    de satisfaction. Mais attention au Goodhart : ce proxy ne capture pas la
    réalité terrain. Préserver les marges de sécurité, la redondance critique.
    Multi-factoriel : plusieurs causes en interaction. Long terme : dette
    invisible à surveiller. Pousser au maximum chaque indicateur.`,
    expectation: 'signal MIXTE — système doit déclarer ambivalence, pas trancher',
    failure_if: 'goodhart_risk < 0.20 OU > 0.80 (les deux extrêmes seraient faux)',
  },
  {
    id: 'FAKE_HEDGE_01',
    type: 'FAKE_HEDGE',
    text: `Il est probable que peut-être cette solution probablement convient
    selon le contexte à vérifier sous certaines conditions. Vraisemblablement
    dans la plupart des cas si confirmé. À condition que peut-être nécessite
    expertise selon les cas en général à valider probable.`,
    expectation: 'haute robustness_OOD apparente mais inutile',
    failure_if: 'robustness_OOD > 0.85 considéré comme bon (faux positif)',
  },
];

// ───────────────────── ÉVALUATEUR ─────────────────────
function evaluateText(text, question = 'analyse adversariale') {
  return {
    practical_usefulness: +practicalUsefulness(text).toFixed(3),
    meta_noise: +metaNoise({ answerText: text, questionText: question }).toFixed(3),
    concrete_runtime_alignment: +concreteRuntimeAlignment({ answerText: text, questionText: question }).toFixed(3),
    terrain_alignment: +terrainAlignment(text).toFixed(3),
    useful_information_density_v2: +usefulInformationDensityV2(text).toFixed(3),
    cognitive_load: +cognitiveLoad(text).toFixed(3),
    robustness_OOD: +robustnessOOD(text).toFixed(3),
    systemic_coherence: systemicCoherenceReport(text).composite,
    sys_multiscale: systemicCoherenceReport(text).multiscale,
    goodhart_risk: runAntiGoodhart(text).goodhart_risk,
    fragility_risk: runFragilityDetector(text).fragility_risk,
    seductive_but_fragile: runFragilityDetector(text).detectors.seductive_but_fragile.score,
    seductive_complexity: seductiveComplexity(text).score,
    domain_leak: detectDomainLeak(text, { question }).leak_detected,
  };
}

// ───────────────────── DÉTECTION FAILURE_MODES ─────────────────────
function checkFailure(c, e) {
  const failures = [];
  switch (c.type) {
    case 'CONTRADICTION_INTERNE':
      if (e.systemic_coherence > 0.55) failures.push(`systemic_coherence ${e.systemic_coherence} > 0.55 sur texte contradictoire`);
      if (e.practical_usefulness > 0.70) failures.push(`practical_usefulness ${e.practical_usefulness} > 0.70 sur contradictions`);
      break;
    case 'FAUX_CONSENSUS':
      if (e.seductive_but_fragile < 0.30) failures.push(`seductive_but_fragile ${e.seductive_but_fragile} < 0.30 (consensus sans source)`);
      break;
    case 'NOISE_INJECTION':
      if (e.practical_usefulness > 0.80) failures.push(`practical_usefulness ${e.practical_usefulness} > 0.80 malgré bruit injecté`);
      break;
    case 'SEDUCTIVE_PEDANT':
      if (e.seductive_complexity < 0.50) failures.push(`seductive_complexity ${e.seductive_complexity} < 0.50 sur pédant pur`);
      break;
    case 'SCALE_CHANGE':
      // sys_multiscale high mais sans pertinence — flag pour documentation
      if (e.sys_multiscale > 0.80) failures.push(`sys_multiscale ${e.sys_multiscale} récompense scale incohérent (gap connu)`);
      break;
    case 'TEMPORAL_INVERSION':
      // Aucune métrique ne détecte — c'est un GAP documenté
      failures.push('GAP CONNU : aucune métrique ne détecte inversion temporelle causale');
      break;
    case 'HYBRID_GOOD_BAD':
      if (e.goodhart_risk < 0.20) failures.push(`goodhart_risk ${e.goodhart_risk} < 0.20 sur hybride (devrait être > 0.30)`);
      if (e.goodhart_risk > 0.80) failures.push(`goodhart_risk ${e.goodhart_risk} > 0.80 sur hybride (devrait être < 0.70)`);
      break;
    case 'FAKE_HEDGE':
      if (e.robustness_OOD > 0.85) failures.push(`robustness_OOD ${e.robustness_OOD} > 0.85 sur hedges décoratifs (faux positif)`);
      break;
  }
  return failures;
}

// ───────────────────── RUN ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ADVERSARIAL OOD SUITE V5 — anti-religion / falsifiability');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Objectif : trouver où le système se TROMPE`);
console.log(`  Cases : ${ADVERSARIAL_CASES.length} adversarials`);
console.log('═══════════════════════════════════════════════════════════════\n');

const results = [];
let totalFailures = 0;
for (const c of ADVERSARIAL_CASES) {
  const e = evaluateText(c.text);
  const failures = checkFailure(c, e);
  console.log(`▶ ${c.id} [${c.type}]`);
  console.log(`  attendu : ${c.expectation}`);
  console.log(`  scores  :`);
  for (const [k, v] of Object.entries(e)) {
    console.log(`    ${k.padEnd(32)} ${typeof v === 'boolean' ? v : v}`);
  }
  if (failures.length > 0) {
    console.log(`  ✗ FAILURE_MODES (${failures.length}) :`);
    for (const f of failures) console.log(`    - ${f}`);
    totalFailures += failures.length;
  } else {
    console.log(`  ✓ pas de failure mode détecté`);
  }
  console.log('');
  results.push({ id: c.id, type: c.type, text: c.text, expectation: c.expectation, scores: e, failures });
}

// ───────────────────── MUTATION STABILITY TEST ─────────────────────
// Compare 2 réponses qui devraient être proches structurellement
const MUTATION_PAIRS = [
  {
    name: 'stable_pair_BTP',
    a: 'Vérifier le joint d\'étanchéité. Mesurer la planéité. Couple de serrage 35 Nm.',
    b: 'Contrôler le joint d\'étanchéité. Mesurer la planéité. Couple à 35 Nm.',
    expect_stable: true,
  },
  {
    name: 'unstable_pair_inversion',
    a: 'Vérifier le joint. Réduire la pression à 2 bar. Étape 1 prioritaire.',
    b: 'Ignorer le joint. Augmenter la pression à 8 bar. Étape 5 facultative.',
    expect_stable: false,
  },
  {
    name: 'paraphrase_only',
    a: 'Installer le composant à 35 Nm puis vérifier l\'étanchéité. Mesurer la planéité.',
    b: 'À 35 Nm, installer le composant. Vérifier l\'étanchéité. Mesurer la planéité.',
    expect_stable: true,
  },
];

console.log('───────── MUTATION STABILITY TESTS ─────────');
let mutationFails = 0;
const mutationResults = [];
for (const m of MUTATION_PAIRS) {
  const r = mutationStability(m.a, m.b);
  const isStable = r.stability_score >= 0.45;
  const pass = isStable === m.expect_stable;
  console.log(`▶ ${m.name}`);
  console.log(`  expect_stable=${m.expect_stable}  stability_score=${r.stability_score}  verdict=${r.verdict}`);
  console.log(`  ${pass ? '✓ PASS' : '✗ FAIL'}\n`);
  if (!pass) mutationFails++;
  mutationResults.push({ ...m, result: r, pass });
}

// ───────────────────── META AUDIT ─────────────────────
const passingAdversarials = results.filter(r => r.failures.length === 0).length;
const passingMutations = MUTATION_PAIRS.length - mutationFails;

const audit = {
  mission_id: 'ADVERSARIAL_OOD_V5_20260517',
  total_adversarial_cases: ADVERSARIAL_CASES.length,
  adversarial_no_failure: passingAdversarials,
  total_failure_modes_detected: totalFailures,
  mutation_pairs: MUTATION_PAIRS.length,
  mutation_pairs_passing: passingMutations,
  adversarial_results: results,
  mutation_results: mutationResults,
  honest_summary: {
    falsifiability_principle: 'Ce rapport documente où le système se TROMPE, pas où il a raison.',
    purpose: 'Anti-religion ZORAN. Si toutes les métriques passent, le test est suspect.',
    failure_modes_acceptable: 'Quelques failures attendues (gap TEMPORAL_INVERSION volontaire).',
  },
};

fs.writeFileSync('audit/ADVERSARIAL_OOD_V5_RESULTS.json', JSON.stringify(audit, null, 2));

console.log('───────── SYNTHÈSE ─────────');
console.log(`Adversarial cases    : ${passingAdversarials}/${ADVERSARIAL_CASES.length} sans failure`);
console.log(`Failure modes total  : ${totalFailures}`);
console.log(`Mutation stability   : ${passingMutations}/${MUTATION_PAIRS.length} pass`);
console.log(`\n✓ Rapport : audit/ADVERSARIAL_OOD_V5_RESULTS.json`);
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PRINCIPE DE FALSIFIABILITÉ :');
console.log('  un rapport sans failure mode est SUSPECT.');
console.log('  Le but n\'est pas de tout réussir, c\'est de documenter');
console.log('  où le système se trompe pour corriger ITÉRATIVEMENT.');
console.log('═══════════════════════════════════════════════════════════════');
