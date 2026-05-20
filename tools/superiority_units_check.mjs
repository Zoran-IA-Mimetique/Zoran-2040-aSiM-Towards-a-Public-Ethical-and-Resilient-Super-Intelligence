// ZORAN_CORE_OS_FOUNDATION — Test de caractérisation des blocs purs
// extraits de superiority.js (annotateResponses, computeDeltas).
//
// But : prouver que l'extraction n'a pas cassé la logique. Ces 2 modules
// sont PURS (aucun appel LLM) → testables sans API key. Tout ReferenceError
// (variable de closure oubliée lors de l'extraction) est détecté ici.
//
// Exit 1 si un test échoue.

import { annotateResponses } from '../app/src/superiority_metrics.js';
import { computeDeltas } from '../app/src/superiority_deltas.js';

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
};

console.log('\n──── SUPERIORITY UNITS CHECK ────\n');

// ─── Données synthétiques réalistes ───
const question = 'Fissures en escalier sur un mur de maison de 1975 après la sécheresse, que faire ?';
const mkResponse = (label, strategy, text) => ({
  label, strategy, text,
  usage: { input_tokens: 200, output_tokens: 180 },
  stop_reason: 'end_turn',
  laws_used: strategy === 'baseline' ? [] : ['WP11-004', 'GHUC-001'],
});
const baselineText = "Les fissures en escalier sur une maison de 1975 après une sécheresse évoquent un phénomène de retrait-gonflement des argiles. Il faut faire réaliser une étude géotechnique de type G5 par un bureau d'études spécialisé. Documenter l'évolution avec des jauges. Déclarer le sinistre à l'assurance si la commune est reconnue en état de catastrophe naturelle.";
const zoranText = "Suspecter un retrait-gonflement argileux. Demander une étude géotechnique conforme à la norme NF P 94-500 sous un mois. Poser des fissuromètres pour mesurer l'évolution mensuelle. Conserver les preuves photographiques datées pour l'expertise contradictoire.";

// ─── TEST 1 : annotateResponses ───
console.log('Test 1 — annotateResponses (bloc métriques pur) :');
const responses = [
  mkResponse('CLAUDE brut · 0 loi', 'baseline', baselineText),
  mkResponse('ZORAN Orchestré', 'orchestrated', zoranText),
];
const ctx = {
  question,
  detectedStructures: ['causal_chain', 'norm_reference'],
  zoranSpecs: [{ stratName: 'orchestrated', domain_fitness: 0.82 }],
  complexity: { complexity_score: 0.6, depth_required: 'deep' },
};
let annotated;
try {
  annotated = annotateResponses(responses, ctx);
} catch (e) {
  console.log(`  FAIL annotateResponses a levé : ${e.message}`);
  console.log('\n━━━ VERDICT : FAIL ✗ (exception runtime — extraction cassée) ━━━');
  process.exit(1);
}
const r0 = annotated[0], r1 = annotated[1];
check('retourne le même array (mutation in-place)', annotated === responses);
check('r0.jargon_density est un nombre', typeof r0.jargon_density === 'number');
check('r0.concrete_runtime_alignment est un nombre', typeof r0.concrete_runtime_alignment === 'number');
check('r0.systemic_coherence renseigné', r0.systemic_coherence != null);
check('r0.goodhart renseigné', r0.goodhart != null);
check('r0.fragility renseigné', r0.fragility != null);
check('r0.overthink renseigné', r0.overthink != null);
check('r0.btp_analysis renseigné', r0.btp_analysis != null);
check('r0.parsimony renseigné', r0.parsimony != null);
check('r0.cta_presence renseigné', r0.cta_presence != null);
check('r0.truncation_penalty est un nombre', typeof r0.truncation_penalty === 'number');
check('baseline → domain_fitness = 1.0', r0.domain_fitness === 1.0);
check('orchestrated → domain_fitness = spec (0.82)', r1.domain_fitness === 0.82);
check('r0.jargon_terms_found est un array', Array.isArray(r0.jargon_terms_found));

