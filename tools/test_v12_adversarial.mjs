// tools/test_v12_adversarial.mjs
// V12 ADVERSARIAL SURVIVABILITY sur 30 cas V11_DECISION_GATE
// Comparaison V12 minimal vs FULL stack V11

import fs from 'node:fs';
import { adversarialSurvivability } from '../app/src/adversarial_survivability_engine.js';

// 30 cas — réutilisés depuis v11_decision_gate.mjs
const TEST_CASES = [
  { id: 'A1_EXPERT_COURT', text: `Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.`, expected: 9.0, v11_full: 6.6 },
  { id: 'A2_VRAI_TERRAIN', text: `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste.`, expected: 8.0, v11_full: 5.3 },
  { id: 'A3_MESURES_INUTILES', text: `Faire un audit général du bâtiment. Inspecter visuellement. Prendre des photos. Demander 3 devis. Consulter un expert. Vérifier le DPE. Diagnostic amiante. CREP plomb. Audit énergétique. Sondage CPT. Humidimètre. Caméra thermique. Fissuromètre. Inclinomètre.`, expected: 4.0, v11_full: 5.9 },
  { id: 'A4_CAUSALITE_INVERSEE', text: `Les fissures verticales causent l'humidité capillaire qui à son tour produit la corrosion. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel. Sondage CPT 4m. Humidimètre 5 points. Décennale 1792.`, expected: 2.5, v11_full: 5.8 },
  { id: 'A5_FAUX_EXPERT_LONG', text: `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. Plusieurs cofacteurs interagissent dans un cadre complexe.`, expected: 2.0, v11_full: 4.0 },
  { id: 'A6_JARGON_DECORATIF', text: `IPN HEA HEB UPN Eurocode 3 NF EN 1993. Module Young fluage fatigue contreventement moment fléchissant. DTU 13.12 DTU 21 DTU 25.41.`, expected: 1.5, v11_full: 5.1 },
  { id: 'B1_EXPERT_RGA_COMPLET', text: `Suspicion RGA argile gonflante post-sécheresse 2022 (aléa fort). Fissures escalier = pattern caractéristique tassements différentiels. Étape 1 : étude G2 PRO avec sondages pressiométriques 4m. Étape 2 : suivi fissuromètre étalonné 6 mois. Si confirmé : déclaration Cat-Nat + reprise sous-œuvre micropieux. Décennale 1792 engageable. Contre-hypothèse : tassement remblai initial — à écarter par sondages.`, expected: 9.5, v11_full: 6.0 },
  { id: 'B2_TERRAIN_PRAGMATIQUE', text: `Ça sent le RGA classique post-2022. Avant études : pose 4 témoins plâtre + photos datées, suivi 6 mois. Récupère ton rapport G1 PGC. Si ça bouge encore : déclare Cat-Nat. Garde tout en photos pour la décennale.`, expected: 8.5, v11_full: 4.9 },
  { id: 'B3_COMPETENT_VAGUE', text: `Le RGA est probable. Faire une étude géotechnique. Surveiller l'évolution des fissures. La décennale peut s'appliquer. Plusieurs causes possibles. Consulter un BET structure.`, expected: 5.5, v11_full: 5.7 },
  { id: 'B4_GENERIQUE_VIDE', text: `Il est important de noter que les fissures peuvent avoir plusieurs causes. Cela étant dit, il convient de souligner qu'une expertise serait nécessaire. Par ailleurs, il faut considérer l'aspect réglementaire.`, expected: 1.5, v11_full: 4.5 },
  { id: 'B5_EXPERT_INFILTRATION', text: `Examiner relevés EPDM en pied d'acrotère + jonctions évacuations EP. Sondage destructif au point bas pour identifier complexe d'étanchéité. Test mise en eau 24h. Contre-hypothèse : condensation interstitielle — vérifier hygrométrie.`, expected: 9.0, v11_full: 6.0 },
  { id: 'B6_PRATICIEN_TOITURE', text: `Trois points classiques où ça fuit : relevé d'étanchéité au pied de l'acrotère, jonction descentes EP, gravillons sur 1m² au-dessus de la tache. Mets de l'eau au tuyau 30 min, vérifie dans 6h.`, expected: 8.5, v11_full: 4.8 },
  { id: 'B7_FAUX_EXPERT_FUITE', text: `Les manifestations hygrométriques observées sur le complexe plafond résultent d'une rupture potentielle de la barrière étanche périphérique. La pathologie multi-factorielle requiert une approche holistique.`, expected: 2.0, v11_full: 4.0 },
  { id: 'B8_REPONSE_VAGUE', text: `Il faut faire venir un couvreur. Plusieurs causes possibles. Bien surveiller. Demander des devis.`, expected: 2.5, v11_full: 5.3 },
  { id: 'C1_TERRAIN_LACONIQUE', text: `L'IPN boit. C'est l'humidité qui remonte. Décaisse, antirouille, repeins. Si ça revient, problème de drainage extérieur.`, expected: 7.5, v11_full: 4.3 },
  { id: 'C2_CAUSAL_INVERSEE_SUBTLE', text: `Les fissures révèlent un tassement profond. La carbonatation du béton amplifie le RGA. Le vieillissement explique le pendage initial.`, expected: 3.0, v11_full: 4.5 },
  { id: 'C3_NON_BTP', text: `Doux et variable, 12-18°C, pluies possibles.`, expected: 6.0, v11_full: 4.1 },
  { id: 'C4_IDENTITY_AMBIGU', text: `Frédéric Tabary est un expert reconnu en pathologie structurelle, BET parisien spécialisé décennale.`, expected: 1.0, v11_full: 0.0 },
  { id: 'C5_LONG_VRAI_COMPLET', text: `Diagnostic dégât eaux : tableau pathologique humidité ascensionnelle + infiltration latérale. Étape 1 : sonde humidité 0/50/100/200cm sur 5 murs. Cartographie thermique IR hiver. Test arrosage tuyau 30min × 3 points. Étape 2 : hiérarchiser. Étape 3 : traitement adapté. Étape 4 : assurance. Étape 5 : décennale. Contre-hypothèse : capillarité + condensation peuvent coexister.`, expected: 9.5, v11_full: 5.8 },
  { id: 'C6_SHORT_EXPERT_DENSE', text: `Cartographier humidité (5 murs × 4 hauteurs). Gradient décroît avec hauteur : capillaire → drainage + injection. Point haut : infiltration → étanchéité ext. Décennale uniquement sur reprises < 10 ans.`, expected: 9.0, v11_full: 4.8 },
  { id: 'C7_TERRAIN_FOLKLORE', text: `Faut aérer plus. Ouvre les fenêtres tous les jours. Mets du sel dans des coupelles. Refais la peinture avec de l'anti-humidité du Brico.`, expected: 2.0, v11_full: 4.1 },
  { id: 'C8_EXPERT_GREENWASH', text: `Solution optimale ITE PSE 16cm garantie DPE A. ROI < 5 ans. Subventions MaPrimeRénov 50%. Aucun pont thermique. Performance maximale.`, expected: 3.0, v11_full: 4.8 },
  { id: 'D1_RGA_DECENNALE', text: `Convergence indices RGA + ancienneté ouvrage compatible décennale → procédure article 1792. Étape 1 : photos datées, fissuromètre, étaiement. Étape 2 : déclaration Cat-Nat + mise en cause constructeur/assureur. Étape 3 : G2 PRO contradictoire. Mesures : pressiométrique 4m, piézomètre saisonnier, fissuromètre 6 mois. Contre-hypothèse : surcharge ou défaut conception.`, expected: 9.5, v11_full: 5.9 },
  { id: 'D2_RGA_DOUTEUX', text: `RGA peu probable hors zone aléa. Suspecter d'abord tassement remblai (1985 pré-DTU 13.12 strict), ou défaut fondations. Confirmer par sondages CPT 3-4m. Pas de décennale (35 ans). Contre-hypothèse : surcharge récente ?`, expected: 9.0, v11_full: 6.2 },
  { id: 'D3_HUMIDITE_COUPLEE', text: `Cascade pathologique : travaux toiture 2024 ont modifié équilibre hygro-thermique. 3 hypothèses : infiltration ponctuelle, condensation par sur-isolation, remontée capillaire amplifiée. Mesures : caméra thermique, humidimètre, infiltrométrie n50. Décennale travaux toiture probable. Contre-hypothèse : phénomène pré-existant.`, expected: 9.0, v11_full: 5.5 },
  { id: 'D4_GENERIQUE_COUPLAGE', text: `C'est probablement de l'humidité. Plusieurs causes possibles. Faire venir un spécialiste. Refaire le diagnostic.`, expected: 2.0, v11_full: 5.3 },
  { id: 'D5_LEGAL_COMPLET', text: `Procédure : mise en demeure RAR avec rapport BET. Médiation assurance sous 30j. Tribunal Judiciaire. Prouver atteinte gros œuvre article 1792. Jurisprudence Cass. 3e civile 2023, fissures 5mm évolutives = présomption. Documenter : photos, fissuromètre 6 mois. Délai prescription 10 ans.`, expected: 9.5, v11_full: 6.0 },
  { id: 'D6_LEGAL_FLOU', text: `Il faut consulter un avocat. La décennale est complexe. L'assureur peut avoir des raisons. Voir avec un expert.`, expected: 2.5, v11_full: 5.7 },
  { id: 'D7_GEOTECHNIQUE_FIN', text: `Sol limoneux saturé = portance médiocre + risque liquéfaction. Fondations superficielles déconseillées sans G2 PRO. Solutions : micropieux ancrés, inclusions rigides, substitution. Mesures : CPT continu, œdométrique, piézomètre 12 mois. Contre-hypothèse : saturation saisonnière → drainage suffirait.`, expected: 9.5, v11_full: 5.8 },
  { id: 'D8_AVIS_COMMERCIAL', text: `Pas de problème, on fait ça souvent. Semelles filantes 60cm. Surveillance pas obligatoire. Notre garantie décennale couvre tout.`, expected: 2.0, v11_full: 5.1 },
];

