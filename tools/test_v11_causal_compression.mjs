// tools/test_v11_causal_compression.mjs
// Mission V11_CAUSAL_COMPRESSION : BREAK-FIRST puis benchmark before/after

import fs from 'node:fs';
import {
  extractCausalCore, detectRedundancyNoise, priorityPreservationOrder,
  reserveTerminalBudget, compressCausal,
} from '../app/src/causal_compression_engine.js';
import {
  terminalIntegrityScore, causalRetentionRatio,
  usefulDensityAfterCompression, compressionDamageIndex,
  fullTruncationReport,
} from '../app/src/truncation_detector_v11.js';

// ────────── 5 RÉPONSES EXPERTES LONGUES × 4 BUDGETS = 20 CAS ──────────
const EXPERT_RESPONSES = [
  {
    id: 'EXPERT_RGA',
    text: `Danger immédiat : si fissure évolutive > 0.5mm/mois, étaiement provisoire obligatoire (DTU 13.12). Tableau pathologique classique : suspecter RGA argile gonflante post-sécheresse 2022 (aléa fort) comme cause dominante. Cofacteurs aggravants : humidité capillaire amplifie corrosion armatures IPN par dilatation volumique ×10. Pont thermique base mur entretient condensation surfacique. Carbonatation béton enrobage propage la dégradation. Instrumentation discriminante à mettre en œuvre : sondage géotechnique G2 PRO selon NF P 94-500 avec pressiométrique et CPT à 2/4/6m de profondeur. Fissuromètre étalonné Avongard posé 6+ mois pour cinétique. Humidimètre Protimeter en 5 points (paroi/sol/pied de mur). Caméra thermique FLIR avec ΔT > 3°C en hiver. Carottage béton avec analyse alcali-réaction (NF EN 12504). Actions immédiates sous 1 semaine : étaiement provisoire si évolution rapide, mandat BET structure pour note de calcul Eurocode, étude G2 PRO commandée par maître d'ouvrage, photographies datées avec fissuromètre. Actions moyen terme sous 1-6 mois : rapport BET avec scenarios de reprise, devis micropieux ou jet-grouting si confirmé, mise en cause assurance décennale si applicable. Limites de cette analyse : diagnostic à distance par symptômes uniquement, hypothèse principale (RGA vs surcharge) nécessite confirmation terrain, cinétique fissure non connue, charges réelles IPN non vérifiées. Contre-hypothèses à écarter : et si la cause était hydrogéologique (nappe affleurante variable) ? Et si IPN était correctement dimensionnée mais ancrage défaillant ? Et si fissures pré-existaient à réception (vice apparent → pas décennale) ? Conclusion : engagement décennale article 1792 probable si désordre < 10 ans et atteinte gros œuvre confirmée par G2.`,
  },
  {
    id: 'EXPERT_HUMIDITE',
    text: `Cascade pathologique typique : les travaux toiture 2024 ont modifié l'équilibre hygro-thermique du bâtiment. Cause dominante hypothétique : infiltration ponctuelle au nouveau complexe d'étanchéité non parfaitement raccordé. Cofacteurs : ventilation insuffisante post-isolation, remontée capillaire amplifiée par modification flux air ascendant. Falsification possible : et si l'humidité observée pré-existait aux travaux et n'est que révélée par changement de saison ? À écarter par vérification photos archive avant 2024. Instrumentation : caméra thermique infrarouge en hiver (ΔT minimum 3°C), humidimètre à pointes Protimeter 5 points minimum (cave, RDC paroi N/S, sous-toiture), test infiltrométrie n50 maison entière avant/après ventilation supplémentaire. Étape 1 sous 48h : identifier point haut humide pour discriminer infiltration vs ascension. Étape 2 sous 2 semaines : test mise en eau par tuyau sur 3 zones suspectes toiture, 30 min × 3 points, contrôle 6h après. Étape 3 sous 1 mois : selon résultats, intervention ciblée étanchéité OU complément ventilation. Responsabilité probable : décennale travaux 2024 engageable si désordre directement attribuable aux interventions. À documenter : devis et facture travaux, état des lieux pré-travaux si possible, jurisprudence Cass. 3e civ. 2023 sur dommages indirects post-rénovation. Limites de cette analyse : sans données instrumentées préalables au sinistre, distinction cause unique / cofacteurs reste hypothétique. Conclusion : action de mise en demeure entreprise sous 30 jours obligatoire pour préserver garantie décennale.`,
  },
  {
    id: 'EXPERT_LEGAL',
    text: `Procédure de mise en cause assureur dommages-ouvrage en 5 étapes. Étape 1 immédiate : mise en demeure par lettre RAR avec rapport BET indépendant joint. Étape 2 sous 30 jours : si refus persiste, saisir médiation assurance gratuite (FFA). Étape 3 sous 60 jours : si échec médiation, assignation Tribunal Judiciaire compétence territoriale. Élément clé à prouver : "atteinte gros œuvre" ou caractère "impropre à destination" au sens article 1792 Code civil. Jurisprudence applicable : Cass. 3e civile 14 mars 2023 n°22-XXX, qui retient que fissures évolutives 5mm sur élément porteur constituent présomption d'atteinte gros œuvre. Cofacteurs juridiques : antériorité du désordre vs réception, opposabilité au tiers de bonne foi, prescription décennale (10 ans à compter de la réception). Contre-stratégie typique adverse : assureur invoquera "désordre apparent à réception" — à réfuter par production du PV de réception. Si PV mentionne explicitement le désordre : aveu, donc pas de présomption décennale. Si PV silencieux : présomption joue. Instrumentation à conserver : photos datées trimestrielles, fissuromètre étalonné posé 6 mois avec relevés, rapport BET avec note de calcul si défaut conception. Action urgente : conserver TOUTE correspondance avec entreprise et assureur. Contre-hypothèse à anticiper : et si le désordre vient d'une cause hors-décennale (entretien) ? À documenter par rapport contradictoire. Limites : ce protocole suppose construction < 10 ans et désordre structurel confirmé.`,
  },
  {
    id: 'EXPERT_GEOTECH',
    text: `Sol limoneux saturé = portance médiocre + risque liquéfaction sous séisme. Fondations superficielles déconseillées sans étude G2 PRO renforcée. Solutions à arbitrer : (1) micropieux ancrés au substrat dur — sondage pressiométrique préalable pour profondeur cible, (2) inclusions rigides + matelas de répartition, (3) substitution + remblai compacté limité à 1.5m. Cause dominante de la portance dégradée : saturation hydrique du limon par nappe haute ou drainage défaillant. Cofacteurs : nature minéralogique du limon (présence d'argiles secondaires), historique du site (remblai ?), pente. Instrumentation discriminante : pénétromètre statique CPT continu avec profil complet, essai œdométrique laboratoire pour calcul consolidation, piézomètre 12 mois pour cycle saisonnier nappe. Falsification : et si la saturation est uniquement saisonnière ? Alors drainage périphérique + radier rigide peuvent suffire — plus simple et économique. Action immédiate sous 2 semaines : commander étude G2 PRO selon NF P 94-500 chez géotechnicien indépendant. Surcoût fondations spéciales : ×2-3 vs superficielles standards. Action moyen terme : note de calcul Eurocode 7 pour dimensionnement, validation bureau de contrôle. Risque résiduel à long terme : tassement consolidation différée 5-10 ans même avec fondations adaptées — surveillance niveaux topographiques recommandée. Limites de cette analyse : sans données G2 réelles, le choix de solution reste hypothétique. Conclusion : étude géotechnique G2 PRO non négociable avant tout dimensionnement définitif.`,
  },
  {
    id: 'EXPERT_THERMIQUE',
    text: `Analyse thermique maison ancienne : compromis ITE vs ITI à arbitrer selon nature parois et perspirance. Cause dominante des déperditions : pas un manque d'isolation seul, mais déséquilibre hygro-thermique parois pierres anciennes. Cofacteurs : capillarité naturelle pierre, inertie thermique importante, comportement occupant (chauffage intermittent ?). Risque majeur : ITI sur pierre humide crée condensation interstitielle = pourrissement structures bois et apparition mérule lignivore. Instrumentation préalable obligatoire : humidimètre 5 points sur paroi suspecte, test infiltrométrie n50 état actuel, mesure température/humidité air intérieur sur 1 mois minimum. Étape 1 sous 2 semaines : audit thermique réglementaire RGE avec données chiffrées. Étape 2 sous 1 mois : choix ITE ou ITI selon perspirance — ITE recommandée si pierre humide. Étape 3 sous 3 mois : devis 3 entreprises avec attestation RGE. Action critique : si ITI envisagée, IMPÉRATIVEMENT ajouter VMC double flux et isolant perspirant (chanvre, ouate de cellulose). Falsification : et si l'inertie thermique de la pierre rendait l'isolation peu rentable économiquement ? À calculer ROI 15-20 ans selon scénario chauffage. Risque irréversible : pont thermique acrotère mal traité peut compromettre tout l'investissement. Limites : sans données instrumentées pré-travaux, conclusions restent hypothétiques. Subventions : MaPrimeRénov + CEE conditionnés à audit énergétique préalable. Conclusion : étude thermique préalable RGE non négociable avant choix technique définitif.`,
  },
];

