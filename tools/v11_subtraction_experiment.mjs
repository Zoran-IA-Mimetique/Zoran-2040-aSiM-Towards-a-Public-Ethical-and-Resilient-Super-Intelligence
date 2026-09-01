// tools/v11_subtraction_experiment.mjs
// Mission V11 — TEST DE SOUSTRACTION (anti-Goodhart de second ordre)
//
// Question : V1→V10 (14+ détecteurs) est-il vraiment utile,
//            OU le système souffre-t-il d'un Goodhart auto-référent ?
//
// Méthode :
//   1. Construire 30 cas avec ranking attendu (par construction)
//   2. Scorer chaque cas avec PIPELINE_FULL (toutes métriques V1-V10)
//   3. Scorer chaque cas avec PIPELINE_MINIMAL (causal_density + identity_gate)
//   4. Comparer corrélation rank attendu sur chaque pipeline
//   5. Mesurer latence, complexité, faux positifs
//   6. Verdict : COMPLEXITÉ JUSTIFIÉE vs COMPLEXITÉ REDONDANTE

import fs from 'node:fs';

// PIPELINE_FULL — toutes les métriques V1-V10
import { btpOperationalScore } from '../app/src/btp_supremacy_engine.js';
import { runFragilityDetector } from '../app/src/fragility_detector.js';
import { systemicCoherenceReport } from '../app/src/systemic_coherence.js';
import { runAntiGoodhart } from '../app/src/anti_goodhart.js';
import { seductiveComplexity } from '../app/src/seductive_complexity.js';
import { usefulInformationDensityV2 } from '../app/src/noise_killer.js';
import { practicalUsefulness, concreteRuntimeAlignment, jargonDensity } from '../app/src/jargon.js';
import { terrainAlignment } from '../app/src/completion.js';
import { detectCTAPresence } from '../app/src/zoran_cta_engine.js';

// PIPELINE_MINIMAL — uniquement causal_density + identity_gate
import { causalDensityScore } from '../app/src/causal_density.js';
import { identityGate } from '../app/src/identity_gate.js';

// ───────────────────── 30 CAS AVEC RANKING ATTENDU ─────────────────────
// Chaque cas a un score humain attendu [0..10] basé sur la construction.

