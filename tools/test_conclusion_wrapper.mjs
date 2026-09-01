// tools/test_conclusion_wrapper.mjs
// Vérifier que wrapConclusion fait passer terminal_integrity ≥ 0.80
// sur les 5 réponses experts V11.

import { wrapConclusion, hasExplicitConclusionBlock } from '../app/src/conclusion_wrapper.js';
import { terminalIntegrityScore } from '../app/src/truncation_detector_v11.js';

const EXPERTS = [
  { id: 'EXPERT_RGA', text: `Danger immédiat : si fissure évolutive > 0.5mm/mois, étaiement provisoire obligatoire. Tableau pathologique classique : suspecter RGA argile gonflante comme cause dominante. Instrumentation : sondage G2 PRO + fissuromètre 6 mois + humidimètre 5 points. Actions immédiates sous 1 semaine : étaiement provisoire si évolution, mandat BET structure, étude G2 PRO. Hypothèse principale (RGA vs surcharge) nécessite confirmation terrain. Et si la cause était hydrogéologique ? Engagement décennale article 1792 probable si désordre < 10 ans.` },
  { id: 'EXPERT_HUMIDITE', text: `Cascade pathologique : travaux toiture 2024 ont modifié équilibre hygro-thermique. Cause dominante : infiltration ponctuelle. Instrumentation : caméra thermique, humidimètre 5 points, infiltrométrie n50. Étape 1 sous 48h : identifier point haut humide. Étape 2 sous 2 semaines : test mise en eau. Action de mise en demeure entreprise sous 30 jours obligatoire.` },
  { id: 'EXPERT_LEGAL', text: `Procédure mise en cause assureur en 5 étapes. Étape 1 immédiate : mise en demeure RAR. Étape 2 sous 30 jours : médiation assurance. Étape 3 sous 60 jours : Tribunal Judiciaire. Prouver "atteinte gros œuvre" ou "impropre destination" article 1792. Jurisprudence : Cass. 3e civile 2023.` },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  TEST WRAPPER — terminal_integrity AVANT vs APRÈS');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalGain = 0;
let passCount = 0;
for (const e of EXPERTS) {
  const before = terminalIntegrityScore(e.text);
  const wrapped = wrapConclusion(e.text);
  const after = terminalIntegrityScore(wrapped);
  const gain = after.score - before.score;
  totalGain += gain;
  const pass = after.score >= 0.80;
  if (pass) passCount++;
  console.log(`▶ ${e.id}`);
  console.log(`  AVANT  : integrity=${before.score} verdict=${before.verdict} missing=[${before.missing.join(',')}]`);
  console.log(`  APRÈS  : integrity=${after.score} verdict=${after.verdict} missing=[${after.missing.join(',')}]`);
  console.log(`  GAIN   : +${gain.toFixed(3)}  ${pass ? '✓ ≥0.80' : '✗ <0.80'}\n`);
}
console.log(`Gain moyen : ${(totalGain / EXPERTS.length).toFixed(3)}`);
console.log(`Cas ≥ 0.80 : ${passCount}/${EXPERTS.length}`);
