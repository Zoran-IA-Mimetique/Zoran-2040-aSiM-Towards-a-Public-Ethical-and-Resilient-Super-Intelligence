// tools/test_v11_p2_p3.mjs
// Mission V11 — test vernacular_wisdom (P2) + physical_causality (P3)

import { vernacularWisdomScore } from '../app/src/vernacular_wisdom_engine.js';
import { validatePhysicalCausality } from '../app/src/physical_causality_validator.js';

// ────────── P2 VERNACULAR TESTS ──────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V11 P2 — VERNACULAR WISDOM ENGINE');
console.log('═══════════════════════════════════════════════════════════════\n');

const VERN_CASES = [
  {
    name: 'VRAI_TERRAIN_PRATICIEN',
    text: `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste. La rouille, gratte et passe de l'antirouille. Le vrai problème serait que l'IPN porte mal — fais venir quelqu'un pour vérifier qu'elle est bien dimensionnée pour ce qu'elle porte.`,
    expect_vernacular: true,
  },
  {
    name: 'EXPERT_FORMEL_JARGON',
    text: `IPN HEA HEB UPN avec Eurocode 3 NF EN 1993. Module de Young, fluage, fatigue, contreventement, moment fléchissant. DTU 13.12 DTU 21. Cisaillement et flambement à considérer.`,
    expect_vernacular: false,
  },
  {
    name: 'PRATICIEN_TOITURE',
    text: `Trois points classiques où ça fuit : le relevé d'étanchéité au pied de l'acrotère, regarde si la membrane décolle ou s'est fendue. La jonction des descentes d'eau pluviale, souvent un point faible. Si la toiture est gravillonnée, déplace les gravillons sur 1m² au-dessus de la tache pour voir la membrane. Mets de l'eau au tuyau pendant 30 min sur la zone suspecte, vérifie dans 6h.`,
    expect_vernacular: true,
  },
  {
    name: 'FAUX_EXPERT_JARGON_VIDE',
    text: `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer une approche holistique systémique. L'inscription dans une perspective multi-factorielle requiert une approche méthodologique. Plusieurs cofacteurs interagissent dans un cadre complexe nécessitant une expertise approfondie.`,
    expect_vernacular: false,
  },
  {
    name: 'PRATICIEN_LACONIQUE',
    text: `L'IPN boit. C'est l'humidité qui remonte. Décaisse, antirouille, repeins. Si ça revient, problème de drainage extérieur.`,
    expect_vernacular: true,
  },
];

let passV = 0, failV = 0;
for (const c of VERN_CASES) {
  const r = vernacularWisdomScore(c.text);
  const detected = r.score >= 0.20;
  const ok = detected === c.expect_vernacular;
  console.log(`▶ ${c.name}`);
  console.log(`  score=${r.score}  verdict=${r.verdict}  attendu_vernacular=${c.expect_vernacular}  détecté=${detected}`);
  console.log(`  composants: imp=${r.raw_counts.imperatives} prob=${r.raw_counts.probabilistic} elim=${r.raw_counts.elimination} lowtech=${r.raw_counts.lowTech} exp=${r.raw_counts.experience} phys=${r.raw_counts.physics}`);
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? passV++ : failV++;
}

console.log(`  Résultat P2 : ${passV}/${passV + failV} tests passés\n`);

// ────────── P3 PHYSICAL CAUSALITY TESTS ──────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V11 P3 — PHYSICAL CAUSALITY VALIDATOR');
console.log('═══════════════════════════════════════════════════════════════\n');

const PHYS_CASES = [
  {
    name: 'CAUSALITE_CORRECTE',
    text: `La sécheresse provoque le RGA, le RGA cause des tassements différentiels qui produisent des fissures verticales. L'humidité capillaire entraîne la corrosion des armatures.`,
    expect_consistent: true,
  },
  {
    name: 'CAUSALITE_INVERSEE_BTP',
    text: `Les fissures verticales causent l'humidité capillaire qui à son tour produit la corrosion. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel.`,
    expect_consistent: false,  // au moins 1 inversion
  },
  {
    name: 'SCALE_INCOMPATIBLE',
    text: `La condensation explique le tassement profond du sol. La ventilation insuffisante provoque le mouvement de fondation.`,
    expect_consistent: false,
  },
  {
    name: 'CAUSALITE_PLAUSIBLE_MULTI',
    text: `Le RGA, combiné à la surcharge, provoque des tassements. L'humidité aggrave la corrosion des IPN. La carbonatation produit l'éclat béton observé.`,
    expect_consistent: true,
  },
  {
    name: 'CAUSALITE_INVERSEE_SUBTLE',
    text: `Les fissures révèlent un tassement profond. La carbonatation du béton amplifie le RGA. Le vieillissement explique le pendage initial du terrain.`,
    expect_consistent: false,  // carbonatation n'amplifie pas RGA
  },
];

let passP = 0, failP = 0;
for (const c of PHYS_CASES) {
  const r = validatePhysicalCausality(c.text);
  const consistent = r.verdict === 'PHYSICALLY_PLAUSIBLE';
  const ok = consistent === c.expect_consistent;
  console.log(`▶ ${c.name}`);
  console.log(`  verdict=${r.verdict}  score=${r.score}`);
  console.log(`  assertions=${r.n_assertions_analyzed}  high_sev=${r.n_high_severity}  low_sev=${r.n_low_severity}`);
  if (r.violations.length > 0) {
    for (const v of r.violations.slice(0, 3)) {
      console.log(`    ⚠ [${v.type}] ${v.claim}`);
    }
  }
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? passP++ : failP++;
}

console.log(`  Résultat P3 : ${passP}/${passP + failP} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit((passV + passP) === (VERN_CASES.length + PHYS_CASES.length) ? 0 : 1);