const TEST_CASES = [
  // GROUPE A : 6 cas adversariaux (déjà vus dans V10)
  { id: 'A1_EXPERT_COURT', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.`,
    expected_score: 9.0,
  },
  { id: 'A2_VRAI_TERRAIN', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste. La rouille, gratte et passe de l'antirouille. Le vrai problème serait que l'IPN porte mal — fais venir quelqu'un pour vérifier qu'elle est bien dimensionnée pour ce qu'elle porte.`,
    expected_score: 8.0,
  },
  { id: 'A3_MESURES_INUTILES', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `Faire un audit général du bâtiment. Inspecter visuellement. Prendre des photos. Demander 3 devis. Consulter un expert. Vérifier le DPE. Diagnostic amiante. CREP plomb. Audit énergétique. Sondage CPT. Humidimètre. Caméra thermique. Fissuromètre. Inclinomètre. Piézomètre. Carottage. Analyse laboratoire. Étude G2 PRO. Rapport BET. Toutes ces mesures peuvent être utiles.`,
    expected_score: 4.0,
  },
  { id: 'A4_CAUSALITE_INVERSEE', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `Les fissures verticales 3mm causent l'humidité capillaire qui à son tour produit la corrosion de l'IPN. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel. Sondage CPT à 4m pour confirmer. Humidimètre 5 points. Caméra thermique. Décennale article 1792 probablement engagée. Cofacteurs : la corrosion entraîne la fissuration originelle qui propage le RGA.`,
    expected_score: 2.5,
  },
  { id: 'A5_FAUX_EXPERT_LONG', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. L'observation des phénomènes structurels couplés à la présence d'humidité requiert une démarche méthodologique rigoureuse. Les implications décennales doivent être considérées dans une approche globale tenant compte de l'ensemble des facteurs systémiques. Une expertise approfondie serait nécessaire pour évaluer les implications. La cause peut être multiple, multi-factorielle, avec divers cofacteurs qui interagissent dans un cadre complexe. Il faut analyser l'amplification cascade, les déclencheurs, les révélateurs, les propagateurs.`,
    expected_score: 2.0,
  },
  { id: 'A6_JARGON_DECORATIF', question: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text:
    `IPN HEA HEB UPN avec Eurocode 3 NF EN 1993. Module de Young, fluage, fatigue, contreventement, moment fléchissant, effort tranchant. DTU 13.12, DTU 21, DTU 25.41. Cisaillement et flambement à considérer selon Eurocode 2. NF P 94-500 pour géotechnique. Article 1792 article 2270 parfait achèvement. Cause racine cofacteur amplificateur déclencheur révélateur propagateur. Étiopathogénie complexe.`,
    expected_score: 1.5,
  },

  // GROUPE B : 8 cas EXPERTISE RÉELLE (varied quality)
  { id: 'B1_EXPERT_RGA_COMPLET', question: 'Maison 2018 zone argileuse, fissures escalier depuis sécheresse 2022', text:
    `Suspicion RGA argile gonflante post-sécheresse 2022 (aléa fort). Fissures escalier = pattern caractéristique tassements différentiels par retrait argileux. Étape 1 : étude G2 PRO obligatoire (NF P 94-500) avec sondages pressiométriques à 4m. Étape 2 : suivi fissuromètre étalonné 6 mois pour cinétique. Si confirmé : déclaration Cat-Nat sécheresse + reprise sous-œuvre micropieux ou injection résine expansive selon profondeur substrat. Décennale article 1792 engageable si construction < 10 ans (réception 2018 → OK). Contre-hypothèse : tassement remblai initial mal compacté — à écarter par sondages.`,
    expected_score: 9.5,
  },
  { id: 'B2_TERRAIN_PRAGMATIQUE', question: 'Maison 2018 zone argileuse, fissures escalier depuis sécheresse 2022', text:
    `Ça sent le RGA classique post-2022. Avant études coûteuses : (1) pose 4 témoins plâtre maintenant + photos datées, suivi 6 mois pour voir si ça bouge encore. (2) Récupère ton rapport G1 PGC obligatoire vente Loi Élan, regarde l'aléa. (3) Si ça bouge encore : déclare Cat-Nat sécheresse à l'assureur, ils paient l'expertise G2. (4) Si ça stabilise : esthétique avec joint souple, surveillance annuelle. Garde tout en photos pour la décennale (tu es dans les 10 ans).`,
    expected_score: 8.5,
  },
  { id: 'B3_COMPETENT_SANS_FOLIE', question: 'Maison 2018 zone argileuse, fissures escalier depuis sécheresse 2022', text:
    `Le RGA est probable. Il faut faire une étude géotechnique. Surveiller l'évolution des fissures. La décennale peut s'appliquer. Plusieurs causes possibles : argile gonflante, tassement, défaut de fondation. Consulter un BET structure.`,
    expected_score: 5.5,
  },
  { id: 'B4_GENERIQUE_VIDE', question: 'Maison 2018 zone argileuse, fissures escalier depuis sécheresse 2022', text:
    `Il est important de noter que les fissures peuvent avoir plusieurs causes. Cela étant dit, il convient de souligner qu'une expertise serait nécessaire. Par ailleurs, il faut considérer l'aspect réglementaire. En conclusion, plusieurs facteurs sont à prendre en compte.`,
    expected_score: 1.5,
  },
  { id: 'B5_EXPERT_INFILTRATION', question: 'Infiltrations toiture-terrasse après orage, traces humidité plafond', text:
    `Diagnostic d'étanchéité : examiner relevés EPDM/bicouche en pied d'acrotère + jonctions évacuations EP. Sondage destructif (carotte 30mm) au point bas le plus humide pour identifier complexe d'étanchéité. Test de mise en eau si toiture accessible (24h). Si membrane vieillie > 15 ans : réfection partielle ou totale selon ratio cassures détectées. Contre-hypothèse : condensation interstitielle (manque pare-vapeur) — vérifier hygrométrie locaux. Pas de décennale si maintenance non assurée par MOA.`,
    expected_score: 9.0,
  },
  { id: 'B6_PRATICIEN_TOITURE', question: 'Infiltrations toiture-terrasse après orage, traces humidité plafond', text:
    `Trois points classiques où ça fuit : (1) relevé d'étanchéité au pied de l'acrotère, regarde si la membrane décolle ou s'est fendue. (2) jonction des descentes d'eau pluviale, souvent un point faible. (3) si la toiture est gravillonnée, déplace les gravillons sur 1m² au-dessus de la tache pour voir la membrane. Mets de l'eau au tuyau pendant 30 min sur la zone suspecte, vérifie dans 6h. Réparation : si c'est ponctuel, EPDM auto-adhésif. Si tu trouves plusieurs points : refais tout, ça revient moins cher.`,
    expected_score: 8.5,
  },
  { id: 'B7_FAUX_EXPERT_FUITE', question: 'Infiltrations toiture-terrasse après orage, traces humidité plafond', text:
    `Les manifestations hygrométriques observées sur le complexe plafond/plénum résultent d'une rupture potentielle de la barrière étanche périphérique. La pathologie multi-factorielle requiert une approche holistique intégrant les déperditions thermiques et la ventilation. L'étanchéité périphérique conjuguée à l'inertie thermique du complexe en élévation justifie une investigation approfondie multi-cadre.`,
    expected_score: 2.0,
  },
  { id: 'B8_REPONSE_VAGUE', question: 'Infiltrations toiture-terrasse après orage, traces humidité plafond', text:
    `Il faut faire venir un couvreur pour regarder. Plusieurs causes possibles. Bien surveiller. Demander des devis.`,
    expected_score: 2.5,
  },

  // GROUPE C : 8 cas LIMITES STRUCTURELLES (où on s'attend à fail)
  { id: 'C1_TERRAIN_LACONIQUE', question: 'IPN du salon présente fissuration béton enrobage', text:
    `L'IPN boit. C'est l'humidité qui remonte. Décaisse, antirouille, repeins. Si ça revient, problème de drainage extérieur.`,
    expected_score: 7.5,  // praticien laconique mais juste
  },
  { id: 'C2_CAUSAL_INVERSEE_SUBTLE', question: 'Tassement maison + fissures', text:
    `Les fissures révèlent un tassement profond. La carbonatation du béton qui en résulte amplifie le RGA. Le vieillissement précoce explique le pendage initial du terrain. Étude G2 nécessaire.`,
    expected_score: 3.0,  // causalité fine mais inversée (carbonatation n'amplifie pas RGA)
  },
  { id: 'C3_NON_BTP', question: 'Quel temps fait-il à Nantes en mai ?', text:
    `Doux et variable, 12-18°C, pluies possibles.`,
    expected_score: 6.0,  // pertinent mais non-BTP
  },
  { id: 'C4_IDENTITY_AMBIGU', question: 'Qui est Frédéric Tabary expert BTP ?', text:
    `Frédéric Tabary est un expert reconnu en pathologie structurelle, BET parisien spécialisé décennale.`,
    expected_score: 1.0,  // hallu probable identité ambiguë
  },
  { id: 'C5_LONG_VRAI_COMPLET', question: 'Sinistre dégât eaux étendu maison ancienne', text:
    `Diagnostic dégât eaux étendu maison ancienne : tableau pathologique typique humidité ascensionnelle + infiltration latérale. Étape 1 : identifier source. Sonde humidité à différentes hauteurs (0/50/100/200cm) sur 5 murs. Cartographie thermique infrarouge en hiver. Test arrosage tuyau 30min × 3 points suspects extérieurs. Étape 2 : hiérarchiser. Humidité ascensionnelle (remontée capillaire) si gradient humidité décroît avec hauteur. Infiltration latérale si point haut humide. Condensation si murs froids face Nord + ponts thermiques. Étape 3 : traitement adapté. Drainage périphérique + injection résine hydrofuge si capillaire. Étanchéité + drainage si latérale. ITE + VMC double flux si condensation. Étape 4 : assurance. Si soudaine après événement : MRH dégât eaux. Si chronique : pas de prise en charge sauf vice caché (preuve difficile). Étape 5 : décennale. Maison ancienne hors décennale construction. Mais reprises < 10 ans engagent décennale travaux. Contre-hypothèse : capillarité ascensionnelle + condensation peuvent coexister — instrumenter avant traiter. Durée totale diagnostic + travaux : 6-12 mois.`,
    expected_score: 9.5,  // long MAIS hiérarchisé causal complet
  },
  { id: 'C6_SHORT_EXPERT_DENSE', question: 'Sinistre dégât eaux étendu maison ancienne', text:
    `Cartographier humidité (5 murs × 4 hauteurs) avant tout. Si gradient décroît avec hauteur : capillaire → drainage + injection. Si point haut : infiltration → étanchéité ext. Si murs froids : condensation → ITE + VMC. Décennale uniquement sur reprises < 10 ans.`,
    expected_score: 9.0,  // court et dense
  },
  { id: 'C7_TERRAIN_FOLKLORE', question: 'Murs qui suintent et tachent', text:
    `Faut aérer plus. Ouvre les fenêtres tous les jours. Mets du sel dans des coupelles, ça absorbe. Refais la peinture avec de l'anti-humidité du Brico.`,
    expected_score: 2.0,  // folklore inutile
  },
  { id: 'C8_EXPERT_GREENWASH', question: 'Comment isoler thermiquement maison ancienne', text:
    `Solution optimale ITE PSE 16cm garantie DPE A. ROI < 5 ans. Subventions MaPrimeRénov 50%. Aucun pont thermique. Performance maximale.`,
    expected_score: 3.0,  // greenwash, ignore les contraintes maison ancienne (perspirance, inertie)
  },

  // GROUPE D : 8 cas COUPLAGES + RGA + DÉCENNALE
  { id: 'D1_RGA_DECENNALE', question: 'Construction 2020 fissures structurelles 5mm zone argile aléa fort', text:
    `Convergence indices RGA + ancienneté ouvrage compatible décennale → procédure article 1792 immédiate. Étape 1 : photos datées, fissuromètre, étaiement si évolution. Étape 2 : déclaration Cat-Nat (préfecture) + mise en cause constructeur/assureur dommages-ouvrage. Étape 3 : G2 PRO contradictoire si refus assureur. Mesures discriminantes : pressiométrique 4m + 8m, piézomètre saisonnier 12 mois, fissuromètre 6 mois. Décennale gros œuvre opposable même si étude G1 PGC absente (construction 2020 = obligation Loi Élan). Contre-hypothèse : surcharge ou défaut conception fondation.`,
    expected_score: 9.5,
  },
  { id: 'D2_RGA_DOUTEUX', question: 'Maison 1985 fissures escalier en zone hors-aléa', text:
    `RGA peu probable hors zone aléa. Suspecter d'abord tassement remblai initial (1985 = pré-DTU 13.12 strict), ou défaut fondations superficielles. Confirmer par sondages CPT 3-4m. Pas de décennale (35 ans). Si confirmé tassement : reprise sous-œuvre ou injection. Contre-hypothèse à valider : surcharge récente (extension, surélévation) ?`,
    expected_score: 9.0,
  },
  { id: 'D3_HUMIDITE_COUPLEE', question: 'Salpêtre + plâtre cloque + odeur cave après travaux toiture 2024', text:
    `Cascade pathologique typique : travaux toiture 2024 ont probablement modifié équilibre hygro-thermique. 3 hypothèses ordonnées : (1) infiltration ponctuelle nouveau complexe non-étanche, (2) condensation par sur-isolation sans ventilation adaptée, (3) remontée capillaire amplifiée par modification flux air. Mesures : caméra thermique hiver, humidimètre 5 points (cave + RDC + sous-toiture), test infiltrométrie n50 maison entière. Décennale travaux toiture probable si soudain post-2024. Contre-hypothèse : phénomène pré-existant révélé par changement saison.`,
    expected_score: 9.0,
  },
  { id: 'D4_GENERIQUE_COUPLAGE', question: 'Salpêtre + plâtre cloque + odeur cave après travaux toiture 2024', text:
    `C'est probablement de l'humidité. Plusieurs causes possibles. Faire venir un spécialiste. Refaire le diagnostic.`,
    expected_score: 2.0,
  },
  { id: 'D5_LEGAL_COMPLET', question: 'Refus assureur décennale fissures évolutives 5mm', text:
    `Procédure : (1) Mise en demeure assureur lettre RAR avec rapport BET indépendant. (2) Si refus persiste sous 30j : médiation assurance gratuite. (3) Échec médiation : Tribunal Judiciaire compétence. Élément clé : prouver "atteinte gros œuvre" ou "impropre à destination" (article 1792). Jurisprudence : Cass. 3e civile 2023, fissures 5mm évolutives sur élément porteur = présomption atteinte gros œuvre. Documenter : photos datées, fissuromètre 6 mois, rapport BET. Délai prescription 10 ans dès réception. Contre-stratégie assureur typique : "désordre apparent à réception" — réfuter avec PV réception.`,
    expected_score: 9.5,
  },
  { id: 'D6_LEGAL_FLOU', question: 'Refus assureur décennale fissures évolutives 5mm', text:
    `Il faut consulter un avocat. La décennale est complexe. L'assureur peut avoir des raisons. Voir avec un expert.`,
    expected_score: 2.5,
  },
  { id: 'D7_GEOTECHNIQUE_FIN', question: 'Sol limoneux saturé, fondations superficielles, projet extension', text:
    `Sol limoneux saturé = portance médiocre + risque liquéfaction sous séisme. Fondations superficielles déconseillées hors étude G2 PRO renforcée. Solutions à arbitrer : (1) micropieux ancrés au substrat (sondage pressiométrique pour profondeur), (2) inclusions rigides + matelas répartition, (3) substitution + remblai compacté (limité à 1.5m). Mesures : pénétromètre statique CPT continu, essai œdométrique laboratoire (consolidation), piézomètre 12 mois. Surcoût fondations spéciales : ×2-3 vs superficielles standards. Contre-hypothèse : si saturation saisonnière uniquement, drainage + radier rigide peut suffire.`,
    expected_score: 9.5,
  },
  { id: 'D8_AVIS_COMMERCIAL', question: 'Sol limoneux saturé, fondations superficielles, projet extension', text:
    `Pas de problème, on fait ça souvent. Sur un sol limoneux, il suffit de bien tasser et mettre des semelles filantes 60cm de large. Surveillance pas obligatoire. Notre garantie décennale couvre tout.`,
    expected_score: 2.0,  // dangereuse minimisation
  },
];

