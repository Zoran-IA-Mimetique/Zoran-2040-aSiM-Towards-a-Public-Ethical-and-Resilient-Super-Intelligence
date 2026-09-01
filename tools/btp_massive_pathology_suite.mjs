// tools/btp_massive_pathology_suite.mjs
// Mission V9 — BTP_SUPREMACY massive corpus 300+ cases

import fs from 'node:fs';
import { detectPathologies, btpOperationalScore, btpAnalysis, isBTPQuestion,
  multiCauseResolutionScore, hierarchyComplianceScore, decennaleAwarenessScore,
  fieldActionabilityScore, contradictoryAuditStrengthScore } from '../app/src/btp_supremacy_engine.js';
import { generateAllCTAs, detectCTAPresence } from '../app/src/zoran_cta_engine.js';

// ───────────────────── CORPUS — 7 catégories ─────────────────────

// ─── CAT 1: PATHOLOGIES SIMPLES (10 cas)
const SIMPLE_PATHO = [
  { q: 'Mon mur extérieur présente des fissures verticales de 2mm. Que faire ?', patho: ['fissuration'] },
  { q: 'J\'ai des taches d\'humidité au pied du mur Nord, quelle cause ?', patho: ['humidite'] },
  { q: 'Mes IPN sont rouillées dans la cave humide. Risque structurel ?', patho: ['ipn', 'corrosion'] },
  { q: 'Tassement différentiel observé sur dalle béton, comment diagnostiquer ?', patho: ['tassement'] },
  { q: 'Sols argileux + sécheresse 2023, RGA possible ?', patho: ['rga'] },
  { q: 'Condensation persistante sur fenêtres en hiver, problème VMC ?', patho: ['ventilation', 'thermique'] },
  { q: 'Tuiles déplacées après tempête, comment évaluer la charpente ?', patho: ['charpente'] },
  { q: 'Affaissement de chaussée près des canalisations, hydrologie ?', patho: ['voirie', 'hydrologie'] },
  { q: 'Repérage amiante avant travaux, qui contacter ?', patho: ['amiante'] },
  { q: 'Pont thermique visible en infrarouge, intervention nécessaire ?', patho: ['thermique'] },
];

// ─── CAT 2: PATHOLOGIES COUPLÉES (10 cas)
const COUPLED_PATHO = [
  { q: 'Fissures escalier + humidité base + corrosion armatures visibles, diagnostic ?', patho: ['fissuration', 'humidite', 'corrosion'] },
  { q: 'RGA + tassement différentiel sur sol argileux après sécheresse', patho: ['rga', 'tassement'] },
  { q: 'Condensation + ventilation insuffisante + ponts thermiques', patho: ['humidite', 'ventilation', 'thermique'] },
  { q: 'IPN corrodés + reprise sous-œuvre envisagée, séquence travaux ?', patho: ['ipn', 'corrosion', 'reprise_sous_oeuvre'] },
  { q: 'Charpente déformée + infiltration + champignons lignivores', patho: ['charpente', 'humidite'] },
  { q: 'Hydrologie défavorable + tassement + fissures cascade', patho: ['hydrologie', 'tassement', 'fissuration'] },
  { q: 'Voirie affaissée + drainage défaillant + nappe affleurante', patho: ['voirie', 'hydrologie'] },
  { q: 'Décennale + impropre à destination + fissures structurelles, recours ?', patho: ['decennale', 'fissuration'] },
  { q: 'Contreventement insuffisant + tassement + IPN sous-dimensionnées', patho: ['contreventement', 'tassement', 'ipn'] },
  { q: 'Amiante + travaux thermique + ventilation à reprendre', patho: ['amiante', 'thermique', 'ventilation'] },
];

