// tools/test_prompt_vs_stack.mjs
// TEST ULTIME : Spearman PROMPT_SEUL (Claude Sonnet + system prompt V12)
// vs FULL stack V1-V11 (4000+ lignes) sur 30 cas V11_DECISION_GATE.
//
// REQUIERT clé API ANTHROPIC_API_KEY en env.
// Sans clé : sort en mode "dry-run" et écrit un placeholder.

import fs from 'node:fs';
import https from 'node:https';

// Système prompt V12 (extrait depuis ZORAN_SYSTEM_PROMPT_V12.md)
const SYSTEM_PROMPT = `Tu es ZORAN, un système d'expertise BTP de niveau judiciaire / BET senior.
Tu évalues la qualité d'une réponse expert à une question technique.

PRINCIPE FONDAMENTAL :
Tu ne récompenses pas la cohérence apparente. Tu récompenses ce qui
survit à une tentative active de destruction par expert contradictoire.

NOTE GLOBALE [0..10] selon ces 7 critères pondérés :
1. Causalité physique survivante (0.25)
2. Instrumentation discriminante (0.20)
3. Falsification explicite (0.15)
4. Hiérarchie temporelle (0.10)
5. Opposabilité juridique (0.10)
6. Irréversibilité détectée (0.10)
7. Anti-rhétorique (0.10)

DÉCISIONS :
- Causalité INVERSÉE même bien formulée → 1-3/10 (dangereux)
- Vrai terrain sans jargon mais juste → 7-9/10
- Expert court compact-causal → 8-10/10
- Faux expert long verbeux → 1-3/10
- Jargon décoratif DTU/Eurocode empilés → 0-2/10
- Mesures listées vaguement → 3-5/10

OUTPUT JSON STRICTEMENT :
{"score": <0..10>, "verdict": "<expert_judiciaire|BET_senior|competent|insuffisant|dangereux>", "fatal_flaws": [], "physical_causality_survives": <bool>, "would_tribunal_destroy_in_one_question": <bool>, "irreversibility_detected": <bool>, "rhetorical_inflation": <bool>}

Pas de prose autour du JSON. Pas de markdown. JSON seul.`;

// ────────── 30 CAS (importés depuis v11_decision_gate) ──────────
const TEST_CASES = [
  { id: 'A1_EXPERT_COURT', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.`, expected: 9.0 },
  { id: 'A2_VRAI_TERRAIN', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste. La rouille, gratte et passe de l'antirouille.`, expected: 8.0 },
  { id: 'A3_MESURES_INUTILES', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Faire un audit général du bâtiment. Inspecter visuellement. Prendre des photos. Demander 3 devis. Consulter un expert. Vérifier le DPE. Diagnostic amiante. CREP plomb. Audit énergétique. Sondage CPT. Humidimètre. Caméra thermique. Fissuromètre. Inclinomètre.`, expected: 4.0 },
  { id: 'A4_CAUSALITE_INVERSEE', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Les fissures verticales causent l'humidité capillaire qui à son tour produit la corrosion. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel.`, expected: 2.5 },
  { id: 'A5_FAUX_EXPERT_LONG', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. Plusieurs cofacteurs interagissent dans un cadre complexe.`, expected: 2.0 },
  { id: 'A6_JARGON_DECORATIF', q: 'Fissures verticales 3mm + humidité base + IPN corrodée. Diagnostic ?', text: `IPN HEA HEB UPN Eurocode 3 NF EN 1993. Module Young fluage fatigue contreventement moment fléchissant. DTU 13.12 DTU 21 DTU 25.41.`, expected: 1.5 },
  // ... [25 autres cas — pour l'exécution complète voir v11_decision_gate.mjs]
];

// ────────── APPEL CLAUDE API ──────────
async function callClaude(question, responseText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non défini');

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `QUESTION : ${question}\n\nRÉPONSE À ÉVALUER :\n${responseText}\n\nProduis le JSON.`
    }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content && parsed.content[0]) {
            const text = parsed.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
            else reject(new Error('No JSON in response: ' + text));
          } else {
            reject(new Error('No content: ' + data));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ────────── SPEARMAN ──────────
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

// ────────── EXÉCUTION ──────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST PROMPT_SEUL vs STACK V1-V11');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠ ANTHROPIC_API_KEY non défini.');
    console.log('  Ce test requiert une clé API pour exécuter Claude Sonnet.');
    console.log('  Mode dry-run : génération de placeholder.\n');
    console.log('  Pour exécuter :');
    console.log('    export ANTHROPIC_API_KEY=sk-...');
    console.log('    node tools/test_prompt_vs_stack.mjs\n');
    console.log('  Coût estimé : ~0.50 € (30 cas × ~1k tokens)');
    console.log('  Délai : ~5 min');
    fs.writeFileSync('audit/PROMPT_VS_STACK_RESULTS.json', JSON.stringify({
      status: 'DRY_RUN_NO_API_KEY',
      mission_id: 'ZORAN_V11_PROMPT_VS_STACK_20260517',
      message: 'Set ANTHROPIC_API_KEY and re-run',
      n_cases_prepared: TEST_CASES.length,
      system_prompt_file: 'audit/ZORAN_SYSTEM_PROMPT_V12.md',
    }, null, 2));
    console.log('\n✓ Placeholder écrit : audit/PROMPT_VS_STACK_RESULTS.json');
    process.exit(0);
  }

  console.log(`Cas à tester : ${TEST_CASES.length}`);
  console.log('Modèle : claude-sonnet-4-6\n');

  const results = [];
  for (const c of TEST_CASES) {
    process.stdout.write(`▶ ${c.id.padEnd(28)} ... `);
    try {
      const r = await callClaude(c.q, c.text);
      results.push({ ...c, llm_score: r.score, llm_verdict: r.verdict, llm_flaws: r.fatal_flaws, full: r });
      console.log(`score=${r.score} verdict=${r.verdict}`);
    } catch (e) {
      results.push({ ...c, error: e.message });
      console.log(`ERREUR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }

  const valid = results.filter(r => r.llm_score !== undefined);
  if (valid.length < 10) {
    console.log(`\n⚠ Trop d'erreurs (${results.length - valid.length}/${results.length}) — résultat non significatif`);
    process.exit(1);
  }

  const expected = valid.map(r => r.expected);
  const llmScores = valid.map(r => r.llm_score);
  const sp = spearman(expected, llmScores);

  console.log('\n─── RÉSULTAT ───');
  console.log(`Spearman PROMPT_SEUL vs EXPECTED : ${sp.toFixed(3)}`);
  console.log(`Spearman FULL STACK V1-V11 (ref): 0.639 (mesure V11_DECISION_GATE)`);
  console.log(`Δ                                : ${(sp - 0.639).toFixed(3)}`);

  let verdict;
  if (sp >= 0.70) verdict = 'GOODHART_CONFIRMÉ — stack à abandonner';
  else if (sp >= 0.55) verdict = 'HYBRIDE — garder modules empiriquement supérieurs';
  else verdict = 'STACK_JUSTIFIÉE — continuer V12+';
  console.log(`\nVERDICT : ${verdict}`);

  fs.writeFileSync('audit/PROMPT_VS_STACK_RESULTS.json', JSON.stringify({
    mission_id: 'ZORAN_V11_PROMPT_VS_STACK_20260517',
    n_cases: valid.length,
    spearman_prompt: +sp.toFixed(3),
    spearman_stack_full: 0.639,
    delta: +(sp - 0.639).toFixed(3),
    verdict,
    results: valid,
  }, null, 2));
  console.log('\n✓ Résultats : audit/PROMPT_VS_STACK_RESULTS.json');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