// ───────────────────── PIPELINES À COMPARER ─────────────────────

function pipelineFull(question, text) {
  const start = performance.now();
  const idGate = identityGate(question);
  if (!idGate.passes_gate) {
    return { score: 0, reason: 'blocked_identity', latency_ms: performance.now() - start };
  }
  const btp = btpOperationalScore(text);
  const frag = runFragilityDetector(text);
  const sys = systemicCoherenceReport(text);
  const good = runAntiGoodhart(text);
  const sed = seductiveComplexity(text);
  const ucr = usefulInformationDensityV2(text);
  const cta = detectCTAPresence(text);
  const pract = practicalUsefulness(text);
  const concrete = concreteRuntimeAlignment({ answerText: text, questionText: question });
  const jargon = jargonDensity(text);
  const terrain = terrainAlignment(text);

  // Composite avec 11 dimensions
  const composite = (
    0.20 * btp.score
    + 0.10 * (1 - frag.fragility_risk)
    + 0.10 * sys.composite
    + 0.10 * (1 - good.goodhart_risk)
    + 0.05 * (1 - sed.score)
    + 0.05 * ucr
    + 0.05 * cta.coverage
    + 0.10 * pract
    + 0.10 * concrete
    + 0.05 * (1 - jargon)
    + 0.10 * terrain
  );
  return {
    score: +Math.min(1, composite).toFixed(3),
    latency_ms: +(performance.now() - start).toFixed(2),
    components_count: 11,
  };
}

