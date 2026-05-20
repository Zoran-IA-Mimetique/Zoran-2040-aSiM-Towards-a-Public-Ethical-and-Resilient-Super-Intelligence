// ZORAN_CORE_OS — Test discriminant adversarial (Test 2 du triptyque Oracle).
//
// Question falsifiable unique : le moteur adversarial dormant
// (adversarial_survivability_engine.js) apporte-t-il un pouvoir discriminant
// SUPÉRIEUR à un baseline trivial, sur les 5 cas du benchmark P0 ?
//
// Tranche le sort de 9 modules CONDITIONAL (1482 LOC) :
//   - moteur ne bat pas le baseline  → REMOVE des 9
//   - moteur bat le baseline         → REBUILD consolidé
//
// PORTÉE : validation ARCHITECTURE uniquement (le ground truth P0 est
// synthétique, non-BET). Ne dit RIEN sur la validation métier réelle.
// Aucun appel LLM, aucune dépendance P0 humain. Reproductible.

import fs from 'node:fs';
import path from 'node:path';
import { adversarialSurvivability } from '../app/src/adversarial_survivability_engine.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const bench = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'benchmark_real_world_p0.json'), 'utf8'));
const cases = bench.transmission_to_bet['5_cases_to_annotate_blind'];

// ─── Corrélation de Spearman (rangs, ties = rang moyen) ───
function rankOf(arr) {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].v === sorted[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[sorted[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}
function spearman(a, b) {
  const ra = rankOf(a), rb = rankOf(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n;
  const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2;
  }
  return (da === 0 || db === 0) ? 0 : +(num / Math.sqrt(da * db)).toFixed(3);
}

// ─── Mesures par cas ───
const rows = cases.map(c => {
  const text = c.response_text || '';
  const eng = adversarialSurvivability(text);
  return {
    case_id: c.case_id,
    label: c._zoran_internal_label_BLIND,
    expected: c._zoran_expected_score,          // ground truth synthétique
    len: text.length,
    engine_v12: eng.v12_score,                   // score moteur adversarial dormant
    verdict: eng.verdict,
    survivors: eng.claims_survivors,
    causal: eng.causal_claims,
    destroyed: eng.claims_destroyed,
    fragile: eng.claims_fragile,
  };
});

const expected   = rows.map(r => r.expected);
const engineScore = rows.map(r => r.engine_v12);
const baseLen     = rows.map(r => r.len);          // baseline naïf : + long = + bon
const baseNegLen  = rows.map(r => -r.len);         // baseline naïf inverse : + court = + bon

const sEngine  = spearman(engineScore, expected);
const sLen     = spearman(baseLen, expected);
const sNegLen  = spearman(baseNegLen, expected);
const bestBaseline = Math.max(Math.abs(sLen), Math.abs(sNegLen));

// ─── Check séparation : les 2 cas connus mauvais en bas du classement moteur ? ───
const BAD_CASES = rows.filter(r => r.expected <= 3).map(r => r.case_id);   // CASE_3, CASE_4
const engineRanked = [...rows].sort((a, b) => a.engine_v12 - b.engine_v12); // pire→meilleur
const bottom2 = engineRanked.slice(0, 2).map(r => r.case_id);
const separationOK = BAD_CASES.every(id => bottom2.includes(id));

// ─── REPORT ───
console.log('\n──── ADVERSARIAL DISCRIMINANT CHECK (Test 2) ────\n');
console.log('Cas P0 — score moteur vs ground truth synthétique :');
console.log('  case      label                          expected  engine_v12  verdict');
for (const r of rows) {
  console.log(`  ${r.case_id.padEnd(8)}  ${r.label.padEnd(30)}  ${String(r.expected).padStart(7)}   ${String(r.engine_v12).padStart(8)}   ${r.verdict}`);
}
console.log('\nCorrélations de Spearman vs ground truth (n=5) :');
console.log('  moteur adversarial   :', sEngine);
console.log('  baseline +longueur   :', sLen);
console.log('  baseline -longueur   :', sNegLen);
console.log('  meilleur baseline    :', +bestBaseline.toFixed(3));
console.log('\nSéparation des cas mauvais :');
console.log('  cas mauvais (expected≤3) :', BAD_CASES.join(', '));
console.log('  bottom-2 du moteur       :', bottom2.join(', '));
console.log('  séparation correcte      :', separationOK);

// ─── VERDICT ───
const margin = +(sEngine - bestBaseline).toFixed(3);
let verdict, recommendation;
if (sEngine >= 0.6 && separationOK && margin > 0.1) {
  verdict = 'ENGINE_DISCRIMINATES';
  recommendation = 'REBUILD — le moteur a un pouvoir discriminant réel ; consolider les 9 modules en 1, brancher, puis falsifier via P0.';
} else if (sEngine < 0.3 || margin <= 0) {
  verdict = 'ENGINE_NO_ADDED_VALUE';
  recommendation = 'REMOVE — le moteur ne bat pas un baseline trivial ; supprimer les 9 modules (~1482 LOC).';
} else {
  verdict = 'INCONCLUSIVE';
  recommendation = 'DÉCISION ORACLE — signal faible/ambigu ; n=5 insuffisant pour trancher seul.';
}

console.log('\nVERDICT :', verdict);
console.log('  Spearman moteur =', sEngine, '| marge vs baseline =', margin, '| séparation =', separationOK);
console.log('  →', recommendation);
console.log('\n⚠ PORTÉE : validation ARCHITECTURE uniquement. Le ground truth P0');
console.log('  est synthétique (intuitions ZORAN, pas BET réel). Ce test ne dit');
console.log('  RIEN sur la validation métier — qui reste gated sur P0-MINI humain.');

// ─── Écriture résultats ───
const out = {
  mission_id: 'ZORAN_CORE_OS_FOUNDATION_20260520',
  test: 'adversarial_discriminant',
  generated_at: new Date().toISOString(),
  scope: 'architecture_validation_only',
  ground_truth: 'synthetic_zoran_expected_score (NON-BET)',
  n: 5,
  rows,
  spearman: { engine: sEngine, baseline_len: sLen, baseline_neg_len: sNegLen, best_baseline: +bestBaseline.toFixed(3) },
  margin_vs_baseline: margin,
  separation_ok: separationOK,
  verdict,
  recommendation,
  caveat: 'Validation architecture seulement. Validation metier reste gated sur P0-MINI BET humain.',
};
fs.writeFileSync(path.join(ROOT, 'audit', 'adversarial_discriminant_results.json'), JSON.stringify(out, null, 2));
console.log('\n→ audit/adversarial_discriminant_results.json écrit');
