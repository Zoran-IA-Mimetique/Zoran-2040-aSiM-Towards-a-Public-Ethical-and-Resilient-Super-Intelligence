// tools/test_identity_ambiguity.mjs
// Validation empirique du IDENTITY_DISAMBIGUATION_GATE V1.

import { detectIdentityAmbiguity, isPersonIdentityQuestion, extractPersonNames, isFamousFigure } from '../app/src/ambiguity_detector.js';
import { identityGate, identityHalluRisk, countUnsupportedBioClaims } from '../app/src/identity_gate.js';

const CASES = [
  // Cas 1 — Identité ambiguë (MUST BLOCK)
  {
    name: 'TABARY_NU — nom commun-rare sans contexte',
    question: 'Qui est Frédéric Tabary ?',
    expect: { passes: false, mandatory_disambig: true },
  },
  {
    name: 'JEAN_MARTIN — nom très commun',
    question: 'Qui est Jean Martin ?',
    expect: { passes: false, mandatory_disambig: true },
  },
  {
    name: 'DUPONT_BIO — pseudonyme générique',
    question: 'Peux-tu me parler de Marie Dupont ?',
    expect: { passes: false, mandatory_disambig: true },
  },

  // Cas 2 — Identité contextualisée (MUST PASS)
  {
    name: 'TABARY_DANS_ZORAN — contexte fort',
    question: 'Qui est Frédéric Tabary dans ZORAN ?',
    expect: { passes: true, confidence_min: 0.65 },
  },
  {
    name: 'TABARY_DESIGNER — contexte profession',
    question: 'Qui est Frédéric Tabary, le designer nantais ?',
    expect: { passes: true, confidence_min: 0.65 },
  },

  // Cas 3 — Identité ultra-connue (MUST PASS)
  {
    name: 'EINSTEIN — figure célèbre',
    question: 'Qui est Albert Einstein ?',
    expect: { passes: true, confidence_min: 0.80 },
  },
  {
    name: 'CURIE_CONTEXT — célèbre + contexte',
    question: 'Qui est Marie Curie, la physicienne ?',
    expect: { passes: true, confidence_min: 0.80 },
  },

  // Cas 4 — Pas une question d'identité (MUST PASS sans intervention)
  {
    name: 'NON_IDENTITY — question technique',
    question: 'Comment isoler une toiture en BTP ?',
    expect: { passes: true, is_identity: false },
  },
  {
    name: 'GREETING — salutation',
    question: 'Bonjour',
    expect: { passes: true, is_identity: false },
  },

  // Cas 5 — Edge cases
  {
    name: 'INCOMPLETE_NAME — prénom seul',
    question: 'Qui est Frédéric ?',
    expect: { passes: true, is_identity: true },  // pas de "Prénom Nom" pattern
  },
  {
    name: 'PSEUDO_NAME — nom rare inconnu',
    question: 'Qui est Xandar Vortessian ?',
    // Nom inconnu sans contexte → confidence basse → MUST BLOCK
    expect: { passes: false, mandatory_disambig: true },
  },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V7 — IDENTITY DISAMBIGUATION GATE');
console.log('═══════════════════════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const c of CASES) {
  const gate = identityGate(c.question);
  const det = gate.detection;
  console.log(`▶ ${c.name}`);
  console.log(`  question: "${c.question}"`);
  console.log(`  is_identity=${det.is_identity_question}  names=${det.names?.length || 0}`);
  console.log(`  confidence=${det.identity_confidence}  ambiguity=${det.ambiguity_score}`);
  console.log(`  passes_gate=${gate.passes_gate}  reason=${gate.reason}`);
  if (det.evidence?.length) {
    for (const e of det.evidence.slice(0, 2)) console.log(`    - ${e}`);
  }

  let ok = true;
  if (c.expect.passes !== undefined && gate.passes_gate !== c.expect.passes) ok = false;
  if (c.expect.mandatory_disambig !== undefined && det.mandatory_disambiguation !== c.expect.mandatory_disambig) ok = false;
  if (c.expect.is_identity !== undefined && det.is_identity_question !== c.expect.is_identity) ok = false;
  if (c.expect.confidence_min !== undefined && det.identity_confidence < c.expect.confidence_min) ok = false;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

// ───────── TESTS identity_hallu_risk ─────────
console.log('───────── IDENTITY_HALLU_RISK TESTS ─────────\n');
const HALLU_CASES = [
  {
    name: 'HALLU_BIOGRAPHIE_INVENTÉE',
    question: 'Qui est Frédéric Tabary ?',
    response: `Frédéric Tabary est un designer français né en 1969 à Nantes. Il a fondé l'agence Tabary Le Lay et travaille à Paris. Il est professeur à l'École de design de Nantes et a publié plusieurs ouvrages.`,
    expect_fires: true,
  },
  {
    name: 'HALLU_AVEC_DISCLAIMER',
    question: 'Qui est Frédéric Tabary ?',
    response: `Plusieurs personnes peuvent correspondre à ce nom. À vérifier auprès d'une source web : il s'agirait peut-être d'un designer nantais, mais je ne peux pas confirmer sans source supplémentaire.`,
    expect_fires: false,
  },
  {
    name: 'REPONSE_PRUDENTE_AVEC_CONTEXTE',
    question: 'Qui est Frédéric Tabary dans ZORAN ?',
    response: `Dans le contexte ZORAN, Frédéric Tabary est référencé comme contributeur. Pour plus de détails, à vérifier dans la documentation du projet.`,
    expect_fires: false,
  },
];

for (const c of HALLU_CASES) {
  const r = identityHalluRisk(c.question, c.response);
  const ok = r.fires === c.expect_fires;
  console.log(`▶ ${c.name}`);
  console.log(`  identity_hallu_risk=${r.score}  fires=${r.fires}  attendu=${c.expect_fires}`);
  console.log(`  ambiguity=${r.ambiguity_score}  bio_claims=${r.unsupported_bio_claims}  disclaimer=${r.disclaimer_present}`);
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT V7 : ${pass}/${pass + fail} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail === 0 ? 0 : 1);