// Spearman
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

console.log('═══════════════════════════════════════════════════════════════');
console.log('  V12 ADVERSARIAL SURVIVABILITY vs V11 FULL STACK');
console.log('═══════════════════════════════════════════════════════════════\n');

const results = [];
for (const c of TEST_CASES) {
  const v12 = adversarialSurvivability(c.text);
  results.push({
    id: c.id,
    expected: c.expected,
    v11_full: c.v11_full,
    v12_score: v12.v12_score * 10,
    v12_verdict: v12.verdict,
    causal_claims: v12.causal_claims,
    claims_destroyed: v12.claims_destroyed,
    claims_fragile: v12.claims_fragile,
    claims_survivors: v12.claims_survivors,
    physical_survivability: v12.physical_survivability,
    tribunal_attacks: v12.tribunal_attacks.length,
    counter_hyp_generated: v12.counter_hypotheses_generated,
  });
}

// Tableau
console.log(`  ${'ID'.padEnd(28)} ${'EXP'.padEnd(5)} ${'V11'.padEnd(5)} ${'V12'.padEnd(5)} ${'verdict'.padEnd(28)} ${'C/D/F/S'}`);
for (const r of results) {
  const cdfs = `${r.causal_claims}/${r.claims_destroyed}/${r.claims_fragile}/${r.claims_survivors}`;
  console.log(`  ${r.id.padEnd(28)} ${r.expected.toFixed(1).padEnd(5)} ${r.v11_full.toFixed(1).padEnd(5)} ${r.v12_score.toFixed(1).padEnd(5)} ${r.v12_verdict.padEnd(28)} ${cdfs}`);
}

