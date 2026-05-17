// tools/massive_evaluation_suite.mjs
// MASSIVE EVALUATION — applique TOUS les critères (V1+V2+V3) sur un
// corpus synthétique paramétrique de 100 textes / 5 archétypes.
//
// Mission : valider que la SUITE de métriques discrimine correctement
// les archétypes de réponse, sans nécessiter d'API LLM live.
//
// Archétypes (20 textes chacun) :
//   ARCH_GOODHART_PUR        — KPI/proxy/maximisation sans coût nommé
//   ARCH_SYSTEMIC_RICHE      — résilience, multi-échelle, multi-causes
//   ARCH_JARGON_ZORAN        — surcharge en termes ZORAN, pas de terrain
//   ARCH_TERRAIN_PRO         — vocabulaire métier dense, peu de méta
//   ARCH_VERBEUX_VIDE        — méta-phrases, prudence rituelle, peu de signal
//
// Pour chaque texte, calcule TOUS les scores et compile un rapport :
//   - score moyen / écart-type par archétype × métrique
//   - matrice de discrimination (quelles métriques séparent quels archétypes)
//   - alertes : métrique qui ne discrimine pas (variance inter-classe basse)

import fs from 'node:fs';
import path from 'node:path';

// V1 metrics (jargon, completion)
import { jargonDensity, userDistance, practicalUsefulness, metaNoise, concreteRuntimeAlignment, detectJargonTerms } from '../app/src/jargon.js';
import { terrainAlignment, fieldActionability, completionIntegrity } from '../app/src/completion.js';
// V2 metrics (noise_killer)
import { usefulInformationDensity, usefulInformationDensityV2, cognitiveLoad, robustnessOOD, globalUsefulness } from '../app/src/noise_killer.js';
// V3 metrics (systemic + Goodhart)
import { systemicCoherenceReport } from '../app/src/systemic_coherence.js';
import { runAntiGoodhart } from '../app/src/anti_goodhart.js';