function pipelineMinimal(question, text) {
  const start = performance.now();
  const idGate = identityGate(question);
  if (!idGate.passes_gate) {
    return { score: 0, reason: 'blocked_identity', latency_ms: performance.now() - start };
  }
  const causal = causalDensityScore(text);
  return {
    score: causal.score,
    latency_ms: +(performance.now() - start).toFixed(2),
    components_count: 2,
  };
}

// ───────────────────── SPEARMAN CORRELATION ─────────────────────
function rank(arr) {
  const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(arr.length);
  sorted.forEach((item, rankIdx) => { ranks[item.i] = rankIdx + 1; });
  return ranks;
}

function spearman(a, b) {
  const ranksA = rank(a);
  const ranksB = rank(b);
  const n = a.length;
  const sumDsquared = ranksA.reduce((s, ra, i) => s + (ra - ranksB[i]) ** 2, 0);
  return 1 - (6 * sumDsquared) / (n * (n * n - 1));
}

function kendallTau(a, b) {
  const n = a.length;
  let concordant = 0, discordant = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const signA = Math.sign(a[i] - a[j]);
      const signB = Math.sign(b[i] - b[j]);
      if (signA * signB > 0) concordant++;
      else if (signA * signB < 0) discordant++;
    }
  }
  return (concordant - discordant) / (n * (n - 1) / 2);
}

