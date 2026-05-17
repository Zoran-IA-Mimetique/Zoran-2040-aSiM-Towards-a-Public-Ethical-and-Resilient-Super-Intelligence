// tools/v11_decision_gate.mjs
// Mission V11_DECISION_GATE — comparer 4 pipelines sur 30 cas + P0-MINI
//
// PIPELINE A : FULL (11 composantes V1-V10)
// PIPELINE B : MINIMAL (causal_density + identity_gate)
// PIPELINE C : MINIMAL + vernacular_wisdom
// PIPELINE D : MINIMAL + physical_causality_validator

import fs from 'node:fs';
import { btpOperationalScore } from '../app/src/btp_supremacy_engine.js';
import { runFragilityDetector } from '../app/src/fragility_detector.js';
import { systemicCoherenceReport } from '../app/src/systemic_coherence.js';
import { runAntiGoodhart } from '../app/src/anti_goodhart.js';
import { seductiveComplexity } from '../app/src/seductive_complexity.js';
import { usefulInformationDensityV2 } from '../app/src/noise_killer.js';
import { practicalUsefulness, concreteRuntimeAlignment, jargonDensity } from '../app/src/jargon.js';
import { terrainAlignment } from '../app/src/completion.js';
import { detectCTAPresence } from '../app/src/zoran_cta_engine.js';
import { causalDensityScore } from '../app/src/causal_density.js';
import { identityGate } from '../app/src/identity_gate.js';
import { vernacularWisdomScore } from '../app/src/vernacular_wisdom_engine.js';
import { validatePhysicalCausality } from '../app/src/physical_causality_validator.js';

