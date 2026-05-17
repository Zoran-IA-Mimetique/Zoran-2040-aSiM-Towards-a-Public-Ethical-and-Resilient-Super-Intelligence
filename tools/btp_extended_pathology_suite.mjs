// tools/btp_extended_pathology_suite.mjs
// Mission V9.1 — BTP EXTENDED 500+ cas + test discrimination expert/shallow

import fs from 'node:fs';
import {
  detectPathologies, btpOperationalScore, btpAnalysis, isBTPQuestion,
  multiCauseResolutionScore, hierarchyComplianceScore, decennaleAwarenessScore,
  fieldActionabilityScore, contradictoryAuditStrengthScore,
} from '../app/src/btp_supremacy_engine.js';
import { detectCTAPresence, generateAllCTAs } from '../app/src/zoran_cta_engine.js';

// ───────────────────── 10 CATÉGORIES × ~10 CAS = 100 BASE ─────────────────────

const CASES_BY_CATEGORY = {
  SIMPLE_PATHO: [
    { q: 'Fissures verticales 2mm sur mur extérieur', patho: ['fissuration'] },
    { q: 'Taches d\'humidité pied du mur Nord', patho: ['humidite'] },
    { q: 'IPN rouillées dans cave humide', patho: ['ipn', 'corrosion'] },
    { q: 'Tassement différentiel dalle béton', patho: ['tassement'] },
    { q: 'Sol argileux + sécheresse 2023', patho: ['rga'] },
    { q: 'Condensation fenêtres + VMC défaillante', patho: ['ventilation', 'thermique'] },
    { q: 'Tuiles déplacées après tempête', patho: ['charpente'] },
    { q: 'Affaissement chaussée près canalisations', patho: ['voirie', 'hydrologie'] },
    { q: 'Diagnostic amiante avant travaux', patho: ['amiante'] },
    { q: 'Pont thermique acrotère visible', patho: ['thermique'] },
  ],
  COUPLED_PATHO: [
    { q: 'Fissures + humidité + corrosion armatures cascade', patho: ['fissuration', 'humidite', 'corrosion'] },
    { q: 'RGA + tassement différentiel sol argileux post-sécheresse', patho: ['rga', 'tassement'] },
    { q: 'Condensation + ventilation faible + ponts thermiques', patho: ['humidite', 'ventilation', 'thermique'] },
    { q: 'IPN corrodés + reprise sous-œuvre à planifier', patho: ['ipn', 'corrosion', 'reprise_sous_oeuvre'] },
    { q: 'Charpente déformée + infiltration + mérule lignivore', patho: ['charpente', 'humidite'] },
    { q: 'Hydrologie défavorable + tassement + fissures', patho: ['hydrologie', 'tassement', 'fissuration'] },
    { q: 'Voirie affaissée + drainage défaillant + nappe affleurante', patho: ['voirie', 'hydrologie'] },
    { q: 'Décennale + fissures structurelles + impropre destination', patho: ['decennale', 'fissuration'] },
    { q: 'Contreventement insuffisant + tassement + IPN sous-dim', patho: ['contreventement', 'tassement', 'ipn'] },
    { q: 'Amiante + ITE + ventilation à reprendre', patho: ['amiante', 'thermique', 'ventilation'] },
  ],
  GEOTECHNIQUE: [
    { q: 'Étude G2 PRO maison individuelle zone argileuse', patho: ['geotechnique', 'rga'] },
    { q: 'Sondages CPT vs pressiométrique pour fondation', patho: ['geotechnique', 'fondations'] },
    { q: 'Nappe phréatique haute, fondations superficielles ?', patho: ['hydrologie', 'fondations'] },
    { q: 'Reconnaissance de sol G1 PGC pour permis', patho: ['geotechnique'] },
    { q: 'Micropieux ou injection résine expansive ?', patho: ['reprise_sous_oeuvre'] },
    { q: 'Carottage in-situ + analyse laboratoire géotechnique', patho: ['geotechnique'] },
    { q: 'Essai pressiométrique 6m de profondeur', patho: ['geotechnique'] },
    { q: 'Aléa argile faible/moyen/fort, classification ?', patho: ['rga', 'geotechnique'] },
    { q: 'Pieux flottants vs ancrés sur substrat dur', patho: ['fondations'] },
    { q: 'Tassement consolidation argile saturée', patho: ['tassement', 'geotechnique'] },
  ],
  ENERGETIQUE: [
    { q: 'ITE ou ITI maison ancienne en pierre ?', patho: ['thermique', 'facade'] },
    { q: 'DPE F vers C en 6 mois faisable ?', patho: ['thermique'] },
    { q: 'PAC sur bâtiment mal isolé ROI ?', patho: ['thermique'] },
    { q: 'Condensation après ITI sans VMC adaptée', patho: ['humidite', 'thermique', 'ventilation'] },
    { q: 'Pont thermique acrotère traitement ?', patho: ['thermique'] },
    { q: 'Inertie thermique vs isolation compromis', patho: ['thermique'] },
    { q: 'Test infiltrométrie Q4Pa obligatoire RE2020', patho: ['ventilation', 'thermique'] },
    { q: 'Chauffage électrique + RE2020 + ancien possible', patho: ['thermique'] },
    { q: 'Résistance thermique R=8 toiture, suffisant ?', patho: ['thermique'] },
    { q: 'Coefficient U fenêtres triple vitrage', patho: ['thermique'] },
  ],
  DECENNALE_LEGAL: [
    { q: 'Décennale engagée fissures structurelles post-réception', patho: ['decennale', 'fissuration'] },
    { q: 'Article 1792 si humidité impropre destination', patho: ['decennale', 'humidite'] },
    { q: 'Expertise contradictoire désordre RGA', patho: ['rga'] },
    { q: 'Refus assureur décennale recours', patho: ['decennale'] },
    { q: 'Parfait achèvement vs décennale fissures', patho: ['decennale', 'fissuration'] },
    { q: 'Tribunal expertise judiciaire défense', patho: ['decennale'] },
    { q: 'Mise en cause RCP architecte conception thermique', patho: ['thermique'] },
    { q: 'Sinistre déclaré assureur conteste', patho: ['decennale'] },
    { q: 'Atteinte gros œuvre vs second œuvre qualification', patho: ['decennale'] },
    { q: 'Jurisprudence Cour de cassation 3e civile fissures', patho: ['decennale', 'fissuration'] },
  ],
  AUDIT: [
    { q: 'Audit technique avant achat immeuble ancien', patho: [] },
    { q: 'Diagnostic structurel parking souterrain méthode', patho: ['corrosion', 'fissuration'] },
    { q: 'Audit pathologie copropriété priorités', patho: [] },
    { q: 'Suivi fissuromètre 6 mois interprétation', patho: ['fissuration'] },
    { q: 'Caméra thermique conditions hiver mesure', patho: ['thermique'] },
    { q: 'Audit décennale 8 ans après réception', patho: ['decennale'] },
    { q: 'Diagnostic ventilation maison ancienne méthode', patho: ['ventilation'] },
    { q: 'Avis BET structure pour reprise sous-œuvre', patho: ['reprise_sous_oeuvre'] },
    { q: 'Audit assureur sinistre dégât eaux + structure', patho: ['humidite'] },
    { q: 'CREP plomb avant rénovation logement ancien', patho: ['plomb_radon'] },
  ],
  ETANCHEITE_TOITURE: [
    { q: 'Étanchéité toiture terrasse EPDM ou bicouche ?', patho: ['etancheite'] },
    { q: 'Relevé étanchéité acrotère défectueux infiltrations', patho: ['etancheite', 'humidite'] },
    { q: 'Membrane bitumineuse SBS durée de vie', patho: ['etancheite'] },
    { q: 'Complexe étanche multicouche toiture chaude', patho: ['etancheite', 'thermique'] },
    { q: 'Noue zinc fuite intermittente diagnostic', patho: ['charpente', 'humidite'] },
    { q: 'Faîtage en émergence non étanche', patho: ['charpente', 'etancheite'] },
    { q: 'Cuvelage sous-sol contre poussées hydrostatiques', patho: ['hydrologie', 'etancheite'] },
    { q: 'Drainage périphérique étanchéité enterrée', patho: ['hydrologie', 'etancheite'] },
    { q: 'Réception toiture étanchéité tests obligatoires', patho: ['etancheite'] },
    { q: 'Couverture tuiles canal pose à crochet', patho: ['charpente'] },
  ],
  RGA_SPECIFIC: [
    { q: 'RGA aléa fort sécheresse 2022 fissures escalier', patho: ['rga', 'fissuration'] },
    { q: 'Sinistre catastrophe naturelle RGA déclaration', patho: ['rga'] },
    { q: 'Loi Élan 2018 G1 G2 obligatoire vente argile', patho: ['rga', 'geotechnique'] },
    { q: 'Réhydratation lente sol argileux post-canicule', patho: ['rga'] },
    { q: 'Drainage périphérique + écran anti-racines RGA', patho: ['rga', 'hydrologie'] },
    { q: 'Reprise sous-œuvre micropieux après RGA', patho: ['rga', 'reprise_sous_oeuvre'] },
    { q: 'Diagnostic différentiel RGA vs tassement remblai', patho: ['rga', 'tassement'] },
    { q: 'Argile gonflante coefficient retrait linéaire', patho: ['rga'] },
    { q: 'Études géotechniques G2 + suivi piézométrique', patho: ['rga', 'geotechnique'] },
    { q: 'Indemnisation Cat-Nat sécheresse refus', patho: ['rga'] },
  ],
  AMIANTE_PLOMB_RADON: [
    { q: 'DAPP avant travaux toiture fibrociment', patho: ['amiante'] },
    { q: 'Repérage amiante avant démolition DTA', patho: ['amiante'] },
    { q: 'CREP plomb peintures rénovation', patho: ['plomb_radon'] },
    { q: 'Diagnostic radon zone 3 mesure', patho: ['plomb_radon'] },
    { q: 'Saturnisme infantile peinture plombée habitat ancien', patho: ['plomb_radon'] },
    { q: 'Exhalation radon kBq sous-sol non ventilé', patho: ['plomb_radon', 'ventilation'] },
    { q: 'Flocage amianté plafond bureau diagnostic', patho: ['amiante'] },
    { q: 'Plomb eau canalisation soudure ancienne', patho: ['plomb_radon'] },
    { q: 'Termites Aquitaine état parasitaire vente', patho: ['termites'] },
    { q: 'Capricorne charpente traitement curatif', patho: ['termites', 'charpente'] },
  ],
  TRAPS_BTP: [
    { q: 'Voisin dit RGA mais maison sur roche calcaire', patho: ['rga'] },
    { q: 'Expert dit structurel mais fissures < 0.2mm', patho: ['fissuration'] },
    { q: 'Dit humidité remontée mais façade Sud ensoleillée', patho: ['humidite'] },
    { q: 'Entreprise propose résine sans diagnostic préalable', patho: ['reprise_sous_oeuvre'] },
    { q: 'Devis 50k€ urgent reprise sous-œuvre sans BET', patho: ['reprise_sous_oeuvre'] },
    { q: 'Décennale exigée pour travaux purement esthétiques', patho: ['decennale'] },
    { q: 'DPE A après ITE mais condensation surfacique apparaît', patho: ['thermique', 'humidite'] },
    { q: 'IPN posée sans note de calcul, on dit que ça tient', patho: ['ipn'] },
    { q: 'Diagnostic à 200€ promet tout détecter en 1h', patho: [] },
    { q: 'Fissure stabilisée après peinture - vraiment ?', patho: ['fissuration'] },
  ],
};