// ───────────────────── EXÉCUTION ─────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  V11 SUBTRACTION EXPERIMENT — Goodhart second-ordre check');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Cas : ${TEST_CASES.length}\n`);
console.log(`  PIPELINE_FULL    : btp + fragility + systemic + goodhart + seductive`);
console.log(`                     + useful_density + cta + practical + concrete + jargon + terrain`);
console.log(`                     (11 composantes V1-V10)`);
console.log(`  PIPELINE_MINIMAL : identity_gate + causal_density (2 composantes V7+V10)\n`);

const results = [];
for (const c of TEST_CASES) {
  const full = pipelineFull(c.question, c.text);
  const min = pipelineMinimal(c.question, c.text);
  results.push({
    id: c.id,
    expected: c.expected_score,
    full_score: full.score * 10,
    min_score: min.score * 10,
    full_latency: full.latency_ms,
    min_latency: min.latency_ms,
  });
}

// Métriques
const expected = results.map(r => r.expected);
const fullScores = results.map(r => r.full_score);
const minScores = results.map(r => r.min_score);

const spearmanFull = spearman(expected, fullScores);
const spearmanMin = spearman(expected, minScores);
const kendallFull = kendallTau(expected, fullScores);
const kendallMin = kendallTau(expected, minScores);

const avgLatencyFull = results.reduce((s, r) => s + r.full_latency, 0) / results.length;
const avgLatencyMin = results.reduce((s, r) => s + r.min_latency, 0) / results.length;