// ─── CAT 3: PIÈGES (faux positifs / faux négatifs) (8 cas)
const TRAPS = [
  { q: 'Le voisin dit que mes fissures sont du RGA, mais ma maison est sur roche calcaire', patho: ['fissuration', 'rga'], trap: 'false_RGA' },
  { q: 'L\'expert dit que c\'est structurel mais les fissures sont esthétiques < 0.2mm', patho: ['fissuration'], trap: 'false_structural' },
  { q: 'On me dit que c\'est de l\'humidité de remontée, mais c\'est en façade Sud orientée', patho: ['humidite'], trap: 'false_humidite' },
  { q: 'L\'entreprise propose résine + injection sans diagnostic préalable', patho: [], trap: 'solution_avant_diagnostic' },
  { q: 'Devis 50k€ urgent reprise sous-œuvre sans rapport BET', patho: ['reprise_sous_oeuvre'], trap: 'urgence_artificielle' },
  { q: 'On veut me faire signer décennale alors que travaux sont esthétiques', patho: ['decennale'], trap: 'decennale_abusive' },
  { q: 'DPE A après isolation extérieure, mais condensation augmente', patho: ['thermique', 'humidite'], trap: 'goodhart_DPE' },
  { q: 'IPN posée sans étude charges, on me dit que ça tient', patho: ['ipn'], trap: 'sous_dimensionnement' },
];

// ─── CAT 4: DÉCENNALE / ASSURANCE / EXPERTISE (8 cas)
const LEGAL = [
  { q: 'Décennale engagée pour fissures structurelles post-réception, procédure ?', patho: ['decennale', 'fissuration'] },
  { q: 'Article 1792 applicable si humidité rend la maison impropre à destination ?', patho: ['decennale', 'humidite'] },
  { q: 'Expertise contradictoire après désordre RGA, comment se préparer ?', patho: ['rga'] },
  { q: 'Refus assureur décennale, recours juridique ?', patho: ['decennale'] },
  { q: 'Parfait achèvement (1 an) vs décennale (10 ans), quel régime pour fissures ?', patho: ['decennale', 'fissuration'] },
  { q: 'Tribunal expertise judiciaire, comment se défendre ?', patho: ['decennale'] },
  { q: 'Mise en cause RCP architecte pour défaut de conception thermique', patho: ['thermique'] },
  { q: 'Sinistre déclaré + assureur conteste, que faire ?', patho: ['decennale'] },
];

// ─── CAT 5: ÉNERGÉTIQUE / DPE / THERMIQUE (8 cas)
const ENERGETIQUE = [
  { q: 'Rénovation thermique : ITE ou ITI sur maison ancienne en pierre ?', patho: ['thermique'] },
  { q: 'DPE F vers C en 6 mois, est-ce réaliste ?', patho: ['thermique'] },
  { q: 'Pompe à chaleur sur bâtiment mal isolé, ROI ?', patho: ['thermique'] },
  { q: 'Condensation après isolation, ventilation insuffisante ?', patho: ['humidite', 'thermique', 'ventilation'] },
  { q: 'Pont thermique acrotère, comment traiter ?', patho: ['thermique'] },
  { q: 'Inertie thermique vs isolation : compromis ?', patho: ['thermique'] },
  { q: 'Test infiltrométrie obligatoire RE2020 ?', patho: ['ventilation', 'thermique'] },
  { q: 'Chauffage électrique + RE2020 + bâtiment ancien, faisable ?', patho: ['thermique'] },
];

// ─── CAT 6: GÉOTECHNIQUE / SOL / HYDROLOGIE (8 cas)
const GEOTECHNIQUE = [
  { q: 'Étude G2 PRO obligatoire pour maison individuelle en zone argileuse ?', patho: ['rga'] },
  { q: 'Nappe phréatique haute, fondations adaptées ?', patho: ['hydrologie', 'tassement'] },
  { q: 'Tassement différentiel après remblai, diagnostic ?', patho: ['tassement'] },
  { q: 'Sondages CPT vs pressiométriques, lequel choisir ?', patho: ['tassement'] },
  { q: 'Drainage périphérique nécessaire sur sol imperméable ?', patho: ['hydrologie'] },
  { q: 'Micropieux ou injection résine pour tassement ?', patho: ['reprise_sous_oeuvre', 'tassement'] },
  { q: 'Ruissellement voirie endommage fondations voisines, responsabilité ?', patho: ['hydrologie', 'voirie'] },
  { q: 'Sols évolutifs (gypse, marnes), reconnaître les indices ?', patho: ['tassement'] },
];