const BUDGETS = [50, 100, 150, 250];

// ────────── BREAK-FIRST : générer la suite adversariale ──────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  V11 CAUSAL COMPRESSION — BREAK-FIRST + benchmark');
console.log('═══════════════════════════════════════════════════════════════\n');

const adversarial_cases = [];
const benchmark_before_after = [];

for (const expert of EXPERT_RESPONSES) {
  const origReport = terminalIntegrityScore(expert.text);
  const origDensity = usefulDensityAfterCompression(expert.text);
  const origWords = expert.text.split(/\s+/).length;

  for (const budget of BUDGETS) {
    const compressed = compressCausal(expert.text, budget);
    const report = fullTruncationReport(expert.text, compressed.compressed_text);

    adversarial_cases.push({
      case_id: `${expert.id}_budget_${budget}`,
      expert_id: expert.id,
      budget,
      original_words: origWords,
      compressed_words: compressed.compressed_word_count,
      kept_sections: compressed.kept_sections,
      dropped_sections: compressed.dropped_sections,
      sentences_kept: compressed.sentences_kept,
      sentences_dropped: compressed.sentences_dropped,
      terminal_integrity: report.terminal_integrity,
      causal_retention: report.causal_retention,
      useful_density_after: report.useful_density_after,
      damage_index: report.damage_index,
    });

    benchmark_before_after.push({
      case_id: `${expert.id}_budget_${budget}`,
      before: {
        words: origWords,
        terminal_integrity: origReport.score,
        density: origDensity,
        truncated: origReport.components.truncated_end,
      },
      after: {
        words: compressed.compressed_word_count,
        terminal_integrity: report.terminal_integrity.score,
        density: report.useful_density_after,
        truncated: report.terminal_integrity.components.truncated_end,
        damage: report.damage_index.damage_index,
        verdict: report.damage_index.verdict,
      },
    });
  }
}

