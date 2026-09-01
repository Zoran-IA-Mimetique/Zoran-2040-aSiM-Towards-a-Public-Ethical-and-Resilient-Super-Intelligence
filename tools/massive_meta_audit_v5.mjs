// tools/massive_meta_audit_v5.mjs
// Mission V8 — META AUDIT ANTI-GOODHART : 500+ cas adversariaux paramétriques
//
// Générateur de Goodhart-traps × 7 domaines × 5 patterns × ~15 variantes
// = ~525 cas. Mesure discriminant power des nouvelles métriques.

import fs from 'node:fs';
import { auditMetrics } from '../app/src/meta_metric_auditor.js';
import { generateCounterHypotheses, frameRefutationScore } from '../app/src/frame_refutation_engine.js';
import { determineValidationStatus } from '../app/src/validation_status.js';
import { runAntiGoodhart } from '../app/src/anti_goodhart.js';

// ───────────────────── GÉNÉRATEUR DE CAS ─────────────────────

// 7 domaines × KPI principal
const DOMAINS = [
  { name: 'SAAS',       kpi: 'LTV/CAC',   metric_value: '5.2', good_threshold: '>3' },
  { name: 'SAAS_NRR',   kpi: 'NRR',       metric_value: '130%', good_threshold: '>110%' },
  { name: 'MARKETING',  kpi: 'ROAS',      metric_value: '4.5', good_threshold: '>3' },
  { name: 'PRODUCT',    kpi: 'NPS',       metric_value: '72',  good_threshold: '>50' },
  { name: 'BTP',        kpi: 'DPE',       metric_value: 'A',   good_threshold: 'A ou B' },
  { name: 'MEDECINE',   kpi: 'biomarqueur HbA1c', metric_value: '6.5%', good_threshold: '<7%' },
  { name: 'CONTENT',    kpi: 'engagement', metric_value: '45 min/session', good_threshold: '>30 min' },
];

// 5 patterns de Goodhart-trap
const PATTERNS = [
  {
    name: 'PUR_GOODHART',
    template: ({ kpi, value, threshold }) => `Le ${kpi} atteint ${value}, excellent résultat (${threshold}). Performance optimale validée.`,
    expect: { goodhart_high: true, refutation_fires: true },
  },
  {
    name: 'AVEC_SOURCES',
    template: ({ kpi, value }) => `Selon l'étude INSEE 2025, le ${kpi} de ${value} est validé. Source : rapport chapitre 4. Données de 2025.`,
    expect: { goodhart_high: false, refutation_fires: false, status: 'externally_supported' },
  },
  {
    name: 'AVEC_CONTRE_HYPOTHESES',
    template: ({ kpi, value }) => `Le ${kpi} atteint ${value}. Toutefois, attention au Goodhart : ce ratio peut être soutenu par déplacement coûts ou subvention temporaire. Et si cela masquait une dégradation différée ? Mise en garde à vérifier sur 18 mois.`,
    expect: { refutation_fires: false },  // auto-réfutation présente
  },
  {
    name: 'HYPER_OPTIMISE',
    template: ({ kpi, value }) => `Le ${kpi} a été maximisé à ${value}. Score record. Performance exceptionnelle. Résultat impressionnant et croissance forte.`,
    expect: { goodhart_high: true, refutation_fires: true },
  },
  {
    name: 'CONTEXTE_LIMITE',
    template: ({ kpi, value }) => `Le ${kpi} atteint ${value} dans le contexte spécifique de notre PME nantaise en 2025, hors export. Champ d'application limité aux clients B2B.`,
    expect: { status: ['externally_supported', 'internal_only'] },
  },
];

// Variantes lexicales pour amplifier le corpus
const VARIANTS = [
  text => text,
  text => `${text} L'équipe est satisfaite.`,
  text => `Mise à jour : ${text}`,
  text => `${text} À noter.`,
  text => `Rapport hebdo : ${text}`,
  text => `Constat : ${text}`,
  text => `${text} Bilan provisoire.`,
  text => text.replace(/excellent/gi, 'remarquable'),
  text => text.replace(/optimal/gi, 'optimisé'),
  text => text.replace(/atteint/gi, 'a obtenu'),
  text => text.replace(/Performance/gi, 'Résultat'),
  text => `KPI dashboard : ${text}`,
  text => `Vu ce matin : ${text}`,
  text => `${text} Confirmé par la direction.`,
  text => `Métrique clé : ${text}`,
];

