// tools/adversarial_expertise_suite.mjs
// Mission V10 — BREAK-FIRST: tester si btpOperationalScore mesure
// vraiment l'expertise causale, ou juste de la verbosité technique.
//
// 6 cas adversariaux × 1 question BTP réelle.
// Si SHALLOW long > EXPERT court → le score mesure rhétorique, pas expertise.

import fs from 'node:fs';
import { btpOperationalScore } from '../app/src/btp_supremacy_engine.js';

const QUESTION = 'Fissures verticales 3mm sur mur porteur, humidité base, IPN visible corrodée. Diagnostic ?';

// ────────── 6 PROFILS ADVERSARIAUX ──────────

const PROFILES = {
  // 1. EXPERT_COURT — réponse courte d'un vrai BET senior, dense en causalité
  EXPERT_COURT: `Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.`,

  // 2. FAUX_EXPERT_LONG — verbeux, jargon abondant, faible densité causale
  FAUX_EXPERT_LONG: `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. L'observation des phénomènes structurels couplés à la présence d'humidité requiert une démarche méthodologique rigoureuse. Les implications décennales doivent être considérées dans une approche globale tenant compte de l'ensemble des facteurs systémiques. Une expertise approfondie serait nécessaire pour évaluer les implications. La cause peut être multiple, multi-factorielle, avec divers cofacteurs qui interagissent dans un cadre complexe. Il faut analyser l'amplification cascade, les déclencheurs, les révélateurs, les propagateurs. Le sondage CPT serait pertinent, l'humidimètre serait utile, le fissuromètre pourrait être déployé. La décennale est probablement engagée. Article 1792. Il faudra prendre en compte tous ces éléments dans une démarche structurée multi-niveaux avec instrumentation adaptée pour révéler les causes racines de cette pathologie complexe. Le tableau pathologique requiert une analyse fine.`,

  // 3. JARGON_DECORATIF — vocabulaire technique sans rôle causal
  JARGON_DECORATIF: `IPN HEA HEB UPN avec Eurocode 3 NF EN 1993. Module de Young, fluage, fatigue, contreventement, moment fléchissant, effort tranchant. DTU 13.12, DTU 21, DTU 25.41. Cisaillement et flambement à considérer selon Eurocode 2. NF P 94-500 pour géotechnique. Article 1792 article 2270 parfait achèvement. Cause racine cofacteur amplificateur déclencheur révélateur propagateur. Étiopathogénie complexe.`,

  // 4. VRAI_TERRAIN_SANS_JARGON — praticien expérimenté, langage simple
  VRAI_TERRAIN_SANS_JARGON: `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste. La rouille, gratte et passe de l'antirouille. Le vrai problème serait que l'IPN porte mal — fais venir quelqu'un pour vérifier qu'elle est bien dimensionnée pour ce qu'elle porte.`,

  // 5. CAUSALITE_INVERSEE — bon vocabulaire mais cause/effet inversés
  CAUSALITE_INVERSEE: `Les fissures verticales 3mm causent l'humidité capillaire qui à son tour produit la corrosion de l'IPN. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel. Sondage CPT à 4m pour confirmer. Humidimètre 5 points. Caméra thermique. Décennale article 1792 probablement engagée. Cofacteurs : la corrosion entraîne la fissuration originelle qui propage le RGA.`,

  // 6. MESURES_INUTILES — beaucoup de mesures listées mais non-discriminantes
  MESURES_INUTILES: `Faire un audit général du bâtiment. Inspecter visuellement toutes les pièces. Prendre des photos panoramiques. Mesurer la longueur de la fissure (3mm × ?). Faire un audit énergétique pour info. Diagnostic amiante avant travaux. CREP plomb. Diagnostic électrique. Audit assurance habitation. Vérifier le DPE. Demander 3 devis à 3 entreprises différentes. Faire un point avec le voisin. Consulter le PLU. Vérifier la garantie décennale. Sondage CPT. Humidimètre. Caméra thermique. Fissuromètre. Inclinomètre. Piézomètre. Carottage béton. Analyse laboratoire géotechnique. Étude G2 PRO. Rapport BET structure.`,
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ADVERSARIAL EXPERTISE SUITE V10 — break-first');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Question : ${QUESTION}\n`);

// ────────── A. SCORING ACTUEL ──────────
console.log('─── A. SCORING ACTUEL (btpOperationalScore V9.1) ───\n');
const ranking = [];
for (const [profile, text] of Object.entries(PROFILES)) {
  const op = btpOperationalScore(text);
  const wordCount = text.split(/\s+/).length;
  ranking.push({ profile, score: op.score, verdict: op.verdict, words: wordCount, text });
  console.log(`  ${profile.padEnd(28)} score=${op.score.toFixed(3)}  verdict=${op.verdict.padEnd(15)} ${wordCount} mots`);
}

// Tri par score actuel
const sorted = [...ranking].sort((a, b) => b.score - a.score);
console.log('\n  CLASSEMENT ACTUEL :');
sorted.forEach((r, i) => console.log(`    #${i+1} ${r.profile.padEnd(28)} ${r.score.toFixed(3)}`));

// ────────── B. CLASSEMENT ATTENDU PAR HUMAIN ──────────
// Ce qu'un expert humain considérerait : EXPERT_COURT et VRAI_TERRAIN
// devraient être en tête. FAUX_EXPERT_LONG et JARGON_DECORATIF en bas.
const EXPECTED_RANKING = [
  'EXPERT_COURT',           // #1 idéal
  'VRAI_TERRAIN_SANS_JARGON', // #2 — terrain réel sans jargon
  'MESURES_INUTILES',       // #3 — beaucoup d'actions mais shallow
  'CAUSALITE_INVERSEE',     // #4 — vocabulaire OK mais logique fausse
  'FAUX_EXPERT_LONG',       // #5 — verbeux vide
  'JARGON_DECORATIF',       // #6 — pire : jargon zéro substance
];

console.log('\n  CLASSEMENT HUMAIN ATTENDU :');
EXPECTED_RANKING.forEach((p, i) => console.log(`    #${i+1} ${p}`));

// ────────── C. DÉTECTION DES INVERSIONS ──────────
console.log('\n─── B. INVERSIONS DÉTECTÉES ───\n');
const actualRanks = {};
sorted.forEach((r, i) => { actualRanks[r.profile] = i + 1; });
const expectedRanks = {};
EXPECTED_RANKING.forEach((p, i) => { expectedRanks[p] = i + 1; });

let inversions = 0;
const inversionsList = [];
for (const profile of EXPECTED_RANKING) {
  const exp = expectedRanks[profile];
  const act = actualRanks[profile];
  const diff = act - exp;
  if (Math.abs(diff) >= 2) {
    inversions++;
    inversionsList.push({ profile, expected: exp, actual: act, drift: diff });
  }
}

console.log(`  Inversions majeures (drift ≥ 2 positions) : ${inversions}/6`);
for (const inv of inversionsList) {
  const sign = inv.drift > 0 ? '↓' : '↑';
  console.log(`    ${inv.profile.padEnd(28)} attendu #${inv.expected} → réel #${inv.actual}  ${sign}${Math.abs(inv.drift)}`);
}

// Test critique : FAUX_EXPERT_LONG > EXPERT_COURT ?
const fauxRank = actualRanks.FAUX_EXPERT_LONG;
const expertRank = actualRanks.EXPERT_COURT;
const critical_inversion = fauxRank < expertRank;

console.log('');
if (critical_inversion) {
  console.log(`  ⚠ INVERSION CRITIQUE : FAUX_EXPERT_LONG (#${fauxRank}) DÉPASSE EXPERT_COURT (#${expertRank})`);
  console.log(`  → le scoring mesure la rhétorique, pas l'expertise causale`);
} else {
  console.log(`  ✓ EXPERT_COURT (#${expertRank}) > FAUX_EXPERT_LONG (#${fauxRank}) — pas d'inversion critique`);
}

// Test bonus : VRAI_TERRAIN reconnu ?
const terrainRank = actualRanks.VRAI_TERRAIN_SANS_JARGON;
console.log(`  ${terrainRank <= 3 ? '✓' : '⚠'} VRAI_TERRAIN_SANS_JARGON ranked #${terrainRank} (attendu top 3)`);

// Test bonus : CAUSALITE_INVERSEE pénalisée ?
const inverseRank = actualRanks.CAUSALITE_INVERSEE;
console.log(`  ${inverseRank >= 4 ? '✓' : '⚠'} CAUSALITE_INVERSEE ranked #${inverseRank} (attendu bottom 3)`);

// ────────── D. CONCLUSION DIAGNOSTIQUE ──────────
console.log('\n─── C. DIAGNOSTIC V10 ───\n');
const verbosityBias = fauxRank <= 3 || actualRanks.JARGON_DECORATIF <= 3;
const terrainBias = terrainRank >= 4;
const inverseBias = inverseRank <= 3;

if (verbosityBias) console.log('  ⚠ BIAIS VERBOSITÉ : le score favorise les longues réponses jargonnesques');
if (terrainBias) console.log('  ⚠ BIAIS ANTI-TERRAIN : les vrais praticiens sans jargon sont sous-évalués');
if (inverseBias) console.log('  ⚠ BIAIS CAUSAL FAIBLE : causalité inversée passe à travers le filet');

const priority = [];
if (verbosityBias) priority.push('useless_jargon_penalty + causal_compression_ratio');
if (terrainBias) priority.push('discriminant_measure_density (vs liste exhaustive)');
if (inverseBias) priority.push('counterfactual_strength + hypothesis_reduction_score');

console.log('\n  PRIORITÉ V10 :');
priority.forEach((p, i) => console.log(`    ${i+1}. ${p}`));
if (priority.length === 0) {
  console.log('    Aucun biais critique détecté — V9.1 plus robuste qu\'attendu');
}

// ────────── ÉCRITURE RAPPORT ──────────
const report = {
  mission_id: 'ADVERSARIAL_EXPERTISE_V10_BREAK_FIRST_20260517',
  question: QUESTION,
  scoring_actual: ranking.map(r => ({
    profile: r.profile, score: r.score, verdict: r.verdict, words: r.words,
  })),
  ranking_actual: sorted.map((r, i) => ({ rank: i+1, profile: r.profile, score: r.score })),
  ranking_expected: EXPECTED_RANKING.map((p, i) => ({ rank: i+1, profile: p })),
  inversions_count: inversions,
  inversions_detail: inversionsList,
  critical_inversion: critical_inversion,
  biases_detected: {
    verbosity: verbosityBias,
    anti_terrain: terrainBias,
    weak_causal: inverseBias,
  },
  v10_priority: priority,
};
fs.writeFileSync('audit/ADVERSARIAL_EXPERTISE_V10_RESULTS.json', JSON.stringify(report, null, 2));
console.log('\n✓ Rapport : audit/ADVERSARIAL_EXPERTISE_V10_RESULTS.json');
console.log('═══════════════════════════════════════════════════════════════');