// ────────── AFFICHAGE ──────────
console.log('─── RÉSULTATS PAR EXPERT × BUDGET ───\n');
console.log(`  ${'CASE'.padEnd(28)} ${'budget'.padEnd(7)} ${'orig→comp'.padEnd(11)} ${'integ'.padEnd(6)} ${'retent'.padEnd(7)} ${'density'.padEnd(7)} ${'damage'.padEnd(7)}`);
for (const c of adversarial_cases) {
  const o2c = `${c.original_words}→${c.compressed_words}`;
  console.log(`  ${c.case_id.padEnd(28)} ${String(c.budget).padEnd(7)} ${o2c.padEnd(11)} ${c.terminal_integrity.score.toFixed(2).padEnd(6)} ${c.causal_retention.ratio.toFixed(2).padEnd(7)} ${c.useful_density_after.toFixed(2).padEnd(7)} ${c.damage_index.damage_index.toFixed(2).padEnd(7)}`);
}

// ────────── ANALYSE GLOBALE ──────────
console.log('\n─── ANALYSE GLOBALE ───\n');
const avgIntegrityByBudget = {};
const avgDamageByBudget = {};
for (const b of BUDGETS) {
  const cases = adversarial_cases.filter(c => c.budget === b);
  avgIntegrityByBudget[b] = cases.reduce((s, c) => s + c.terminal_integrity.score, 0) / cases.length;
  avgDamageByBudget[b] = cases.reduce((s, c) => s + c.damage_index.damage_index, 0) / cases.length;
}
console.log(`  Budget 50  : terminal_integrity moyen ${avgIntegrityByBudget[50].toFixed(2)}  damage moyen ${avgDamageByBudget[50].toFixed(2)}`);
console.log(`  Budget 100 : terminal_integrity moyen ${avgIntegrityByBudget[100].toFixed(2)}  damage moyen ${avgDamageByBudget[100].toFixed(2)}`);
console.log(`  Budget 150 : terminal_integrity moyen ${avgIntegrityByBudget[150].toFixed(2)}  damage moyen ${avgDamageByBudget[150].toFixed(2)}`);
console.log(`  Budget 250 : terminal_integrity moyen ${avgIntegrityByBudget[250].toFixed(2)}  damage moyen ${avgDamageByBudget[250].toFixed(2)}`);