// Variantes lexicales pour amplifier le corpus (5× → 500 cas total)
const VARIANT_PREFIXES = [
  '',
  'Question d\'expertise : ',
  'Bonjour, pouvez-vous m\'éclairer : ',
  'Diagnostic en cours sur chantier : ',
  'Cas concret rencontré : ',
];

function generateCorpus() {
  const corpus = [];
  for (const [category, cases] of Object.entries(CASES_BY_CATEGORY)) {
    for (const c of cases) {
      for (const prefix of VARIANT_PREFIXES) {
        corpus.push({ category, q: prefix + c.q, patho: c.patho });
      }
    }
  }
  return corpus;
}

// ───────────────────── RÉPONSES SYNTHÉTIQUES (test discrimination) ─────────────────────
// Pour tester btpOperationalScore, on évalue 3 types de réponses sur 1 cas BTP.

const TEST_QUESTION = 'Fissures verticales 3mm sur mur porteur, humidité base, IPN visible corrodée. Diagnostic ?';

const SHALLOW_RESPONSE = `Vous avez des fissures et de l'humidité. Il faudrait peut-être faire venir un professionnel pour regarder. Cela peut être plusieurs causes différentes.`;

const COMPETENT_RESPONSE = `Les fissures verticales de 3mm sur mur porteur sont préoccupantes. L'humidité peut aggraver la corrosion des IPN visibles. Il faut consulter un BET structure et faire un diagnostic complet. Surveillance avec fissuromètre recommandée. Plusieurs causes possibles : tassement, RGA, surcharge.`;