// ────────── 30 cas (réutilise V11 subtraction) ──────────
const TEST_CASES = [
  { id: 'A1_EXPERT_COURT', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.`, expected: 9.0 },
  { id: 'A2_VRAI_TERRAIN', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste. La rouille, gratte et passe de l'antirouille.`, expected: 8.0 },
  { id: 'A3_MESURES_INUTILES', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Faire un audit général du bâtiment. Inspecter visuellement. Prendre des photos. Demander 3 devis. Consulter un expert. Vérifier le DPE. Diagnostic amiante. CREP plomb. Audit énergétique. Sondage CPT. Humidimètre. Caméra thermique. Fissuromètre. Inclinomètre.`, expected: 4.0 },
  { id: 'A4_CAUSALITE_INVERSEE', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Les fissures verticales causent l'humidité capillaire qui à son tour produit la corrosion. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel. Sondage CPT 4m. Humidimètre 5 points. Décennale 1792.`, expected: 2.5 },
  { id: 'A5_FAUX_EXPERT_LONG', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. L'observation des phénomènes structurels couplés à la présence d'humidité requiert une démarche méthodologique rigoureuse. Plusieurs cofacteurs interagissent dans un cadre complexe.`, expected: 2.0 },
  { id: 'A6_JARGON_DECORATIF', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `IPN HEA HEB UPN Eurocode 3 NF EN 1993. Module Young fluage fatigue contreventement moment fléchissant. DTU 13.12 DTU 21 DTU 25.41. Cisaillement flambement Eurocode 2. NF P 94-500. Article 1792 article 2270.`, expected: 1.5 },
  { id: 'B1_EXPERT_RGA_COMPLET', q: 'Maison 2018 zone argileuse, fissures escalier sécheresse 2022', text: `Suspicion RGA argile gonflante post-sécheresse 2022 (aléa fort). Fissures escalier = pattern caractéristique tassements différentiels par retrait argileux. Étape 1 : étude G2 PRO obligatoire avec sondages pressiométriques 4m. Étape 2 : suivi fissuromètre étalonné 6 mois. Si confirmé : déclaration Cat-Nat + reprise sous-œuvre micropieux. Décennale 1792 engageable (construction 2018). Contre-hypothèse : tassement remblai initial — à écarter par sondages.`, expected: 9.5 },
  { id: 'B2_TERRAIN_PRAGMATIQUE', q: 'Maison 2018 zone argileuse, fissures escalier sécheresse 2022', text: `Ça sent le RGA classique post-2022. Avant études coûteuses : pose 4 témoins plâtre + photos datées, suivi 6 mois. Récupère ton rapport G1 PGC, regarde l'aléa. Si ça bouge encore : déclare Cat-Nat à l'assureur. Garde tout en photos pour la décennale (tu es dans les 10 ans).`, expected: 8.5 },
  { id: 'B3_COMPETENT_VAGUE', q: 'Maison 2018 zone argileuse, fissures escalier sécheresse 2022', text: `Le RGA est probable. Faire une étude géotechnique. Surveiller l'évolution des fissures. La décennale peut s'appliquer. Plusieurs causes possibles. Consulter un BET structure.`, expected: 5.5 },
  { id: 'B4_GENERIQUE_VIDE', q: 'Maison 2018 zone argileuse, fissures escalier sécheresse 2022', text: `Il est important de noter que les fissures peuvent avoir plusieurs causes. Cela étant dit, il convient de souligner qu'une expertise serait nécessaire. Par ailleurs, il faut considérer l'aspect réglementaire. En conclusion, plusieurs facteurs sont à prendre en compte.`, expected: 1.5 },
  { id: 'B5_EXPERT_INFILTRATION', q: 'Infiltrations toiture-terrasse après orage', text: `Examiner relevés EPDM en pied d'acrotère + jonctions évacuations EP. Sondage destructif (carotte 30mm) au point bas pour identifier complexe d'étanchéité. Test mise en eau 24h. Membrane > 15 ans : réfection. Contre-hypothèse : condensation interstitielle — vérifier hygrométrie.`, expected: 9.0 },
  { id: 'B6_PRATICIEN_TOITURE', q: 'Infiltrations toiture-terrasse après orage', text: `Trois points classiques où ça fuit : (1) relevé d'étanchéité au pied de l'acrotère, regarde si la membrane décolle. (2) jonction descentes EP. (3) déplace les gravillons sur 1m² au-dessus de la tache. Mets de l'eau au tuyau 30 min sur la zone suspecte, vérifie dans 6h.`, expected: 8.5 },
  { id: 'B7_FAUX_EXPERT_FUITE', q: 'Infiltrations toiture-terrasse après orage', text: `Les manifestations hygrométriques observées sur le complexe plafond résultent d'une rupture potentielle de la barrière étanche périphérique. La pathologie multi-factorielle requiert une approche holistique intégrant les déperditions thermiques.`, expected: 2.0 },
  { id: 'B8_REPONSE_VAGUE', q: 'Infiltrations toiture-terrasse après orage', text: `Il faut faire venir un couvreur. Plusieurs causes possibles. Bien surveiller. Demander des devis.`, expected: 2.5 },
  { id: 'C1_TERRAIN_LACONIQUE', q: 'IPN du salon présente fissuration béton enrobage', text: `L'IPN boit. C'est l'humidité qui remonte. Décaisse, antirouille, repeins. Si ça revient, problème de drainage extérieur.`, expected: 7.5 },
  { id: 'C2_CAUSAL_INVERSEE_SUBTLE', q: 'Tassement maison + fissures', text: `Les fissures révèlent un tassement profond. La carbonatation du béton qui en résulte amplifie le RGA. Le vieillissement précoce explique le pendage initial du terrain.`, expected: 3.0 },
  { id: 'C3_NON_BTP', q: 'Quel temps fait-il à Nantes en mai ?', text: `Doux et variable, 12-18°C, pluies possibles.`, expected: 6.0 },
  { id: 'C4_IDENTITY_AMBIGU', q: 'Qui est Frédéric Tabary expert BTP ?', text: `Frédéric Tabary est un expert reconnu en pathologie structurelle, BET parisien spécialisé décennale.`, expected: 1.0 },
  { id: 'C5_LONG_VRAI_COMPLET', q: 'Sinistre dégât eaux étendu maison ancienne', text: `Diagnostic dégât eaux étendu maison ancienne : tableau pathologique humidité ascensionnelle + infiltration latérale. Étape 1 : identifier source. Sonde humidité 0/50/100/200cm sur 5 murs. Cartographie thermique infrarouge en hiver. Test arrosage tuyau 30min × 3 points. Étape 2 : hiérarchiser. Humidité ascensionnelle si gradient décroît avec hauteur. Infiltration latérale si point haut humide. Condensation si murs froids Nord + ponts thermiques. Étape 3 : traitement adapté. Étape 4 : assurance. Étape 5 : décennale. Contre-hypothèse : capillarité + condensation peuvent coexister.`, expected: 9.5 },
  { id: 'C6_SHORT_EXPERT_DENSE', q: 'Sinistre dégât eaux étendu maison ancienne', text: `Cartographier humidité (5 murs × 4 hauteurs) avant tout. Gradient décroît avec hauteur : capillaire → drainage + injection. Point haut : infiltration → étanchéité ext. Murs froids : condensation → ITE + VMC. Décennale uniquement sur reprises < 10 ans.`, expected: 9.0 },
  { id: 'C7_TERRAIN_FOLKLORE', q: 'Murs qui suintent et tachent', text: `Faut aérer plus. Ouvre les fenêtres tous les jours. Mets du sel dans des coupelles, ça absorbe. Refais la peinture avec de l'anti-humidité du Brico.`, expected: 2.0 },
  { id: 'C8_EXPERT_GREENWASH', q: 'Comment isoler thermiquement maison ancienne', text: `Solution optimale ITE PSE 16cm garantie DPE A. ROI < 5 ans. Subventions MaPrimeRénov 50%. Aucun pont thermique. Performance maximale.`, expected: 3.0 },
  { id: 'D1_RGA_DECENNALE', q: 'Construction 2020 fissures structurelles 5mm zone argile aléa fort', text: `Convergence indices RGA + ancienneté ouvrage compatible décennale → procédure article 1792. Étape 1 : photos datées, fissuromètre, étaiement. Étape 2 : déclaration Cat-Nat + mise en cause constructeur/assureur dommages-ouvrage. Étape 3 : G2 PRO contradictoire si refus. Mesures : pressiométrique 4m + 8m, piézomètre saisonnier, fissuromètre 6 mois. Contre-hypothèse : surcharge ou défaut conception fondation.`, expected: 9.5 },
  { id: 'D2_RGA_DOUTEUX', q: 'Maison 1985 fissures escalier en zone hors-aléa', text: `RGA peu probable hors zone aléa. Suspecter d'abord tassement remblai initial (1985 = pré-DTU 13.12 strict), ou défaut fondations. Confirmer par sondages CPT 3-4m. Pas de décennale (35 ans). Si tassement : reprise sous-œuvre ou injection. Contre-hypothèse : surcharge récente (extension) ?`, expected: 9.0 },
  { id: 'D3_HUMIDITE_COUPLEE', q: 'Salpêtre + plâtre cloque + odeur cave après travaux toiture 2024', text: `Cascade pathologique : travaux toiture 2024 ont modifié équilibre hygro-thermique. 3 hypothèses : (1) infiltration ponctuelle nouveau complexe, (2) condensation par sur-isolation sans ventilation adaptée, (3) remontée capillaire amplifiée. Mesures : caméra thermique hiver, humidimètre 5 points, test infiltrométrie n50. Décennale travaux toiture probable. Contre-hypothèse : phénomène pré-existant révélé.`, expected: 9.0 },
  { id: 'D4_GENERIQUE_COUPLAGE', q: 'Salpêtre + plâtre cloque + odeur cave après travaux toiture 2024', text: `C'est probablement de l'humidité. Plusieurs causes possibles. Faire venir un spécialiste. Refaire le diagnostic.`, expected: 2.0 },
  { id: 'D5_LEGAL_COMPLET', q: 'Refus assureur décennale fissures évolutives 5mm', text: `Procédure : (1) mise en demeure RAR avec rapport BET. (2) Médiation assurance gratuite sous 30j. (3) Tribunal Judiciaire. Élément clé : prouver "atteinte gros œuvre" ou "impropre destination" (article 1792). Jurisprudence : Cass. 3e civile 2023, fissures 5mm évolutives sur élément porteur = présomption atteinte gros œuvre. Documenter : photos, fissuromètre 6 mois, rapport BET. Délai prescription 10 ans.`, expected: 9.5 },
  { id: 'D6_LEGAL_FLOU', q: 'Refus assureur décennale fissures évolutives 5mm', text: `Il faut consulter un avocat. La décennale est complexe. L'assureur peut avoir des raisons. Voir avec un expert.`, expected: 2.5 },
  { id: 'D7_GEOTECHNIQUE_FIN', q: 'Sol limoneux saturé, fondations superficielles, projet extension', text: `Sol limoneux saturé = portance médiocre + risque liquéfaction sous séisme. Fondations superficielles déconseillées hors étude G2 PRO renforcée. Solutions : (1) micropieux ancrés au substrat, (2) inclusions rigides + matelas répartition, (3) substitution + remblai compacté (limité 1.5m). Mesures : CPT continu, essai œdométrique, piézomètre 12 mois. Contre-hypothèse : saturation saisonnière uniquement → drainage + radier rigide.`, expected: 9.5 },
  { id: 'D8_AVIS_COMMERCIAL', q: 'Sol limoneux saturé, fondations superficielles, projet extension', text: `Pas de problème, on fait ça souvent. Sur un sol limoneux, il suffit de bien tasser et mettre des semelles filantes 60cm. Surveillance pas obligatoire. Notre garantie décennale couvre tout.`, expected: 2.0 },
];

// ────────── 4 PIPELINES ──────────

function pipelineA_FULL(q, text) {
  const t0 = performance.now();
  const idGate = identityGate(q);
  if (!idGate.passes_gate) return { score: 0, latency: performance.now() - t0 };
  const btp = btpOperationalScore(text);
  const frag = runFragilityDetector(text);
  const sys = systemicCoherenceReport(text);
  const good = runAntiGoodhart(text);
  const sed = seductiveComplexity(text);
  const ucr = usefulInformationDensityV2(text);
  const cta = detectCTAPresence(text);
  const pract = practicalUsefulness(text);
  const concrete = concreteRuntimeAlignment({ answerText: text, questionText: q });
  const jargon = jargonDensity(text);
  const terrain = terrainAlignment(text);
  const score = (
    0.20 * btp.score + 0.10 * (1 - frag.fragility_risk) + 0.10 * sys.composite
    + 0.10 * (1 - good.goodhart_risk) + 0.05 * (1 - sed.score) + 0.05 * ucr
    + 0.05 * cta.coverage + 0.10 * pract + 0.10 * concrete + 0.05 * (1 - jargon) + 0.10 * terrain
  );
  return { score: Math.min(1, score), latency: performance.now() - t0 };
}

function pipelineB_MINIMAL(q, text) {
  const t0 = performance.now();
  const idGate = identityGate(q);
  if (!idGate.passes_gate) return { score: 0, latency: performance.now() - t0 };
  const causal = causalDensityScore(text);
  return { score: causal.score, latency: performance.now() - t0 };
}

function pipelineC_MINIMAL_VERNACULAR(q, text) {
  const t0 = performance.now();
  const idGate = identityGate(q);
  if (!idGate.passes_gate) return { score: 0, latency: performance.now() - t0 };
  const causal = causalDensityScore(text);
  const vern = vernacularWisdomScore(text);
  // Composite : max(causal, 0.7*vernacular) → vernacular peut compenser causal bas
  const score = Math.min(1, Math.max(causal.score, vern.score * 0.7, 0.3 * causal.score + 0.7 * vern.score));
  return { score, latency: performance.now() - t0 };
}

function pipelineD_MINIMAL_PHYSICAL(q, text) {
  const t0 = performance.now();
  const idGate = identityGate(q);
  if (!idGate.passes_gate) return { score: 0, latency: performance.now() - t0 };
  const causal = causalDensityScore(text);
  const phys = validatePhysicalCausality(text);
  // Score causal MULTIPLIÉ par validité physique (causalité inversée détruit le score)
  const score = causal.score * phys.score;
  return { score, latency: performance.now() - t0 };
}

// ────────── CORRÉLATIONS ──────────
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

// ────────── EXÉCUTION ──────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  V11 DECISION GATE — 4 pipelines × 30 cas');
console.log('═══════════════════════════════════════════════════════════════\n');

const results = [];
for (const c of TEST_CASES) {
  const a = pipelineA_FULL(c.q, c.text);
  const b = pipelineB_MINIMAL(c.q, c.text);
  const cc = pipelineC_MINIMAL_VERNACULAR(c.q, c.text);
  const d = pipelineD_MINIMAL_PHYSICAL(c.q, c.text);
  results.push({
    id: c.id, expected: c.expected,
    a_score: +(a.score * 10).toFixed(2), a_lat: +a.latency.toFixed(2),
    b_score: +(b.score * 10).toFixed(2), b_lat: +b.latency.toFixed(2),
    c_score: +(cc.score * 10).toFixed(2), c_lat: +cc.latency.toFixed(2),
    d_score: +(d.score * 10).toFixed(2), d_lat: +d.latency.toFixed(2),
  });
}

const expected = results.map(r => r.expected);
const A = results.map(r => r.a_score);
const B = results.map(r => r.b_score);
const C = results.map(r => r.c_score);
const D = results.map(r => r.d_score);

const spA = spearman(expected, A);
const spB = spearman(expected, B);
const spC = spearman(expected, C);
const spD = spearman(expected, D);
const kA = kendallTau(expected, A);
const kB = kendallTau(expected, B);
const kC = kendallTau(expected, C);
const kD = kendallTau(expected, D);

const avgLatA = results.reduce((s, r) => s + r.a_lat, 0) / results.length;
const avgLatB = results.reduce((s, r) => s + r.b_lat, 0) / results.length;
const avgLatC = results.reduce((s, r) => s + r.c_lat, 0) / results.length;
const avgLatD = results.reduce((s, r) => s + r.d_lat, 0) / results.length;

// ────────── DISCRIMINATION ─────────
console.log('─── A. CORRÉLATIONS ───\n');
console.log(`  Pipeline A FULL                : Spearman ${spA.toFixed(3)}  Kendall ${kA.toFixed(3)}  Lat ${avgLatA.toFixed(2)}ms`);
console.log(`  Pipeline B MINIMAL             : Spearman ${spB.toFixed(3)}  Kendall ${kB.toFixed(3)}  Lat ${avgLatB.toFixed(2)}ms`);
console.log(`  Pipeline C MINIMAL+VERNACULAR  : Spearman ${spC.toFixed(3)}  Kendall ${kC.toFixed(3)}  Lat ${avgLatC.toFixed(2)}ms`);
console.log(`  Pipeline D MINIMAL+PHYSICAL    : Spearman ${spD.toFixed(3)}  Kendall ${kD.toFixed(3)}  Lat ${avgLatD.toFixed(2)}ms`);

// ────────── INVERSIONS ─────────
console.log('\n─── B. INVERSIONS sur 6 cas adversariaux (groupe A) ───\n');
const advCases = results.filter(r => r.id.startsWith('A'));
const advExpected = advCases.map(r => r.expected);

function countInversions(scores, expectedScores) {
  const r = rank(scores), e = rank(expectedScores);
  let inv = 0;
  for (let i = 0; i < r.length; i++) {
    if (Math.abs(r[i] - e[i]) >= 2) inv++;
  }
  return inv;
}
const invA = countInversions(advCases.map(r => r.a_score), advExpected);
const invB = countInversions(advCases.map(r => r.b_score), advExpected);
const invC = countInversions(advCases.map(r => r.c_score), advExpected);
const invD = countInversions(advCases.map(r => r.d_score), advExpected);

console.log(`  Inversions ≥ 2 positions :`);
console.log(`    A FULL                : ${invA}/6`);
console.log(`    B MINIMAL             : ${invB}/6`);
console.log(`    C MINIMAL+VERNACULAR  : ${invC}/6`);
console.log(`    D MINIMAL+PHYSICAL    : ${invD}/6`);

// ────────── VERDICT ─────────
console.log('\n─── C. VERDICT V11_DECISION_GATE ───\n');
const pipelines = [
  { name: 'A FULL', sp: spA, k: kA, lat: avgLatA, inv: invA },
  { name: 'B MINIMAL', sp: spB, k: kB, lat: avgLatB, inv: invB },
  { name: 'C MINIMAL+VERNACULAR', sp: spC, k: kC, lat: avgLatC, inv: invC },
  { name: 'D MINIMAL+PHYSICAL', sp: spD, k: kD, lat: avgLatD, inv: invD },
];
const best = pipelines.reduce((b, p) => p.sp > b.sp ? p : b);
const worst = pipelines.reduce((w, p) => p.sp < w.sp ? p : w);
// VERDICT : compare FULL vs MINIMAL (la simplification de référence)
const pipeFull = pipelines.find(p => p.name === 'A FULL');
const pipeMin = pipelines.find(p => p.name === 'B MINIMAL');
const gap_full_vs_min = pipeFull.sp - pipeMin.sp;
console.log(`  Best pipeline    : ${best.name} (Spearman ${best.sp.toFixed(3)})`);
console.log(`  Worst pipeline   : ${worst.name} (Spearman ${worst.sp.toFixed(3)})`);
console.log(`  Gap FULL vs MIN  : ${gap_full_vs_min.toFixed(3)} ${gap_full_vs_min > 0 ? '(FULL meilleur)' : '(MINIMAL ≥ FULL)'}`);

let verdict;
if (best.sp >= 0.60 && pipeFull.sp >= pipeMin.sp && gap_full_vs_min >= 0.05) {
  verdict = 'EXTEND';
} else if (Math.abs(gap_full_vs_min) < 0.05 && best.sp >= 0.50) {
  verdict = 'REDUCE';
} else if (best.sp < 0.40) {
  verdict = 'BLOCK_EXTENSION';
} else {
  verdict = 'REBUILD';
}

console.log(`\n  ★ VERDICT : ${verdict}`);
if (verdict === 'EXTEND') console.log('  → Complexité FULL justifiée — extension V11+ autorisée');
if (verdict === 'REDUCE') console.log('  → MINIMAL ≈ FULL — lancer V12_REDUCTION, supprimer redondances');
if (verdict === 'BLOCK_EXTENSION') console.log('  → Aucun pipeline ne dépasse 0.40 — toute extension est du Goodhart');
if (verdict === 'REBUILD') console.log('  → Aucun pipeline ne dépasse 0.60 — architecture insuffisante, refonte');

// ────────── DÉTAIL PAR CAS ─────────
console.log('\n─── D. SCORES DÉTAILLÉS ───');
console.log(`  ${'ID'.padEnd(28)} ${'EXP'.padEnd(5)} ${'A'.padEnd(5)} ${'B'.padEnd(5)} ${'C'.padEnd(5)} ${'D'.padEnd(5)}`);
for (const r of results) {
  console.log(`  ${r.id.padEnd(28)} ${r.expected.toFixed(1).padEnd(5)} ${r.a_score.toFixed(1).padEnd(5)} ${r.b_score.toFixed(1).padEnd(5)} ${r.c_score.toFixed(1).padEnd(5)} ${r.d_score.toFixed(1).padEnd(5)}`);
}

const report = {
  mission_id: 'V11_DECISION_GATE_20260517',
  n_cases: TEST_CASES.length,
  pipelines: {
    A_FULL: { spearman: +spA.toFixed(3), kendall: +kA.toFixed(3), avg_latency_ms: +avgLatA.toFixed(2), inversions_adversarial: invA },
    B_MINIMAL: { spearman: +spB.toFixed(3), kendall: +kB.toFixed(3), avg_latency_ms: +avgLatB.toFixed(2), inversions_adversarial: invB },
    C_MINIMAL_VERNACULAR: { spearman: +spC.toFixed(3), kendall: +kC.toFixed(3), avg_latency_ms: +avgLatC.toFixed(2), inversions_adversarial: invC },
    D_MINIMAL_PHYSICAL: { spearman: +spD.toFixed(3), kendall: +kD.toFixed(3), avg_latency_ms: +avgLatD.toFixed(2), inversions_adversarial: invD },
  },
  verdict,
  best_pipeline: best.name,
  best_spearman: +best.sp.toFixed(3),
  gap_best_vs_full: +gap.toFixed(3),
  cases_detail: results,
};
fs.writeFileSync('audit/V11_DECISION_GATE_RESULTS.json', JSON.stringify(report, null, 2));

console.log('\n✓ Résultats : audit/V11_DECISION_GATE_RESULTS.json');
console.log('═══════════════════════════════════════════════════════════════');
