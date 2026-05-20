// ZORAN_V13_MAX_SECURITY_LAB — Analyse statique du graphe d'imports.
// AUDIT / INSTRUMENTATION (autorisé mode chirurgical). Ne modifie aucun moteur.
//
// Produit : audit/impact_map_runtime.json
// Classifie chaque module app/src/*.js :
//   - reachable : atteignable depuis main.js (entry point index.html) → "branché"
//   - dormant   : exporté mais hors du graphe atteignable → mort runtime
//   - scoring   : importé (transitivement ou direct) par superiority.js
//   - ui        : importé par chat.js / panel.js / main.js
//   - inbound   : nombre de modules qui l'importent
//   - exports   : fonctions/const exportées
//
// Colonnes NON déterminables statiquement (falsifié, validé_humain) → laissées
// à l'audit humain. validé_humain = false pour tous (P0-MINI non exécuté).

import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'app', 'src');
const ENTRY = 'main.js';
const SCORING_HUB = 'superiority.js';
const UI_HUBS = ['chat.js', 'panel.js', 'main.js'];

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));

// Parse imports relatifs + exports de chaque module
const graph = {};
for (const f of files) {
  const src = fs.readFileSync(path.join(SRC, f), 'utf8');
  const imports = new Set();
  const importRx = /import\s+(?:[^'"]+\s+from\s+)?['"]\.\/([\w-]+)\.js['"]/g;
  let m;
  while ((m = importRx.exec(src)) !== null) imports.add(m[1] + '.js');
  const exports = [];
  const exportRx = /^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/gm;
  while ((m = exportRx.exec(src)) !== null) exports.push(m[1]);
  graph[f] = { imports: [...imports], exports, loc: src.split('\n').length };
}

// BFS atteignabilité depuis ENTRY
function reachableFrom(start) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur) || !graph[cur]) continue;
    seen.add(cur);
    for (const dep of graph[cur].imports) stack.push(dep);
  }
  return seen;
}

const liveSet = reachableFrom(ENTRY);
const scoringSet = reachableFrom(SCORING_HUB);

// Compte des imports entrants
const inbound = {};
for (const f of files) inbound[f] = 0;
for (const f of files) {
  for (const dep of graph[f].imports) {
    if (inbound[dep] !== undefined) inbound[dep]++;
  }
}

// Direct UI : importé directement par un hub UI
const directUI = new Set();
for (const hub of UI_HUBS) {
  if (graph[hub]) for (const dep of graph[hub].imports) directUI.add(dep);
}

const modules = files.map(f => {
  const live = liveSet.has(f);
  const inScoring = scoringSet.has(f) && f !== SCORING_HUB;
  const ui = directUI.has(f);
  let status;
  if (f === ENTRY) status = 'entry';
  else if (!live) status = 'dormant';
  else if (inScoring) status = 'live-scoring';
  else if (ui) status = 'live-ui';
  else status = 'live';
  return {
    module: f,
    loc: graph[f].loc,
    reachable: live,
    dormant: !live && f !== ENTRY,
    scoring: inScoring,
    ui,
    inbound: inbound[f],
    exports_count: graph[f].exports.length,
    exports: graph[f].exports,
    imports: graph[f].imports,
    status,
  };
});

const dormant = modules.filter(m => m.dormant);
const live = modules.filter(m => m.reachable);

const report = {
  mission_id: 'ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520',
  generated_at: new Date().toISOString(),
  generator: 'tools/architecture_live_map.mjs',
  entry_point: ENTRY,
  scoring_hub: SCORING_HUB,
  totals: {
    modules: files.length,
    total_loc: modules.reduce((s, m) => s + m.loc, 0),
    live: live.length,
    dormant: dormant.length,
    dormant_loc: dormant.reduce((s, m) => s + m.loc, 0),
  },
  modules: modules.sort((a, b) => b.loc - a.loc),
};