// ─── TEST 2 : computeDeltas (cas nominal) ───
console.log('\nTest 2 — computeDeltas (bloc deltas pur, cas nominal) :');
const judge = {
  verdict: 'ZORAN Orchestré',
  scores: [
    { label: 'CLAUDE brut · 0 loi', precision: 0.70, hallucination: 0.20, noise: 0.30, coherence: 0.72,
      actionability_score: 0.55, argumented_grade_20: 13, strengths: ['clair'], weaknesses: ['vague'], comment: 'ok' },
    { label: 'ZORAN Orchestré', precision: 0.86, hallucination: 0.10, noise: 0.18, coherence: 0.84,
      actionability_score: 0.78, argumented_grade_20: 16, strengths: ['précis','actionnable'], weaknesses: [], comment: 'fort' },
  ],
};
let deltas;
try {
  deltas = computeDeltas({ judge, responses: annotated });
} catch (e) {
  console.log(`  FAIL computeDeltas a levé : ${e.message}`);
  console.log('\n━━━ VERDICT : FAIL ✗ (exception runtime — extraction cassée) ━━━');
  process.exit(1);
}
check('deltas a 2 entrées', deltas.length === 2);
const dZoran = deltas.find(d => d.label === 'ZORAN Orchestré');
check('delta ZORAN trouvé', !!dZoran);
check('precision_delta calculé (+0.16)', dZoran && Math.abs(dZoran.precision_delta - 0.16) < 1e-6);
check('hallucination_delta calculé (-0.10)', dZoran && Math.abs(dZoran.hallucination_delta - (-0.10)) < 1e-6);
check('runtime_superiority est un nombre', dZoran && typeof dZoran.runtime_superiority === 'number');
check('runtime_superiority ZORAN > 0 (ZORAN meilleur)', dZoran && dZoran.runtime_superiority > 0);
check('winner_delta présent sur chaque delta', deltas.every(d => typeof d.winner_delta === 'number'));
check('winner_delta du meilleur = 0', Math.min(...deltas.map(d => d.winner_delta)) === 0);
check('field_actionability calculé', dZoran && typeof dZoran.field_actionability === 'number');
check('goodhart propagé depuis annotation', dZoran && dZoran.goodhart != null);

// ─── TEST 3 : computeDeltas (cas dégradés) ───
console.log('\nTest 3 — computeDeltas (cas dégradés) :');
check('judge=null → []', computeDeltas({ judge: null, responses: annotated }).length === 0);
check('judge.scores=null → []', computeDeltas({ judge: { scores: null }, responses: annotated }).length === 0);
check('judge.scores=[] → []', computeDeltas({ judge: { scores: [] }, responses: annotated }).length === 0);

// ─── TEST 4 : robustesse label "CANDIDAT N — ..." (normalizeLabel) ───
console.log('\nTest 4 — normalisation label juge "CANDIDAT N — label" :');
const judgePrefixed = {
  scores: [
    { label: 'CANDIDAT 1 — CLAUDE brut · 0 loi', precision: 0.70, hallucination: 0.20, noise: 0.30, coherence: 0.72 },
    { label: 'CANDIDAT 2 — ZORAN Orchestré', precision: 0.86, hallucination: 0.10, noise: 0.18, coherence: 0.84 },
  ],
};
const deltasPrefixed = computeDeltas({ judge: judgePrefixed, responses: annotated });
check('matching malgré préfixe CANDIDAT N', deltasPrefixed.length === 2);

// ─── VERDICT ───
console.log(`\n──── ${pass} ok / ${fail} fail ────`);
console.log(`\n━━━ VERDICT : ${fail === 0 ? 'PASS ✓' : 'FAIL ✗'} ━━━`);
process.exit(fail === 0 ? 0 : 1);