// ───────────────────── CORPUS GÉNÉRATEUR ─────────────────────
function permute(arr, seed) {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const GOODHART_SEEDS = [
  ['maximiser le KPI', 'optimiser le DPE', 'pousser le score', 'augmenter le ranking', 'driver le benchmark'],
  ['gain immédiat', 'résoudre le symptôme', 'optimiser ce module spécifique', 'amélioration ponctuelle locale'],
  ['gouverner par la métrique', 'piloter par l\'indicateur unique', 'focus exclusif sur le KPI'],
  ['la seule cause est', 'unique raison principale', 'monocausal — explication simple'],
  ['rapide et facile', 'quick win', 'effet immédiat', 'court terme uniquement'],
];

const SYSTEMIC_SEEDS = [
  ['préserver les marges de sécurité', 'redondance critique', 'capacité d\'adaptation', 'tampon disponible', 'absorbeur de chocs', 'résilience préservée'],
  ['effet global sur le système', 'impact d\'ensemble', 'cascade possible', 'propagation à considérer', 'cohérence d\'ensemble'],
  ['multi-factoriel : cofacteurs multiples', 'cause racine vs cause directe', 'chaîne causale complexe', 'corrélation n\'est pas causalité', 'plusieurs causes en interaction'],
  ['long terme', 'à 5 ans', 'effet différé', 'dette invisible cachée', 'durabilité', 'coût d\'opportunité non mesuré'],
  ['proxy à distinguer de la cible réelle', 'limite de la métrique', 'attention au Goodhart', 'au prix d\'une perte', 'faux bénéfice possible', 'gain trompeur à surveiller'],
];

const JARGON_SEEDS = [
  ['résonance silencieuse', 'cohérence fractale', 'attracteur ULG', 'palier WP-11', 'isomorphisme SDE'],
  ['ΔVE structurel', 'GHUC dominant', 'VAR systémique', 'oracle de stabilité'],
  ['propagation S_local', 'gap S_global', 'fausse cohérence détectée'],
];

const TERRAIN_SEEDS = [
  ['vérifier IPN de section 200×100', 'BET structure à consulter', 'DTU 25.41 applicable', 'Eurocode 3 chapitre 6'],
  ['anamnèse complète', 'ECG 12 dérivations', 'NFS-plaquettes', 'créatininémie à doser'],
  ['arrêt Tabary 2018', 'jurisprudence Cass. civ. 1', 'article 1240 Code civil', 'opposabilité au tiers'],
  ['couple de serrage 35 Nm', 'classe étanchéité IP67', 'tolérance ±0.5 mm', 'épaisseur 18 mm'],
];

const VERBEUX_SEEDS = [
  ['il est important de noter que', 'il convient de souligner', 'en conclusion', 'cela étant dit'],
  ['par ailleurs', 'de plus', 'cependant', 'néanmoins', 'en outre'],
  ['il peut être utile', 'sous certaines conditions', 'selon le contexte', 'le cas échéant'],
  ['comme mentionné précédemment', 'pour résumer', 'au final', 'finalement'],
];

function buildText(seedGroups, seed, length = 4) {
  const sentences = [];
  for (let i = 0; i < length; i++) {
    const group = seedGroups[i % seedGroups.length];
    const phrase = permute(group, seed + i)[0];
    sentences.push(phrase);
  }
  return sentences.join('. ') + '.';
}

function generateCorpus(n_per_arch = 20) {
  const archetypes = {
    ARCH_GOODHART_PUR: GOODHART_SEEDS,
    ARCH_SYSTEMIC_RICHE: SYSTEMIC_SEEDS,
    ARCH_JARGON_ZORAN: JARGON_SEEDS,
    ARCH_TERRAIN_PRO: TERRAIN_SEEDS,
    ARCH_VERBEUX_VIDE: VERBEUX_SEEDS,
  };
  const corpus = [];
  let id = 0;
  for (const [arch, seeds] of Object.entries(archetypes)) {
    for (let i = 0; i < n_per_arch; i++) {
      const text = buildText(seeds, i * 17 + 31, 4 + (i % 3));
      corpus.push({ id: `${arch}_${String(i).padStart(2, '0')}`, archetype: arch, text });
      id++;
    }
  }
  return corpus;
}

// ───────────────────── ÉVALUATEUR ─────────────────────
function evaluateText(text, question = 'analyse ce système') {
  const sysReport = systemicCoherenceReport(text);
  const goodReport = runAntiGoodhart(text);
  return {
    // V1
    jargon_density: +jargonDensity(text).toFixed(3),
    user_distance: +userDistance(text, question).toFixed(3),
    practical_usefulness: +practicalUsefulness(text).toFixed(3),
    meta_noise: +metaNoise({ answerText: text, questionText: question }).toFixed(3),
    concrete_runtime_alignment: +concreteRuntimeAlignment({ answerText: text, questionText: question }).toFixed(3),
    terrain_alignment: +terrainAlignment(text).toFixed(3),
    // V2
    useful_information_density: +usefulInformationDensity(text).toFixed(3),
    useful_information_density_v2: +usefulInformationDensityV2(text).toFixed(3),
    cognitive_load: +cognitiveLoad(text).toFixed(3),
    robustness_OOD: +robustnessOOD(text).toFixed(3),
    global_usefulness: +globalUsefulness({
      pertinence_domaine: 0.5,
      actionnabilite: practicalUsefulness(text),
      coherence: 0.5,
      robustesse_ambiguite: robustnessOOD(text),
      bruit: 1 - usefulInformationDensity(text),
      calibration_doute: robustnessOOD(text),
      stabilite_reformulation: 0.5,
    }).toFixed(3),
    // V3 systemic
    sys_resilience: sysReport.resilience,
    sys_multiscale: sysReport.multiscale,
    sys_false_benefit_detec: sysReport.false_benefit_detec,
    sys_causal_robustness: sysReport.causal_robustness,
    sys_long_term_viability: sysReport.long_term_viability,
    sys_composite: sysReport.composite,
    // V3 Goodhart
    goodhart_risk: goodReport.goodhart_risk,
    goodhart_systemic_health: goodReport.systemic_health,
    goodhart_fired_count: goodReport.fired_count,
    goodhart_false_optimization: goodReport.checks.false_optimization.score,
    goodhart_proxy_collapse: goodReport.checks.proxy_collapse.score,
    goodhart_metric_tunnel: goodReport.checks.metric_tunnel.score,
    goodhart_local_global_conflict: goodReport.checks.local_vs_global_conflict.score,
  };
}

// ───────────────────── ANALYSE STATS ─────────────────────
function statsByArchetype(corpus, evaluations) {
  const byArch = {};
  for (let i = 0; i < corpus.length; i++) {
    const arch = corpus[i].archetype;
    if (!byArch[arch]) byArch[arch] = [];
    byArch[arch].push(evaluations[i]);
  }
  const metrics = Object.keys(evaluations[0]);
  const stats = {};
  for (const arch of Object.keys(byArch)) {
    stats[arch] = {};
    for (const m of metrics) {
      const vals = byArch[arch].map(e => e[m]).filter(v => typeof v === 'number');
      if (vals.length === 0) continue;
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
      stats[arch][m] = { mean: +mean.toFixed(3), std: +Math.sqrt(variance).toFixed(3) };
    }
  }
  return stats;
}

function discriminationMatrix(stats) {
  // Pour chaque métrique, calcule la séparation max entre archétypes
  // (max_mean - min_mean) / max_std → ratio de discrimination
  const metrics = Object.keys(Object.values(stats)[0]);
  const matrix = {};
  for (const m of metrics) {
    const means = Object.entries(stats).map(([arch, s]) => ({ arch, mean: s[m].mean, std: s[m].std }));
    const sorted = means.sort((a, b) => b.mean - a.mean);
    const maxStd = Math.max(...means.map(x => x.std), 0.001);
    const range = sorted[0].mean - sorted[sorted.length - 1].mean;
    const discrimination = +(range / maxStd).toFixed(2);
    matrix[m] = {
      max_arch: sorted[0].arch,
      max_mean: sorted[0].mean,
      min_arch: sorted[sorted.length - 1].arch,
      min_mean: sorted[sorted.length - 1].mean,
      range: +range.toFixed(3),
      max_std: +maxStd.toFixed(3),
      discrimination_ratio: discrimination,
      verdict: discrimination >= 2 ? 'STRONG' : discrimination >= 1 ? 'MODERATE' : discrimination >= 0.5 ? 'WEAK' : 'NO_SIGNAL',
    };
  }
  return matrix;
}

// ───────────────────── RUN ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  MASSIVE EVALUATION SUITE — V1+V2+V3 sur corpus synthétique');
console.log('═══════════════════════════════════════════════════════════════\n');

const N_PER_ARCH = 20;
const corpus = generateCorpus(N_PER_ARCH);
console.log(`Corpus généré : ${corpus.length} textes × 5 archétypes (${N_PER_ARCH}/arch)\n`);

console.log('Calcul des métriques (24 par texte)...');
const t0 = Date.now();
const evaluations = corpus.map(c => evaluateText(c.text));
const dt = Date.now() - t0;
console.log(`OK — ${corpus.length} × 24 = ${corpus.length * 24} mesures en ${dt}ms\n`);

const stats = statsByArchetype(corpus, evaluations);
const discriminationMx = discriminationMatrix(stats);

// ───────────────────── RAPPORT CONSOLE ─────────────────────
console.log('───────── DISCRIMINATION PAR MÉTRIQUE (range/std) ─────────');
console.log('  STRONG ≥ 2.0 | MODERATE ≥ 1.0 | WEAK ≥ 0.5 | NO_SIGNAL < 0.5\n');
const sortedByDisc = Object.entries(discriminationMx).sort((a, b) => b[1].discrimination_ratio - a[1].discrimination_ratio);
for (const [m, d] of sortedByDisc) {
  const tag = d.verdict.padEnd(10);
  console.log(`  ${tag} ${d.discrimination_ratio.toFixed(2).padStart(5)}  ${m.padEnd(35)}  high=${d.max_arch} (${d.max_mean})  low=${d.min_arch} (${d.min_mean})`);
}

console.log('\n───────── SCORES MOYENS PAR ARCHÉTYPE ─────────\n');
const keyMetrics = ['jargon_density', 'concrete_runtime_alignment', 'useful_information_density_v2',
  'sys_composite', 'goodhart_risk', 'sys_resilience', 'sys_multiscale',
  'goodhart_false_optimization', 'goodhart_proxy_collapse'];
process.stdout.write('  ARCHÉTYPE'.padEnd(28));
for (const m of keyMetrics) process.stdout.write(m.slice(0, 12).padEnd(14));
process.stdout.write('\n');
for (const arch of Object.keys(stats)) {
  process.stdout.write(`  ${arch}`.padEnd(28));
  for (const m of keyMetrics) {
    const v = stats[arch][m];
    process.stdout.write((v ? v.mean.toFixed(2) : '—').padEnd(14));
  }
  process.stdout.write('\n');
}

// ───────────────────── RAPPORTS JSON + MD ─────────────────────
const outJson = {
  mission_id: 'MASSIVE_EVALUATION_V3_20260517',
  corpus_size: corpus.length,
  archetypes: Object.keys(stats),
  metrics_count: Object.keys(evaluations[0]).length,
  duration_ms: dt,
  stats_by_archetype: stats,
  discrimination_matrix: discriminationMx,
  // 3 exemples par archétype pour traçabilité
  sample_evaluations: corpus.slice(0, 5).concat(
    corpus.slice(20, 25), corpus.slice(40, 45), corpus.slice(60, 65), corpus.slice(80, 85)
  ).map((c, i) => ({
    id: c.id, archetype: c.archetype, text: c.text,
    eval: evaluations[corpus.findIndex(x => x.id === c.id)],
  })),
};

fs.writeFileSync('audit/MASSIVE_EVALUATION_V3_RESULTS.json', JSON.stringify(outJson, null, 2));
console.log('\n✓ Rapport JSON : audit/MASSIVE_EVALUATION_V3_RESULTS.json');

// Markdown synthétique
const strong = sortedByDisc.filter(([_, d]) => d.verdict === 'STRONG').length;
const moderate = sortedByDisc.filter(([_, d]) => d.verdict === 'MODERATE').length;
const weak = sortedByDisc.filter(([_, d]) => d.verdict === 'WEAK').length;
const noSignal = sortedByDisc.filter(([_, d]) => d.verdict === 'NO_SIGNAL').length;

const mdLines = [
  '# MASSIVE EVALUATION V3 — Rapport',
  '',
  `**Mission** : \`MASSIVE_EVALUATION_V3_20260517\``,
  `**Corpus** : ${corpus.length} textes (5 archétypes × ${N_PER_ARCH})`,
  `**Métriques** : ${Object.keys(evaluations[0]).length} mesures par texte`,
  `**Total** : ${corpus.length * Object.keys(evaluations[0]).length} évaluations en ${dt} ms`,
  '',
  '## Verdict global discrimination',
  '',
  `| Verdict | Nombre métriques | % |`,
  `|---|---|---|`,
  `| STRONG (≥ 2.0)    | ${strong}  | ${(100*strong/sortedByDisc.length).toFixed(0)}% |`,
  `| MODERATE (≥ 1.0)  | ${moderate} | ${(100*moderate/sortedByDisc.length).toFixed(0)}% |`,
  `| WEAK (≥ 0.5)      | ${weak}    | ${(100*weak/sortedByDisc.length).toFixed(0)}% |`,
  `| NO_SIGNAL (< 0.5) | ${noSignal} | ${(100*noSignal/sortedByDisc.length).toFixed(0)}% |`,
  '',
  '## Top 10 métriques discriminantes',
  '',
  '| Métrique | Discr. ratio | Verdict | High arch | Low arch |',
  '|---|---|---|---|---|',
  ...sortedByDisc.slice(0, 10).map(([m, d]) =>
    `| ${m} | ${d.discrimination_ratio} | ${d.verdict} | ${d.max_arch} (${d.max_mean}) | ${d.min_arch} (${d.min_mean}) |`),
  '',
  '## Métriques sans signal',
  '',
  ...sortedByDisc.filter(([_, d]) => d.verdict === 'NO_SIGNAL').map(([m, d]) =>
    `- \`${m}\` — range ${d.range}, std ${d.max_std} → tous archétypes confondus`),
  '',
  '## Scores composites par archétype',
  '',
  '| Archétype | jargon | useful_info_v2 | sys_composite | goodhart_risk |',
  '|---|---|---|---|---|',
  ...Object.entries(stats).map(([arch, s]) =>
    `| ${arch} | ${s.jargon_density?.mean ?? '—'} | ${s.useful_information_density_v2?.mean ?? '—'} | ${s.sys_composite?.mean ?? '—'} | ${s.goodhart_risk?.mean ?? '—'} |`),
  '',
  '## Honnêteté',
  '',
  '- Corpus **synthétique** construit par permutation de phrases-graines.',
  '  Pas de réponses LLM réelles.',
  '- Mesure la **discrimination des métriques entre archétypes connus** —',
  '  pas la qualité absolue. Une métrique STRONG distingue clairement',
  '  Goodhart vs systemic, mais ne dit pas qu\'elle prédit la "vraie qualité".',
  '- Une métrique NO_SIGNAL ne réagit pas aux différences entre archétypes',
  '  → soit elle est insensible (lex incomplet), soit elle mesure une',
  '  dimension orthogonale aux archétypes choisis.',
  '- Validation live (sur réponses Claude/Sonnet réelles) reste à faire.',
];
fs.writeFileSync('audit/MASSIVE_EVALUATION_V3_REPORT.md', mdLines.join('\n'));
console.log('✓ Rapport MD   : audit/MASSIVE_EVALUATION_V3_REPORT.md');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RÉSULTAT : ${strong} STRONG, ${moderate} MODERATE, ${weak} WEAK, ${noSignal} NO_SIGNAL`);
console.log(`  sur ${sortedByDisc.length} métriques évaluées`);
console.log('═══════════════════════════════════════════════════════════════');
