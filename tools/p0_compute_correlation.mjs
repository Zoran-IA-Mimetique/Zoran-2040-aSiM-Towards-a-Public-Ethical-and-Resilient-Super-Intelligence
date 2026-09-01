// tools/p0_compute_correlation.mjs
// Mission V11 P0-MINI
//
// Calcul automatique Spearman + Kendall + verdict
// dès que l'utilisateur a rempli audit/benchmark_real_world_p0.json
// avec les annotations BET réelles.

import fs from 'node:fs';

const BENCHMARK_PATH = 'audit/benchmark_real_world_p0.json';

function rank(arr) {
  const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(arr.length);
  sorted.forEach((it, ri) => { ranks[it.i] = ri + 1; });
  return ranks;
}

function spearman(a, b) {
  const ra = rank(a), rb = rank(b), n = a.length;
  const sumD2 = ra.reduce((s, r, i) => s + (r - rb[i]) ** 2, 0);
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

function kendallTau(a, b) {
  const n = a.length;
  let conc = 0, disc = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const sA = Math.sign(a[i] - a[j]);
      const sB = Math.sign(b[i] - b[j]);
      if (sA * sB > 0) conc++;
      else if (sA * sB < 0) disc++;
    }
  }
  return (conc - disc) / (n * (n - 1) / 2);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  P0-MINI BET — Calcul corrélation ZORAN vs humain');
console.log('═══════════════════════════════════════════════════════════════\n');

if (!fs.existsSync(BENCHMARK_PATH)) {
  console.error(`✗ ${BENCHMARK_PATH} introuvable`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf8'));
const annotations = data.results_template_to_fill_after_annotation?.annotations || {};

// Vérifier que les annotations sont remplies
const caseIds = ['CASE_1', 'CASE_2', 'CASE_3', 'CASE_4', 'CASE_5'];
const filledCases = caseIds.filter(id => {
  const a = annotations[id];
  return a && a.note_globale_expertise !== null && a.note_globale_expertise !== undefined;
});

if (filledCases.length < 5) {
  console.log(`⚠ ANNOTATIONS BET INCOMPLÈTES (${filledCases.length}/5)\n`);
  console.log('  Pour exécuter ce calcul :');
  console.log(`  1. Transmettre les 5 cas (audit/benchmark_real_world_p0.json section transmission_to_bet)`);
  console.log(`     à 1 BET senior réel en aveugle (45 min, ~200 €)`);
  console.log(`  2. Recevoir ses annotations sur les 8 champs par cas`);
  console.log(`  3. Remplir audit/benchmark_real_world_p0.json section results_template_to_fill_after_annotation`);
  console.log(`  4. Relancer ce script\n`);
  console.log('  Voir audit/P0_MINI_BET_PROTOCOL.md pour le protocole complet.');
  process.exit(0);
}

// Extraire les rankings BET et les scores ZORAN
const bet_scores = caseIds.map(id => annotations[id].note_globale_expertise);
const bet_rankings = caseIds.map(id => annotations[id].ranking_quality);

const transmission = data.transmission_to_bet?.['5_cases_to_annotate_blind'] || [];
const zoran_expected = transmission.map(c => c._zoran_expected_score);
const zoran_v11_full = transmission.map(c => c._zoran_v11_full_score);
const zoran_v12 = transmission.map(c => c._zoran_v12_score);

// Spearman (note globale)
const sp_expected = spearman(bet_scores, zoran_expected);
const sp_v11 = spearman(bet_scores, zoran_v11_full);
const sp_v12 = spearman(bet_scores, zoran_v12);
const k_expected = kendallTau(bet_scores, zoran_expected);

// Spearman (rankings)
const bet_inverse_rank = bet_rankings.map(r => 6 - r); // inverse pour aligner sens (1=meilleur)
const sp_rank_expected = spearman(bet_inverse_rank, zoran_expected);

console.log('─── RÉSULTATS P0-MINI ───\n');
console.log('  BET annotations reçues :');
caseIds.forEach((id, i) => {
  console.log(`    ${id} : note=${bet_scores[i]}  rank=${bet_rankings[i]}  zoran_exp=${zoran_expected[i]}`);
});

console.log('\n  CORRÉLATIONS :');
console.log(`    Spearman BET ↔ ZORAN_EXPECTED    : ${sp_expected.toFixed(3)}`);
console.log(`    Spearman BET ↔ V11_FULL          : ${sp_v11.toFixed(3)}`);
console.log(`    Spearman BET ↔ V12_ADVERSARIAL   : ${sp_v12.toFixed(3)}`);
console.log(`    Kendall Tau  BET ↔ ZORAN         : ${k_expected.toFixed(3)}`);

// Verdict
let verdict;
const primarySpearman = sp_v11; // pipeline FULL = référence runtime actuelle
if (primarySpearman >= 0.60) {
  verdict = 'ARCHITECTURE_V11_VALIDATED_PROVISIONALLY';
  console.log(`\n  ★ VERDICT : ${verdict}`);
  console.log('  → Roadmap V13 autorisée avec extension P0 (30 cas, 3 BET)');
} else if (primarySpearman >= 0.40) {
  verdict = 'PARTIALLY_VALID_STRONG_INTERNAL_BIAS';
  console.log(`\n  ★ VERDICT : ${verdict}`);
  console.log('  → Recalibration obligatoire avant V13');
} else {
  verdict = 'STOP_V13_REBUILD_METHODOLOGICAL';
  console.log(`\n  ★ VERDICT : ${verdict}`);
  console.log('  → Ground truth synthétique invalidé');
  console.log('  → Retour planche à dessin');
}

// Sauvegarder P0_MINI_RESULTS.json
const results = {
  mission_id: 'ZORAN_P0_REAL_WORLD_CALIBRATION_20260517',
  executed_at: new Date().toISOString(),
  n_cases: 5,
  n_bet_annotators: 1,
  spearman_bet_vs_zoran_expected: +sp_expected.toFixed(3),
  spearman_bet_vs_v11_full: +sp_v11.toFixed(3),
  spearman_bet_vs_v12: +sp_v12.toFixed(3),
  kendall_tau: +k_expected.toFixed(3),
  spearman_ranks_aligned: +sp_rank_expected.toFixed(3),
  verdict,
  primary_spearman_used_for_verdict: +primarySpearman.toFixed(3),
  bet_scores,
  bet_rankings,
  zoran_expected,
  zoran_v11_full,
  zoran_v12,
  honest_limits: [
    'N=5 cas trop faible pour significativité statistique forte',
    'N=1 BET (pas de variance inter-experts mesurée)',
    'Sélection BET par utilisateur introduit biais',
    'Cas adversariaux construits par moi → biais ground truth synthétique',
  ],
};

fs.writeFileSync('audit/P0_MINI_RESULTS.json', JSON.stringify(results, null, 2));
console.log('\n✓ audit/P0_MINI_RESULTS.json écrit');
console.log('\n📋 PROCHAINE ÉTAPE :');
console.log('   Mettre à jour audit/P0_ARCHITECTURE_DECISION.md avec le verdict');
console.log('   Commit + push intégral (engagement non-rationalisation)');
console.log('═══════════════════════════════════════════════════════════════');