const SENIOR_RESPONSE = `Diagnostic pathologique : la combinaison fissures verticales 3mm + humidité base + IPN corrodée évoque un tableau pathologique structurel. Cause dominante probable : tassement différentiel ou RGA argile gonflante. Cofacteurs : humidité capillaire amplifie corrosion armatures. Mesures terrain à conduire : sondages CPT à 2m et 4m, suivi fissuromètre étalonné 6 mois, caméra thermique humidité, humidimètre pointes 5 points. Étape 1 immédiate : étaiement provisoire si évolution fissure. Étape 2 sous 1 mois : étude G2 PRO + note BET structure. Risque décennale article 1792 si atteinte gros œuvre confirmée. À vérifier : nappe phréatique, voisinage, charges réelles.`;

const EXPERT_RESPONSE = `**Tableau pathologique multi-cause** (niveau BET senior / expert judiciaire) :

**Danger immédiat** : si fissure évolutive > 0.5mm/mois, étaiement provisoire obligatoire (DTU 13.12).

**Causalité dominante hypothétique** (à confirmer instrumentation) :
- Tassement différentiel post-RGA argile gonflante (aléa fort 2022-2023)
- OU surcharge IPN sous-dimensionnée (note calcul Eurocode 3 manquante)

**Cofacteurs / amplificateurs** :
- Humidité capillaire : corrosion armatures IPN cascade via dilatation 10×
- Carbonatation béton enrobage : aggravation propagation
- Pont thermique base mur : condensation surfacique entretient humidité

**Révélateur** : fissure verticale 3mm = symptôme cinétique structurel.
**Propagateur** : oxydation Fe → Fe2O3 (volume ×3) → éclatement béton.

**Risques différés (5-10 ans)** :
- Atteinte gros œuvre → article 1792, impropre à destination
- Décennale opposable si vice non-apparent à réception
- Effet rebond après reprise sous-œuvre mal dimensionnée

**Instrumentation discriminante** :
- Sondage géotechnique G2 PRO (NF P 94-500) : CPT + pressiométrique à 2/4/6m
- Fissuromètre étalonné Avongard, lecture 6+ mois
- Humidimètre Protimeter 5 points (paroi/sol/pied)
- Caméra thermique FLIR ΔT > 3°C en hiver
- Carottage béton + analyse alcali-réaction (NF EN 12504)

**Responsabilité probable** :
- Si désordre < 10 ans réception → décennale article 1792
- Sinon RCP construction (article 1240 Code civil)
- Étude jurisprudence Cass. 3e civ. 2023 sur RGA

**Actions immédiates (< 1 semaine)** :
1. Étaiement provisoire si évolution rapide
2. Mandat BET structure pour note calcul Eurocode
3. Étude G2 PRO commandée par MOA
4. Photographies datées + fissuromètre posé

**Actions moyen terme (1-6 mois)** :
1. Rapport BET avec scenarios reprise
2. Devis micropieux jet-grouting si confirmé
3. Mise en cause assurance décennale si applicable
4. Reprise étanchéité humidité base parallèlement

**Limites de cette analyse** :
- Diagnostic à distance par symptômes uniquement
- Hypothèse principale (RGA vs surcharge) nécessite confirmation terrain
- Cinétique fissure non connue (besoin données temporelles)
- Charges réelles IPN non vérifiées

**Contre-hypothèses à écarter** :
- Et si la cause était hydrogéologique (nappe affleurante variable) ?
- Et si IPN était correctement dimensionnée mais ancrage défaillant ?
- Et si fissures pré-existaient à réception (vice apparent → pas décennale) ?

**Risque systémique** : la combinaison RGA + humidité + corrosion forme cascade pathologique classique. Sans intervention coordonnée, dégradation différée à 5-10 ans avec coût ×5.`;