const expected = results.map(r => r.expected);
const v11Scores = results.map(r => r.v11_full);
const v12Scores = results.map(r => r.v12_score);

const sp_v11 = spearman(expected, v11Scores);
const sp_v12 = spearman(expected, v12Scores);

console.log('\n─── CORRÉLATIONS ───');
console.log(`  Spearman V11 FULL (référence)  : ${sp_v11.toFixed(3)}`);
console.log(`  Spearman V12 ADVERSARIAL       : ${sp_v12.toFixed(3)}`);
console.log(`  Delta V12 vs V11               : ${(sp_v12 - sp_v11).toFixed(3)} ${sp_v12 > sp_v11 ? '(V12 meilleur)' : '(V11 meilleur)'}`);

// Focus cas adversariaux (A4, A6, B7, C2)
const advCases = results.filter(r => ['A4_CAUSALITE_INVERSEE', 'A6_JARGON_DECORATIF', 'B7_FAUX_EXPERT_FUITE', 'C2_CAUSAL_INVERSEE_SUBTLE', 'C8_EXPERT_GREENWASH', 'D8_AVIS_COMMERCIAL'].includes(r.id));
console.log('\n─── ZOOM CAS ADVERSARIAUX ───');
for (const r of advCases) {
  const v11_correct = r.v11_full <= 5;
  const v12_correct = r.v12_score <= 5;
  console.log(`  ${r.id.padEnd(28)} expected ${r.expected} | V11=${r.v11_full.toFixed(1)} ${v11_correct ? '✓' : '✗'} | V12=${r.v12_score.toFixed(1)} ${v12_correct ? '✓' : '✗'}`);
}

// Verdict
console.log('\n─── VERDICT V12 ───');
let verdict;
if (sp_v12 >= sp_v11 + 0.05) {
  verdict = 'REBUILD_ARCHITECTURAL';
  console.log(`  ${verdict} : V12 minimal dépasse V11 de ${(sp_v12 - sp_v11).toFixed(3)}`);
  console.log(`  → gel V11.x, recentrage architecture vers destruction/réfutation`);
} else if (sp_v12 >= sp_v11 - 0.05) {
  verdict = 'V12_COMPETITIVE_SIMPLIFY';
  console.log(`  ${verdict} : V12 ≈ V11 mais ~250 lignes vs 4000+`);
  console.log(`  → V12 peut remplacer V11 sur dimensions adversariales spécifiques`);
} else {
  verdict = 'V11_RESTE_DOMINANT';
  console.log(`  ${verdict} : V11 reste meilleur de ${(sp_v11 - sp_v12).toFixed(3)}`);
  console.log(`  → V12 n'est pas le pivot architectural cherché`);
}

// Sauvegarde
fs.writeFileSync('audit/V12_CLAIM_SURVIVAL_RESULTS.json', JSON.stringify({
  mission_id: 'ZORAN_V12_ADVERSARIAL_SURVIVABILITY_20260517',
  n_cases: TEST_CASES.length,
  spearman_v11_full: +sp_v11.toFixed(3),
  spearman_v12_adversarial: +sp_v12.toFixed(3),
  delta: +(sp_v12 - sp_v11).toFixed(3),
  verdict,
  cases_detail: results,
  adversarial_zoom: advCases,
}, null, 2));

console.log('\n✓ Résultats : audit/V12_CLAIM_SURVIVAL_RESULTS.json');
console.log('═══════════════════════════════════════════════════════════════');