// Cible : intégrité ≥ 0.80 et damage ≤ 0.25 à budget 150+
const criticalCases = adversarial_cases.filter(c =>
  c.budget >= 150 && c.terminal_integrity.score < 0.80
);
console.log(`\n  Cas critiques à budget ≥ 150 (intégrité < 0.80) : ${criticalCases.length}/${adversarial_cases.filter(c => c.budget >= 150).length}`);

// ────────── ÉCRITURE FICHIERS ──────────
fs.writeFileSync('audit/TRUNCATION_ADVERSARIAL_SUITE_V11.json', JSON.stringify({
  mission_id: 'V11_CAUSAL_COMPRESSION_20260517',
  n_cases: adversarial_cases.length,
  budgets_tested: BUDGETS,
  cases: adversarial_cases,
}, null, 2));

fs.writeFileSync('audit/benchmark_before_after_v11.json', JSON.stringify({
  mission_id: 'V11_CAUSAL_COMPRESSION_20260517',
  benchmark: benchmark_before_after,
  summary: {
    avg_integrity_by_budget: avgIntegrityByBudget,
    avg_damage_by_budget: avgDamageByBudget,
    critical_cases_high_budget: criticalCases.length,
  },
}, null, 2));

fs.writeFileSync('audit/MASSIVE_TRUNCATION_RESULTS_V11.json', JSON.stringify({
  mission_id: 'V11_CAUSAL_COMPRESSION_20260517',
  n_cases: adversarial_cases.length,
  experts_tested: EXPERT_RESPONSES.map(e => e.id),
  budgets: BUDGETS,
  results: adversarial_cases,
  analysis: {
    integrity_threshold_pass: adversarial_cases.filter(c => c.terminal_integrity.score >= 0.80).length,
    damage_threshold_pass: adversarial_cases.filter(c => c.damage_index.damage_index <= 0.25).length,
    causal_retention_pass: adversarial_cases.filter(c => c.causal_retention.ratio >= 0.80).length,
    total: adversarial_cases.length,
  },
}, null, 2));

console.log('\n✓ audit/TRUNCATION_ADVERSARIAL_SUITE_V11.json');
console.log('✓ audit/benchmark_before_after_v11.json');
console.log('✓ audit/MASSIVE_TRUNCATION_RESULTS_V11.json');
console.log('═══════════════════════════════════════════════════════════════');