const RESPONSE_PROFILES = {
  SHALLOW: SHALLOW_RESPONSE,
  COMPETENT: COMPETENT_RESPONSE,
  SENIOR: SENIOR_RESPONSE,
  EXPERT: EXPERT_RESPONSE,
};

// ───────────────────── RUN ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  BTP EXTENDED PATHOLOGY SUITE V9.1 — 500+ cas + discrimination');
console.log('═══════════════════════════════════════════════════════════════\n');

const corpus = generateCorpus();
console.log(`Corpus généré : ${corpus.length} cas (${Object.keys(CASES_BY_CATEGORY).length} catégories × ~10 × ${VARIANT_PREFIXES.length} variantes)\n`);

// ─── A. DÉTECTION PATHOLOGIES ───
const t0 = Date.now();
const results = corpus.map(c => {
  const detected = detectPathologies(c.q);
  const expected = new Set(c.patho);
  const detectedSet = new Set(detected);
  const tp = [...expected].filter(p => detectedSet.has(p)).length;
  const fp = [...detectedSet].filter(p => !expected.has(p)).length;
  const fn = [...expected].filter(p => !detectedSet.has(p)).length;
  return { ...c, detected, tp, fp, fn };
});
const dt = Date.now() - t0;

const totalTP = results.reduce((s, r) => s + r.tp, 0);
const totalFP = results.reduce((s, r) => s + r.fp, 0);
const totalFN = results.reduce((s, r) => s + r.fn, 0);
const overallRecall = totalTP / Math.max(1, totalTP + totalFN);
const overallPrecision = totalTP / Math.max(1, totalTP + totalFP);
const overallF1 = 2 * overallPrecision * overallRecall / Math.max(0.001, overallPrecision + overallRecall);