// Display
console.log('─── A. SCORES PAR CAS ───');
console.log(`  ${'ID'.padEnd(28)} ${'EXP'.padEnd(6)} ${'FULL'.padEnd(7)} ${'MIN'.padEnd(7)} Δfull Δmin`);
for (const r of results) {
  const dFull = (r.full_score - r.expected).toFixed(1);
  const dMin = (r.min_score - r.expected).toFixed(1);
  console.log(`  ${r.id.padEnd(28)} ${r.expected.toFixed(1).padEnd(6)} ${r.full_score.toFixed(1).padEnd(7)} ${r.min_score.toFixed(1).padEnd(7)} ${dFull.padStart(5)} ${dMin.padStart(5)}`);
}

console.log('\n─── B. CORRÉLATIONS RANKING vs HUMAIN (par construction) ───');
console.log(`  Spearman FULL    : ${spearmanFull.toFixed(3)}`);
console.log(`  Spearman MINIMAL : ${spearmanMin.toFixed(3)}`);
console.log(`  Delta Spearman   : ${(spearmanFull - spearmanMin).toFixed(3)} ${spearmanFull > spearmanMin ? '(FULL meilleur)' : '(MINIMAL meilleur)'}`);
console.log(`  Kendall FULL     : ${kendallFull.toFixed(3)}`);
console.log(`  Kendall MINIMAL  : ${kendallMin.toFixed(3)}`);