// ─── CAT 7: AUDIT / EXPERTISE TECHNIQUE (8 cas)
const AUDIT = [
  { q: 'Audit technique avant achat immeuble ancien, points critiques ?', patho: [] },
  { q: 'Diagnostic structurel parking souterrain, méthodologie ?', patho: ['corrosion', 'fissuration'] },
  { q: 'Audit pathologie copropriété : par où commencer ?', patho: [] },
  { q: 'Suivi fissurométrique 6 mois, interprétation des données ?', patho: ['fissuration'] },
  { q: 'Caméra thermique en hiver, conditions de mesure ?', patho: ['thermique'] },
  { q: 'Audit décennale 8 ans après réception, vices apparents ou cachés ?', patho: ['decennale'] },
  { q: 'Diagnostic ventilation maison ancienne, méthode ?', patho: ['ventilation'] },
  { q: 'Avis BET structure obligatoire pour reprise sous-œuvre ?', patho: ['reprise_sous_oeuvre'] },
];

// Total : 60 cas de base, on amplifie avec variantes pour 300+
const BASE_CASES = [
  ...SIMPLE_PATHO.map(c => ({ ...c, category: 'SIMPLE_PATHO' })),
  ...COUPLED_PATHO.map(c => ({ ...c, category: 'COUPLED_PATHO' })),
  ...TRAPS.map(c => ({ ...c, category: 'TRAPS' })),
  ...LEGAL.map(c => ({ ...c, category: 'LEGAL' })),
  ...ENERGETIQUE.map(c => ({ ...c, category: 'ENERGETIQUE' })),
  ...GEOTECHNIQUE.map(c => ({ ...c, category: 'GEOTECHNIQUE' })),
  ...AUDIT.map(c => ({ ...c, category: 'AUDIT' })),
];

// Variantes lexicales pour amplifier
const VARIANT_PREFIXES = [
  '',
  'Question expertise : ',
  'Bonjour, ',
  'Pouvez-vous m\'éclairer : ',
  'Diagnostic en cours : ',
];

function generateCorpus() {
  const corpus = [];
  for (const c of BASE_CASES) {
    for (const prefix of VARIANT_PREFIXES) {
      corpus.push({ ...c, q: prefix + c.q });
    }
  }
  return corpus;
}

// ───────────────────── ÉVALUATEUR ─────────────────────
// Pour chaque cas, on évalue :
// 1. Détection pathologies correcte (recall)
// 2. is_btp identifié correctement
// 3. CTA seraient générés (en générant une réponse minimale)