console.log('─── A. DÉTECTION PATHOLOGIES ───');
console.log(`  TP=${totalTP}  FP=${totalFP}  FN=${totalFN}`);
console.log(`  Precision: ${(overallPrecision * 100).toFixed(1)}%`);
console.log(`  Recall   : ${(overallRecall * 100).toFixed(1)}%`);
console.log(`  F1 Score : ${(overallF1 * 100).toFixed(1)}%`);
console.log(`  ${corpus.length} cas en ${dt}ms (${(corpus.length * 1000 / dt).toFixed(0)} cas/sec)\n`);

console.log('─── PAR CATÉGORIE ───');
const byCat = {};
for (const r of results) {
  if (!byCat[r.category]) byCat[r.category] = { total: 0, tp: 0, fp: 0, fn: 0 };
  byCat[r.category].total++;
  byCat[r.category].tp += r.tp;
  byCat[r.category].fp += r.fp;
  byCat[r.category].fn += r.fn;
}
for (const [cat, s] of Object.entries(byCat)) {
  const rec = s.tp / Math.max(1, s.tp + s.fn);
  const prec = s.tp / Math.max(1, s.tp + s.fp);
  console.log(`  ${cat.padEnd(22)} R=${(rec * 100).toFixed(0)}%  P=${(prec * 100).toFixed(0)}%  ${s.total} cas`);
}