console.log('\n─── C. COÛT / COMPLEXITÉ ───');
console.log(`  Latence FULL     : ${avgLatencyFull.toFixed(2)} ms/cas (11 composantes)`);
console.log(`  Latence MINIMAL  : ${avgLatencyMin.toFixed(2)} ms/cas (2 composantes)`);
console.log(`  Ratio coût       : ${(avgLatencyFull/avgLatencyMin).toFixed(1)}× plus cher pour FULL`);

// Verdict
console.log('\n─── D. VERDICT ───');
const corrGain = spearmanFull - spearmanMin;
let verdict;
if (corrGain > 0.10) {
  verdict = 'COMPLEXITÉ JUSTIFIÉE';
  console.log(`  ${verdict} (gain Spearman ${corrGain.toFixed(3)} > 0.10)`);
  console.log(`  → Les composantes V1-V10 améliorent significativement la corrélation`);
} else if (corrGain > 0.05) {
  verdict = 'COMPLEXITÉ MARGINALEMENT JUSTIFIÉE';
  console.log(`  ${verdict} (gain ${corrGain.toFixed(3)} entre 0.05 et 0.10)`);
} else if (corrGain >= -0.05) {
  verdict = 'COMPLEXITÉ REDONDANTE';
  console.log(`  ${verdict} (gain ${corrGain.toFixed(3)} ≈ 0)`);
  console.log(`  → MINIMAL est presque aussi bon que FULL. Goodhart second-ordre possible.`);
} else {
  verdict = 'COMPLEXITÉ NUISIBLE';
  console.log(`  ${verdict} (perte ${(-corrGain).toFixed(3)})`);
  console.log(`  → FULL est PIRE que MINIMAL. Stack causes des biais.`);
}

// Rapport
const report = {
  mission_id: 'V11_SUBTRACTION_EXPERIMENT_20260517',
  n_cases: TEST_CASES.length,
  pipelines: {
    full: { components: 11, avg_latency_ms: +avgLatencyFull.toFixed(2) },
    minimal: { components: 2, avg_latency_ms: +avgLatencyMin.toFixed(2) },
  },
  correlations: {
    spearman_full: +spearmanFull.toFixed(3),
    spearman_minimal: +spearmanMin.toFixed(3),
    spearman_delta: +(spearmanFull - spearmanMin).toFixed(3),
    kendall_full: +kendallFull.toFixed(3),
    kendall_minimal: +kendallMin.toFixed(3),
  },
  cost_ratio: +(avgLatencyFull / avgLatencyMin).toFixed(1),
  verdict,
  cases_detail: results,
};
fs.writeFileSync('audit/V11_SUBTRACTION_EXPERIMENT_RESULTS.json', JSON.stringify(report, null, 2));

console.log('\n✓ Résultats : audit/V11_SUBTRACTION_EXPERIMENT_RESULTS.json');
console.log('═══════════════════════════════════════════════════════════════');