function generateCorpus() {
  const cases = [];
  for (const domain of DOMAINS) {
    for (const pattern of PATTERNS) {
      for (const variant of VARIANTS) {
        const baseText = pattern.template({
          kpi: domain.kpi, value: domain.metric_value, threshold: domain.good_threshold,
        });
        const text = variant(baseText);
        cases.push({
          domain: domain.name,
          pattern: pattern.name,
          text,
          expect: pattern.expect,
        });
      }
    }
  }
  return cases;
}

// ───────────────────── ÉVALUATEUR ─────────────────────
function evaluateText(text) {
  const audit = auditMetrics(text);
  const refutation = frameRefutationScore(text);
  const counterHyp = generateCounterHypotheses(text);
  const status = determineValidationStatus(text);
  const goodhart = runAntiGoodhart(text);
  return {
    kpis_detected: audit.kpis_detected,
    meta_risk_composite: audit.meta_risk_composite,
    avg_manipulability: audit.avg_manipulability,
    avg_proxy_distance: audit.avg_proxy_distance,
    avg_delayed_failure: audit.avg_delayed_failure,
    refutation_score: refutation.score,
    refutation_fires: refutation.fires,
    counter_hyp_count: counterHyp.counter_hypotheses.length,
    self_refutation_count: counterHyp.self_refutation_count,
    validation_status: status.status,
    goodhart_risk: goodhart.goodhart_risk,
    grounding_present: status.flags.grounding_present,
    temporal_bounded: status.flags.temporal_bounded,
    scope_explicit: status.flags.scope_explicit,
  };
}

// ───────────────────── RUN ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  MASSIVE META AUDIT V5 — 500+ cas Goodhart-traps paramétriques');
console.log('═══════════════════════════════════════════════════════════════\n');

const corpus = generateCorpus();
console.log(`Corpus généré : ${corpus.length} cas (${DOMAINS.length} domaines × ${PATTERNS.length} patterns × ${VARIANTS.length} variantes)\n`);

const t0 = Date.now();
const results = corpus.map((c, i) => ({ ...c, eval: evaluateText(c.text) }));
const dt = Date.now() - t0;
console.log(`Évalué en ${dt}ms — ${(corpus.length * 1000 / dt).toFixed(0)} cas/sec\n`);

// ───────────────────── STATS PAR PATTERN ─────────────────────
console.log('───────── DISCRIMINATION PAR PATTERN ─────────\n');
const byPattern = {};
for (const r of results) {
  if (!byPattern[r.pattern]) byPattern[r.pattern] = [];
  byPattern[r.pattern].push(r.eval);
}
for (const [p, evals] of Object.entries(byPattern)) {
  const avgMeta = evals.reduce((s, e) => s + e.meta_risk_composite, 0) / evals.length;
  const avgRef = evals.reduce((s, e) => s + e.refutation_score, 0) / evals.length;
  const refFires = evals.filter(e => e.refutation_fires).length;
  const grounded = evals.filter(e => e.grounding_present).length;
  console.log(`  ${p.padEnd(20)}  meta_risk=${avgMeta.toFixed(2)}  refutation=${avgRef.toFixed(2)}  fires=${refFires}/${evals.length}  grounded=${grounded}/${evals.length}`);
}

// ───────────────────── STATS PAR DOMAINE ─────────────────────
console.log('\n───────── DISCRIMINATION PAR DOMAINE ─────────\n');
const byDomain = {};
for (const r of results) {
  if (!byDomain[r.domain]) byDomain[r.domain] = [];
  byDomain[r.domain].push(r.eval);
}
for (const [d, evals] of Object.entries(byDomain)) {
  const avgMeta = evals.reduce((s, e) => s + e.meta_risk_composite, 0) / evals.length;
  const avgRef = evals.reduce((s, e) => s + e.refutation_score, 0) / evals.length;
  console.log(`  ${d.padEnd(15)}  meta_risk=${avgMeta.toFixed(2)}  refutation=${avgRef.toFixed(2)}`);
}