const outPath = path.resolve(import.meta.dirname, '..', 'audit', 'impact_map_runtime.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

// ──── Génération ARCHITECTURE_LIVE_MAP.md (reproductible) ────
// Colonnes mesurables statiquement : loc, branché, scoring, ui, inbound, status.
// falsifié : un module dormant ne PEUT PAS être falsifié (il ne tourne jamais)
//            → ❌ pour dormants ; "non-vérifié" pour les live (audit requis).
// validé_humain : ❌ partout — P0-MINI BET non exécuté (factuel).
const statusIcon = { 'entry': 'entrée', 'live-scoring': 'actif·scoring', 'live-ui': 'actif·UI', 'live': 'actif', 'dormant': 'DORMANT' };
const yn = b => b ? 'oui' : '—';
const mdRows = report.modules.map(m => {
  const falsifie = m.dormant ? 'non (mort)' : 'non-vérifié';
  return `| \`${m.module}\` | ${m.loc} | ${yn(m.reachable)} | ${yn(m.dormant)} | ${yn(m.scoring)} | ${yn(m.ui)} | ${m.inbound} | ${falsifie} | non | ${statusIcon[m.status]} |`;
}).join('\n');

const md = `# ARCHITECTURE_LIVE_MAP — Carte runtime des moteurs ZORAN Core

> **AUTO-GÉNÉRÉ** par \`tools/architecture_live_map.mjs\` — ne pas éditer à la main.
> Re-run le script pour rafraîchir. Toute divergence = signal de dérive.

- **mission_id** : ${report.mission_id}
- **généré le** : ${report.generated_at}
- **entry point** : \`${report.entry_point}\` (chargé par \`index.html\`)
- **hub scoring** : \`${report.scoring_hub}\`

## Synthèse

| Métrique | Valeur |
|---|---|
| Modules totaux | ${report.totals.modules} |
| LOC totales | ${report.totals.total_loc} |
| Modules branchés (atteignables depuis main.js) | ${report.totals.live} |
| Modules **dormants** (hors graphe) | **${report.totals.dormant}** |
| **LOC mortes** (dormantes) | **${report.totals.dormant_loc}** (${(report.totals.dormant_loc / report.totals.total_loc * 100).toFixed(1)}%) |

## Méthode

Analyse statique du graphe d'imports ES modules. Un module est **branché** s'il
est atteignable par BFS depuis \`${report.entry_point}\`. Il est **dormant** sinon
(code exporté que rien n'importe transitivement → mort runtime).

- \`scoring\` = atteignable depuis \`${report.scoring_hub}\` (participe au calcul de score)
- \`ui\` = importé directement par \`chat.js\` / \`panel.js\` / \`main.js\`
- \`inbound\` = nombre de modules qui importent ce module
- \`falsifié\` : un module dormant ne tourne jamais → **non falsifiable par construction**.
  Les modules actifs sont marqués \`non-vérifié\` (falsification empirique = audit à faire).
- \`validé_humain\` : **non** pour tous — P0-MINI BET externe non exécuté (factuel).

## Table des moteurs (triée par LOC)

| module | LOC | branché | dormant | scoring | UI | inbound | falsifié | validé humain | status |
|---|---|---|---|---|---|---|---|---|---|
${mdRows}

## Modules DORMANTS — dette runtime à trancher

${report.modules.filter(m => m.dormant).sort((a,b)=>b.loc-a.loc).map(m =>
  `- \`${m.module}\` — ${m.loc} LOC, inbound=${m.inbound} — **${m.exports_count} exports morts**`).join('\n')}

**Total : ${report.totals.dormant_loc} LOC de code mort.** Chaque module dormant exige
une décision explicite **KEEP / REMOVE / REBUILD** (voir \`V13_ADVERSARIAL_EXISTING_INVENTORY.md\`
pour le cluster adversarial). Un Core livré à Codex en septembre ne doit contenir
**aucun module zombie non décidé**.
`;

const mdPath = path.resolve(import.meta.dirname, '..', 'audit', 'ARCHITECTURE_LIVE_MAP.md');
fs.writeFileSync(mdPath, md);

// Affichage console
console.log('\n──── ARCHITECTURE LIVE MAP ────\n');
console.log(`Modules         : ${report.totals.modules}`);
console.log(`Total LOC       : ${report.totals.total_loc}`);
console.log(`Live (branchés) : ${report.totals.live}`);
console.log(`Dormants        : ${report.totals.dormant} (${report.totals.dormant_loc} LOC morts)`);
console.log('\nDORMANTS (exportés mais hors graphe atteignable depuis main.js) :');
dormant.sort((a, b) => b.loc - a.loc).forEach(m => {
  console.log(`  ✗ ${m.module.padEnd(34)} ${String(m.loc).padStart(4)} LOC  inbound=${m.inbound}`);
});
console.log('\n→ audit/impact_map_runtime.json écrit');
console.log('→ audit/ARCHITECTURE_LIVE_MAP.md écrit');
