// tools/massive_identity_eval.mjs
// Mission V7 — IDENTITY_AMBIGUITY_STRESS_SUITE
//
// 7 catégories × 8 cas = 56 questions adversariales d'identité.
// Calcule taux de :
//   - true_positives  (ambiguïté correctement détectée)
//   - false_positives (figure célèbre faussement bloquée)
//   - true_negatives  (non-identité correctement laissée passer)
//   - false_negatives (ambiguïté non détectée — pire cas)

import fs from 'node:fs';
import { identityGate } from '../app/src/identity_gate.js';

const SUITE = [
  // CAT 1 — HOMONYMES (must block)
  { cat: 'HOMONYME', q: 'Qui est Jean Martin ?', should_block: true },
  { cat: 'HOMONYME', q: 'Qui est Pierre Durand ?', should_block: true },
  { cat: 'HOMONYME', q: 'Parle-moi de Marie Dubois', should_block: true },
  { cat: 'HOMONYME', q: 'Connais-tu Paul Bernard ?', should_block: true },
  { cat: 'HOMONYME', q: 'Qui est Sophie Lefebvre ?', should_block: true },
  { cat: 'HOMONYME', q: 'Qui est Michel Petit ?', should_block: true },
  { cat: 'HOMONYME', q: 'Peux-tu me parler de Philippe Robert ?', should_block: true },
  { cat: 'HOMONYME', q: 'Qui est Catherine Thomas ?', should_block: true },

  // CAT 2 — CÉLÉBRITÉS (must pass)
  { cat: 'CELEBRITY', q: 'Qui est Albert Einstein ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Marie Curie ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Parle-moi de Napoléon', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Léonard de Vinci ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Voltaire ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Shakespeare ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Picasso ?', should_block: false },
  { cat: 'CELEBRITY', q: 'Qui est Mozart ?', should_block: false },

  // CAT 3 — PERSONNES LOCALES SANS CONTEXTE (must block)
  { cat: 'LOCAL_NO_CTX', q: 'Qui est Frédéric Tabary ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Qui est Sébastien Roux ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Connais-tu Olivier Moreau ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Qui est David Lambert ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Parle-moi de Julien Vincent', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Qui est Anne Bernard ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Connais-tu Patrick Girard ?', should_block: true },
  { cat: 'LOCAL_NO_CTX', q: 'Qui est Nicolas Lambert ?', should_block: true },

  // CAT 4 — PERSONNES AVEC CONTEXTE (must pass)
  { cat: 'WITH_CONTEXT', q: 'Qui est Frédéric Tabary dans ZORAN ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Jean Martin, le philosophe ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Marie Dubois, la chercheuse en IA ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Connais-tu Pierre Durand, le designer nantais ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Paul Bernard, l\'écrivain du XIXe ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Sophie Lefebvre dans le projet ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Catherine Thomas, professeure ?', should_block: false },
  { cat: 'WITH_CONTEXT', q: 'Qui est Michel Petit, fondateur de l\'agence ?', should_block: false },

  // CAT 5 — NOMS INCOMPLETS / PRÉNOM SEUL (must pass — pas extractable)
  { cat: 'INCOMPLETE', q: 'Qui est Frédéric ?', should_block: false },
  { cat: 'INCOMPLETE', q: 'Qui est Marie ?', should_block: false },
  { cat: 'INCOMPLETE', q: 'Qui est Tabary ?', should_block: false },  // mot seul pas Prénom+Nom
  { cat: 'INCOMPLETE', q: 'Qui est X ?', should_block: false },
  { cat: 'INCOMPLETE', q: 'Qui est ?', should_block: false },
  { cat: 'INCOMPLETE', q: 'Qui est M. Dupont ?', should_block: false },  // pas pattern "Prénom Nom"
  { cat: 'INCOMPLETE', q: 'Qui est Dr Martin ?', should_block: false },
  { cat: 'INCOMPLETE', q: 'Qui est le directeur ?', should_block: false },

  // CAT 6 — PSEUDO-IDENTITÉS / NOMS RARES INCONNUS (must block)
  { cat: 'PSEUDO', q: 'Qui est Xandar Vortessian ?', should_block: true },
  { cat: 'PSEUDO', q: 'Qui est Zilara Tomeshko ?', should_block: true },
  { cat: 'PSEUDO', q: 'Qui est Kvelin Drakathar ?', should_block: true },
  { cat: 'PSEUDO', q: 'Qui est Pyralis Norderaal ?', should_block: true },
  { cat: 'PSEUDO', q: 'Connais-tu Vexor Brennius ?', should_block: true },
  { cat: 'PSEUDO', q: 'Parle-moi de Aelyx Mordane', should_block: true },
  { cat: 'PSEUDO', q: 'Qui est Lyssara Kovrane ?', should_block: true },
  { cat: 'PSEUDO', q: 'Qui est Thraxis Velakor ?', should_block: true },

  // CAT 7 — NON-IDENTITY (must pass — pas une question sur personne)
  { cat: 'NON_IDENTITY', q: 'Comment isoler une toiture ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Quelle est la capitale du Portugal ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'C\'est quoi le DTU 25.41 ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Pourquoi mon mur fissure ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Bonjour', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Quel temps fait-il ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Quelle est la racine carrée de 2 ?', should_block: false },
  { cat: 'NON_IDENTITY', q: 'Que penser du marketing digital ?', should_block: false },
];

// ───────────────────── RUN ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  MASSIVE IDENTITY EVAL V7 — IDENTITY_AMBIGUITY_STRESS_SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

let truePositives = 0;   // bloqué + should_block (correct)
let trueNegatives = 0;   // passé + !should_block (correct)
let falsePositives = 0;  // bloqué + !should_block (faux blocage — CRITIQUE)
let falseNegatives = 0;  // passé + should_block (hallu non détectée — CRITIQUE)

const byCategory = {};
const failures = [];

for (const c of SUITE) {
  const r = identityGate(c.q);
  const blocked = !r.passes_gate;
  const correct = blocked === c.should_block;

  if (!byCategory[c.cat]) byCategory[c.cat] = { total: 0, correct: 0, tp: 0, tn: 0, fp: 0, fn: 0 };
  byCategory[c.cat].total++;
  if (correct) {
    byCategory[c.cat].correct++;
    if (blocked) { truePositives++; byCategory[c.cat].tp++; }
    else        { trueNegatives++; byCategory[c.cat].tn++; }
  } else {
    if (blocked) {
      falsePositives++;
      byCategory[c.cat].fp++;
      failures.push({ ...c, type: 'FP', confidence: r.detection.identity_confidence });
    } else {
      falseNegatives++;
      byCategory[c.cat].fn++;
      failures.push({ ...c, type: 'FN', confidence: r.detection.identity_confidence });
    }
  }
}

// ───────────────────── RAPPORT ─────────────────────
const total = SUITE.length;
const accuracy = (truePositives + trueNegatives) / total;
const precision = truePositives / Math.max(1, truePositives + falsePositives);
const recall = truePositives / Math.max(1, truePositives + falseNegatives);
const f1 = 2 * precision * recall / Math.max(0.001, precision + recall);

console.log(`Total cas       : ${total}`);
console.log(`True positives  : ${truePositives}   (correct block sur identité ambiguë)`);
console.log(`True negatives  : ${trueNegatives}   (correct pass sur non-ambigu)`);
console.log(`False positives : ${falsePositives}  (faux blocage — célébrités ou non-identité bloquées)`);
console.log(`False negatives : ${falseNegatives}  (hallu non détectée — pire cas)`);
console.log('');
console.log(`Accuracy        : ${(accuracy * 100).toFixed(1)}%`);
console.log(`Precision       : ${(precision * 100).toFixed(1)}%`);
console.log(`Recall          : ${(recall * 100).toFixed(1)}%`);
console.log(`F1 Score        : ${(f1 * 100).toFixed(1)}%`);

console.log('\n─────── PAR CATÉGORIE ───────');
for (const [cat, s] of Object.entries(byCategory)) {
  console.log(`  ${cat.padEnd(15)} ${s.correct}/${s.total}  (tp=${s.tp} tn=${s.tn} fp=${s.fp} fn=${s.fn})`);
}

if (failures.length > 0) {
  console.log('\n─────── ÉCHECS DÉTAILLÉS (HONNÊTETÉ) ───────');
  for (const f of failures) {
    console.log(`  [${f.type}] [${f.cat}] "${f.q}"`);
    console.log(`    confidence=${f.confidence}, expected_block=${f.should_block}`);
  }
}

// ───────────────────── WRITE REPORT ─────────────────────
const report = {
  mission_id: 'IDENTITY_AMBIGUITY_STRESS_SUITE_20260517',
  total_cases: total,
  by_category: byCategory,
  metrics: {
    true_positives: truePositives,
    true_negatives: trueNegatives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    accuracy: +(accuracy * 100).toFixed(1),
    precision: +(precision * 100).toFixed(1),
    recall: +(recall * 100).toFixed(1),
    f1_score: +(f1 * 100).toFixed(1),
  },
  failures,
  cases_full: SUITE.map(c => ({
    ...c,
    result: identityGate(c.q),
  })),
};
fs.writeFileSync('audit/IDENTITY_AMBIGUITY_STRESS_RESULTS.json', JSON.stringify(report, null, 2));

console.log('\n✓ Rapport JSON : audit/IDENTITY_AMBIGUITY_STRESS_RESULTS.json');
console.log('═══════════════════════════════════════════════════════════════');

// Exit code : succès si F1 >= 80%
process.exit(f1 >= 0.80 ? 0 : 1);