// ───────────────────── VALIDATION ─────────────────────
console.log('\n───────── VALIDATION EXPECTATIONS ─────────\n');
let correct = 0, total = 0;
const failures = [];
for (const r of results) {
  if (!r.expect) continue;
  total++;
  let ok = true;
  const e = r.eval;
  if (r.expect.goodhart_high && e.meta_risk_composite < 0.50) ok = false;
  if (r.expect.goodhart_high === false && e.meta_risk_composite >= 0.50) ok = false;
  if (r.expect.refutation_fires === true && !e.refutation_fires) ok = false;
  if (r.expect.refutation_fires === false && e.refutation_fires) ok = false;
  if (r.expect.status) {
    const accepted = Array.isArray(r.expect.status) ? r.expect.status : [r.expect.status];
    if (!accepted.includes(e.validation_status)) ok = false;
  }
  if (ok) correct++;
  else failures.push({ ...r, reason: 'unmet_expectation' });
}
console.log(`  Expectations matched : ${correct}/${total} (${(100*correct/total).toFixed(1)}%)`);

// ───────────────────── DISCRIMINATION RATIO ─────────────────────
console.log('\n───────── DISCRIMINATION INTER-PATTERN ─────────\n');
const purGoodhart = byPattern.PUR_GOODHART;
const avecSources = byPattern.AVEC_SOURCES;
const avecRef = byPattern.AVEC_CONTRE_HYPOTHESES;
if (purGoodhart && avecSources && avecRef) {
  const purMeta = purGoodhart.reduce((s, e) => s + e.meta_risk_composite, 0) / purGoodhart.length;
  const srcMeta = avecSources.reduce((s, e) => s + e.meta_risk_composite, 0) / avecSources.length;
  const refMeta = avecRef.reduce((s, e) => s + e.refutation_score, 0) / avecRef.length;
  const purRefScore = purGoodhart.reduce((s, e) => s + e.refutation_score, 0) / purGoodhart.length;
  console.log(`  meta_risk PUR_GOODHART vs AVEC_SOURCES : ${purMeta.toFixed(2)} vs ${srcMeta.toFixed(2)}  ratio=${(purMeta/Math.max(0.01,srcMeta)).toFixed(2)}×`);
  console.log(`  refutation AVEC_CONTRE_HYP vs PUR_GOODHART : ${refMeta.toFixed(2)} vs ${purRefScore.toFixed(2)}  ratio=${(refMeta/Math.max(0.01,purRefScore)).toFixed(2)}×`);
}

// ───────────────────── ÉCRITURE RAPPORT ─────────────────────
const audit = {
  mission_id: 'MASSIVE_META_AUDIT_V5_20260517',
  corpus_size: corpus.length,
  by_pattern: Object.fromEntries(Object.entries(byPattern).map(([k, evals]) => [k, {
    count: evals.length,
    avg_meta_risk: +(evals.reduce((s, e) => s + e.meta_risk_composite, 0) / evals.length).toFixed(3),
    avg_refutation_score: +(evals.reduce((s, e) => s + e.refutation_score, 0) / evals.length).toFixed(3),
    refutation_fires: evals.filter(e => e.refutation_fires).length,
    grounding_present: evals.filter(e => e.grounding_present).length,
  }])),
  by_domain: Object.fromEntries(Object.entries(byDomain).map(([k, evals]) => [k, {
    count: evals.length,
    avg_meta_risk: +(evals.reduce((s, e) => s + e.meta_risk_composite, 0) / evals.length).toFixed(3),
    avg_refutation_score: +(evals.reduce((s, e) => s + e.refutation_score, 0) / evals.length).toFixed(3),
  }])),
  validation_metrics: {
    expectations_matched: correct,
    expectations_total: total,
    success_rate: +((correct / total) * 100).toFixed(1),
  },
  duration_ms: dt,
  sample_cases: results.slice(0, 10),
};
fs.writeFileSync('audit/MASSIVE_META_AUDIT_V5_RESULTS.json', JSON.stringify(audit, null, 2));

console.log(`\n✓ Rapport JSON : audit/MASSIVE_META_AUDIT_V5_RESULTS.json`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(correct / total >= 0.80 ? 0 : 1);