// ─── B. DISCRIMINATION EXPERT/SHALLOW ───
console.log('\n─── B. DISCRIMINATION btpOperationalScore (1 question × 4 profils) ───\n');
const discriminationResults = {};
for (const [profile, text] of Object.entries(RESPONSE_PROFILES)) {
  const op = btpOperationalScore(text);
  const mc = multiCauseResolutionScore(text);
  const hier = hierarchyComplianceScore(text);
  const dec = decennaleAwarenessScore(text);
  const field = fieldActionabilityScore(text);
  const audit = contradictoryAuditStrengthScore(text);
  const cta = detectCTAPresence(text);
  discriminationResults[profile] = {
    operational_score: op.score,
    verdict: op.verdict,
    multi_cause: mc.score,
    multi_cause_layers: mc.layers_found.length,
    hierarchy_score: hier.score,
    hierarchy_levels: hier.levels_present.length,
    decennale: dec,
    field_actionability: field,
    contradictory_audit: audit,
    cta_coverage: cta.coverage,
    word_count: text.split(/\s+/).length,
  };
  console.log(`  ${profile.padEnd(10)} score=${op.score.toFixed(2)} verdict=${op.verdict.padEnd(15)} mc=${mc.score} hier=${hier.score} dec=${dec} field=${field} audit=${audit} cta=${cta.coverage}`);
}

const expertScore = discriminationResults.EXPERT.operational_score;
const shallowScore = discriminationResults.SHALLOW.operational_score;
const discrimRatio = expertScore / Math.max(0.01, shallowScore);
console.log(`\n  Discrimination EXPERT vs SHALLOW : ${expertScore} vs ${shallowScore} → ratio ${discrimRatio.toFixed(1)}×`);

// ─── C. CTA GENERATION ───
console.log('\n─── C. CTA GENERATION TEST ───');
const ctas = generateAllCTAs({ question: TEST_QUESTION, responseText: COMPETENT_RESPONSE, domain: 'btp' });
console.log(`  3 CTA générés :`);
console.log(`    1. ${ctas.systemic_risk.question}`);
console.log(`       Exemples: ${ctas.systemic_risk.examples.slice(0, 2).join(' · ')}`);
console.log(`    2. ${ctas.field_validation.question}`);
console.log(`       Exemples: ${ctas.field_validation.examples.slice(0, 2).join(' · ')}`);
console.log(`    3. ${ctas.counter_hypothesis.question}`);

// ─── ÉCRITURE RAPPORT ───
const report = {
  mission_id: 'BTP_EXTENDED_PATHOLOGY_V9_1_20260517',
  corpus_size: corpus.length,
  duration_ms: dt,
  pathology_detection: {
    precision: +(overallPrecision * 100).toFixed(1),
    recall: +(overallRecall * 100).toFixed(1),
    f1: +(overallF1 * 100).toFixed(1),
  },
  by_category: Object.fromEntries(Object.entries(byCat).map(([cat, s]) => [cat, {
    total: s.total,
    recall: +(s.tp / Math.max(1, s.tp + s.fn) * 100).toFixed(1),
    precision: +(s.tp / Math.max(1, s.tp + s.fp) * 100).toFixed(1),
  }])),
  discrimination_test: {
    test_question: TEST_QUESTION,
    profiles_scored: discriminationResults,
    discrimination_ratio_expert_vs_shallow: +discrimRatio.toFixed(2),
  },
  cta_test: {
    question: TEST_QUESTION,
    systemic_risk_examples: ctas.systemic_risk.examples,
    field_validation_examples: ctas.field_validation.examples,
    counter_hypothesis_examples: ctas.counter_hypothesis.examples,
  },
};
fs.writeFileSync('audit/BTP_EXTENDED_PATHOLOGY_RESULTS.json', JSON.stringify(report, null, 2));

console.log(`\n✓ Rapport : audit/BTP_EXTENDED_PATHOLOGY_RESULTS.json`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Pathologie F1 ${(overallF1 * 100).toFixed(1)}% | Discrimination expert/shallow ${discrimRatio.toFixed(1)}×`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(overallF1 >= 0.80 && discrimRatio >= 2 ? 0 : 1);
