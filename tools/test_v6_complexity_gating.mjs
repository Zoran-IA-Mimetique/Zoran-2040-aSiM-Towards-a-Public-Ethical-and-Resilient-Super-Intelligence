// tools/test_v6_complexity_gating.mjs
// Test du complexity_estimator + overthink_detector
//
// Vérifie en particulier : "Qui est Frédéric Tabary ?" → SIMPLE pipeline
// (pas FRACTAL comme actuellement).

import { estimateComplexity } from '../app/src/complexity_estimator.js';
import { detectOverthink } from '../app/src/overthink_detector.js';

const QUESTIONS = [
  { q: 'Qui est Frédéric Tabary ?', expect_depth: 'simple', why: 'pattern trivial bio, court' },
  { q: 'Quelle est la capitale du Portugal ?', expect_depth: 'simple', why: 'factuel trivial' },
  { q: 'C\'est quoi le DTU 25.41 ?', expect_depth: 'simple', why: 'définition simple même si tech' },
  { q: 'Comment isoler une toiture ?', expect_depth: 'medium', why: 'comment + domaine BTP' },
  { q: 'Pourquoi mon mur fissure et que faire pour le réparer ?', expect_depth: 'deep', why: 'causal + action + 2 clauses' },
  { q: 'Quels sont les mécanismes causaux multi-factoriels d\'une chute chez le sujet âgé sous anticoagulants avec déclin cognitif, en considérant cofacteurs environnementaux et opposabilité jurisprudentielle ?', expect_depth: 'fractal', why: 'multi-cadre + causal + technique + long' },
  { q: 'Bonjour', expect_depth: 'simple', why: 'salutation' },
  { q: 'Pouvez-vous me détailler exhaustivement tous les aspects de la propagation systémique d\'une défaillance critique dans un système complexe ?', expect_depth: 'fractal', why: 'deep_request + risk + multicadre' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST V6 — COMPLEXITY GATING (anti sur-orchestration)');
console.log('═══════════════════════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const c of QUESTIONS) {
  const est = estimateComplexity(c.q);
  const ok = est.depth_required === c.expect_depth;
  console.log(`▶ "${c.q.slice(0, 70)}${c.q.length > 70 ? '...' : ''}"`);
  console.log(`  attendu: ${c.expect_depth} (${c.why})`);
  console.log(`  obtenu : depth=${est.depth_required}  cplx=${est.complexity_score}  pipeline=${est.recommended_pipeline}`);
  console.log(`  raisons: ${est.reasoning.join(' | ')}`);
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

// ───────── TEST OVERTHINK ─────────
console.log('───────── TEST OVERTHINK_DETECTOR ─────────\n');

const OVERTHINK_CASES = [
  {
    name: 'OVERTHINK_MAJEUR — Tabary surcoché',
    question: 'Qui est Frédéric Tabary ?',
    responseText: 'Frédéric Tabary est un designer français. ' + 'Cependant, dans une perspective systémique multi-cadre, l\'analyse de l\'identité publique requiert une étude approfondie des marqueurs ontologiques épistémiques, considérant les cofacteurs causaux et la propagation des références biographiques dans le champ public. '.repeat(15),
    n_structures: 12,
    n_routes: 5,
    n_laws: 28,
    expect_overthink: true,
  },
  {
    name: 'PROPORTIONNÉ — Tabary court',
    question: 'Qui est Frédéric Tabary ?',
    responseText: 'Designer français, fondateur de l\'agence Tabary Le Lay à Nantes, spécialisée en design d\'objets et mobilier. À vérifier auprès d\'une source web pour confirmer le profil exact.',
    n_structures: 1,
    n_routes: 1,
    n_laws: 0,
    expect_overthink: false,
  },
  {
    name: 'PROPORTIONNÉ — question complexe avec réponse complexe',
    question: 'Quels sont les mécanismes causaux multi-factoriels d\'une chute chez le sujet âgé ?',
    responseText: 'Lorem ipsum '.repeat(200),  // 400 mots
    n_structures: 5,
    n_routes: 3,
    n_laws: 8,
    expect_overthink: false,
  },
];

for (const c of OVERTHINK_CASES) {
  const r = detectOverthink({
    question: c.question,
    responseText: c.responseText,
    n_structures_detected: c.n_structures,
    n_routes_activated: c.n_routes,
    n_laws_activated: c.n_laws,
  });
  const detected = r.overthink_score >= 0.40;
  const ok = detected === c.expect_overthink;
  console.log(`▶ ${c.name}`);
  console.log(`  overthink_score=${r.overthink_score}  detected=${detected}  attendu=${c.expect_overthink}`);
  if (r.evidence.length) {
    for (const e of r.evidence) console.log(`    - ${e}`);
  }
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}\n`);
  ok ? pass++ : fail++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT V6 : ${pass}/${pass + fail} tests passés`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail === 0 ? 0 : 1);