function evaluateCase(c) {
  // Test détection pathologies
  const detected = detectPathologies(c.q);
  const expectedSet = new Set(c.patho);
  const detectedSet = new Set(detected);
  const tp = [...expectedSet].filter(p => detectedSet.has(p)).length;
  const fp = [...detectedSet].filter(p => !expectedSet.has(p)).length;
  const fn = [...expectedSet].filter(p => !detectedSet.has(p)).length;
  const recall = expectedSet.size === 0 ? 1 : tp / expectedSet.size;
  const precision = detectedSet.size === 0 ? 1 : tp / detectedSet.size;

  // Test is_btp
  const isBTP = isBTPQuestion(c.q);

  // CTA generation (sur réponse stub)
  const stub_response = 'Réponse en cours de génération.';
  const ctas = generateAllCTAs({ question: c.q, responseText: stub_response, domain: 'btp' });
  const cta_count = Object.keys(ctas).length;

  return {
    detected_pathologies: detected,
    expected_pathologies: c.patho,
    tp, fp, fn,
    pathology_recall: +recall.toFixed(3),
    pathology_precision: +precision.toFixed(3),
    is_btp_detected: isBTP,
    is_btp_expected: c.patho.length > 0 || /bâtiment|maison|immeuble|construction|mur|sol|fondation/i.test(c.q),
    cta_generated: cta_count,
  };
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  BTP MASSIVE PATHOLOGY SUITE V9');
console.log('═══════════════════════════════════════════════════════════════\n');

const corpus = generateCorpus();
console.log(`Corpus généré : ${corpus.length} cas (${BASE_CASES.length} bases × ${VARIANT_PREFIXES.length} variantes)\n`);

const t0 = Date.now();
const results = corpus.map(c => ({ ...c, eval: evaluateCase(c) }));
const dt = Date.now() - t0;

// ───────────────────── STATS GLOBALES ─────────────────────
const totalTP = results.reduce((s, r) => s + r.eval.tp, 0);
const totalFP = results.reduce((s, r) => s + r.eval.fp, 0);
const totalFN = results.reduce((s, r) => s + r.eval.fn, 0);
const overallRecall = totalTP / Math.max(1, totalTP + totalFN);
const overallPrecision = totalTP / Math.max(1, totalTP + totalFP);
const overallF1 = 2 * overallPrecision * overallRecall / Math.max(0.001, overallPrecision + overallRecall);

const btpDetected = results.filter(r => r.eval.is_btp_detected).length;
const btpExpected = results.filter(r => r.eval.is_btp_expected).length;
const btpAgreement = results.filter(r => r.eval.is_btp_detected === r.eval.is_btp_expected).length;

console.log('───────── DÉTECTION PATHOLOGIES ─────────');
console.log(`  Total TP : ${totalTP}   FP : ${totalFP}   FN : ${totalFN}`);
console.log(`  Precision: ${(overallPrecision * 100).toFixed(1)}%`);
console.log(`  Recall   : ${(overallRecall * 100).toFixed(1)}%`);
console.log(`  F1 Score : ${(overallF1 * 100).toFixed(1)}%`);
console.log('');
console.log('───────── DÉTECTION is_btp ─────────');
console.log(`  Détecté BTP        : ${btpDetected}/${corpus.length}`);
console.log(`  Attendu BTP        : ${btpExpected}/${corpus.length}`);
console.log(`  Agreement          : ${btpAgreement}/${corpus.length} (${(100*btpAgreement/corpus.length).toFixed(1)}%)`);
console.log('');

// ───────────────────── STATS PAR CATÉGORIE ─────────────────────
console.log('───────── PAR CATÉGORIE ─────────');
const byCat = {};
for (const r of results) {
  if (!byCat[r.category]) byCat[r.category] = { total: 0, tp: 0, fp: 0, fn: 0, btp_ok: 0 };
  const e = r.eval;
  byCat[r.category].total++;
  byCat[r.category].tp += e.tp;
  byCat[r.category].fp += e.fp;
  byCat[r.category].fn += e.fn;
  if (e.is_btp_detected === e.is_btp_expected) byCat[r.category].btp_ok++;
}
for (const [cat, s] of Object.entries(byCat)) {
  const rec = s.tp / Math.max(1, s.tp + s.fn);
  const prec = s.tp / Math.max(1, s.tp + s.fp);
  console.log(`  ${cat.padEnd(18)} R=${(rec * 100).toFixed(0)}%  P=${(prec * 100).toFixed(0)}%  btp_ok=${s.btp_ok}/${s.total}`);
}

// ───────────────────── ÉCRITURE RAPPORT ─────────────────────
const report = {
  mission_id: 'BTP_MASSIVE_PATHOLOGY_SUITE_V1_20260517',
  corpus_size: corpus.length,
  duration_ms: dt,
  metrics: {
    pathology_recall: +(overallRecall * 100).toFixed(1),
    pathology_precision: +(overallPrecision * 100).toFixed(1),
    pathology_f1: +(overallF1 * 100).toFixed(1),
    btp_classification_agreement: +(100 * btpAgreement / corpus.length).toFixed(1),
  },
  by_category: byCat,
  sample_cases: results.slice(0, 10),
};
fs.writeFileSync('audit/BTP_MASSIVE_PATHOLOGY_RESULTS.json', JSON.stringify(report, null, 2));

console.log(`\n✓ Rapport : audit/BTP_MASSIVE_PATHOLOGY_RESULTS.json`);
console.log(`  ${corpus.length} cas en ${dt}ms (${(corpus.length * 1000 / dt).toFixed(0)} cas/sec)`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(overallF1 >= 0.75 ? 0 : 1);
