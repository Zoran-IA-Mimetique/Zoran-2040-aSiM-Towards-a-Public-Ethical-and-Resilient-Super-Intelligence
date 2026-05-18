// ZORAN_CTA_CLICKABLE_RUNTIME_V13 — Runtime check exhaustif.
// Vérifie : parsing typé V13, fallback legacy, priority engine cap 1+1+1,
// popup multi-niveau (head badges + table opérationnelle + accordion tech),
// métriques sessionStorage, démotion silencieuse des CTAs hors quota.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'app');
const PORT = 8767;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
  args: ['--ignore-certificate-errors', '--allow-insecure-localhost'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => pageErrors.push(err.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 10000 });
await page.waitForFunction(() => window.state && window.state.graph, { timeout: 8000 });
// Laisser wireChatBar finir d'attacher ses listeners (sinon les clics
// programmatiques peuvent partir avant que le handler document soit prêt).
await page.waitForTimeout(150);

// Test 1 : Render V13 avec 5 markers (4 candidats + 1 falsif) → priority engine garde 3
const t1 = await page.evaluate(async () => {
  const m = await import('./src/superiority_render.js');
  const text = [
    '{cta:terrain|label=Étude G2 PRO|crit=high|cout=3-5k€|delai=4-6 sem|preuve=Rapport opposable|risque=Refus décennale|detail=NF P 94-500 sondages 3-6m, Vbs Ip.}',
    '{cta:monitor|label=Jauges Saugnac|crit=medium|cout=300€|delai=6 mois|detail=Pose tous les 50cm, lecture mensuelle.}',
    '{cta:juridique|label=Déclaration assurance|crit=high|delai=5 jours|preuve=LRAR+photos|risque=Forclusion garantie Cat-Nat}',
    '{cta:falsif|label=Hypothèse fuite réseau|crit=medium|preuve=Fluorescéine|detail=Si fissures sous EU/EP, test 48h.}',
    '{cta:action|label=Option décorative|crit=low}',
  ].join(' Suspecter retrait-gonflement. ');
  const html = m.renderResponseWithCTAs(text, false);
  const div = document.createElement('div');
  div.id = 'v13-t1';
  div.innerHTML = html;
  document.body.appendChild(div);
  const btns = [...div.querySelectorAll('.zoran-inline-cta')];
  return {
    htmlLen: html.length,
    btnCount: btns.length,
    labels: btns.map(b => b.textContent.trim()),
    types: btns.map(b => [...b.classList].find(c => c.startsWith('cta-type-'))),
    slots: btns.map(b => [...b.classList].find(c => c.startsWith('cta-slot-'))),
    crits: btns.map(b => [...b.classList].find(c => c.startsWith('cta-crit-'))),
  };
});

// Test 2 : Click sur le CTA falsification (qui a detail rempli) → popup typé complet
const t2 = await page.evaluate(async () => {
  const btn = document.querySelector('#v13-t1 .zoran-inline-cta.cta-slot-falsification');
  if (!btn) return { found: false };
  btn.click();
  return new Promise(resolve => setTimeout(() => {
    const overlay = document.querySelector('.zoran-cta-popup-overlay');
    if (!overlay) return resolve({ found: true, overlay: false });
    const head = overlay.querySelector('.zoran-cta-popup-head');
    const typeBadge = overlay.querySelector('.zoran-cta-popup-type');
    const critBadge = overlay.querySelector('.zoran-cta-popup-crit');
    const slotBadge = overlay.querySelector('.zoran-cta-popup-slot');
    const table = overlay.querySelector('.zoran-cta-popup-table');
    const techDetails = overlay.querySelector('.zoran-cta-popup-tech');
    resolve({
      found: true,
      overlay: true,
      hasHead: !!head,
      typeBadge: typeBadge?.textContent,
      critBadge: critBadge?.textContent,
      slotBadge: slotBadge?.textContent,
      tableRows: table ? table.querySelectorAll('tr').length : 0,
      hasTech: !!techDetails,
      askExists: !!overlay.querySelector('.zoran-cta-popup-ask'),
    });
  }, 100));
});

// Test 3 : Métriques sessionStorage incrémentées par open
const t3 = await page.evaluate(async () => {
  const m = await import('./src/cta_metrics.js');
  const before = m.getMetrics();
  // Le test 2 a déjà ouvert un popup. Reading metrics after that open.
  return { opens: before.opens, ask_rate: before.ask_rate, by_type: before.by_type };
});

// Test 4 : Click "Poser cette question" → fill input + métrique asked
const t4 = await page.evaluate(async () => {
  const overlay = document.querySelector('.zoran-cta-popup-overlay');
  if (!overlay) return { found: false };
  const input = document.getElementById('chat-input');
  const askBtn = overlay.querySelector('.zoran-cta-popup-ask');
  askBtn.click();
  return new Promise(resolve => setTimeout(async () => {
    const m = await import('./src/cta_metrics.js');
    const metrics = m.getMetrics();
    resolve({
      found: true,
      inputValue: input.value,
      overlayGone: !document.querySelector('.zoran-cta-popup-overlay'),
      closes_asked: metrics.closes_asked,
    });
  }, 100));
});

// Test 5 : Fallback legacy {cta:label|détail} compatibilité
const t5 = await page.evaluate(async () => {
  const m = await import('./src/superiority_render.js');
  const text = 'Test {cta:Étude G5 | Détail riche legacy} fin.';
  const html = m.renderResponseWithCTAs(text, false);
  const div = document.createElement('div');
  div.innerHTML = html;
  const btn = div.querySelector('.zoran-inline-cta');
  return {
    rendered: !!btn,
    label: btn?.textContent.trim(),
    typeClass: btn ? [...btn.classList].find(c => c.startsWith('cta-type-')) : null,
  };
});

// Test 6 : Démotion silencieuse — 5 markers V13, 2 démotés en texte simple
const t6 = await page.evaluate(async () => {
  const div = document.querySelector('#v13-t1');
  const buttons = div.querySelectorAll('.zoran-inline-cta').length;
  const demotedLabels = ['Option décorative', 'Jauges Saugnac', 'Hypothèse fuite réseau', 'Étude G2 PRO', 'Déclaration assurance'];
  // Vérifie que les labels démotés apparaissent en texte brut dans le DOM
  const text = div.textContent;
  const allLabelsPresent = demotedLabels.filter(l => text.includes(l)).length;
  return { buttons, allLabelsPresent };
});

// Test 7 : Capture screenshot avec popup ouvert pour preuve visuelle
await page.evaluate(async () => {
  // Re-ouvre un popup pour le screenshot final
  const btn = document.querySelector('#v13-t1 .zoran-inline-cta.cta-slot-falsification');
  if (btn) btn.click();
});
await page.waitForTimeout(150);
const screenshotPath = path.resolve(import.meta.dirname, '..', 'audit', 'CTA_V13_POPUP_CAPTURE.png');
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
await page.screenshot({ path: screenshotPath, fullPage: false });

await browser.close();
server.close();

// ─── REPORT ──────────────────────────────────────────────────────────
console.log('\n──── CTA V13 RUNTIME CHECK ────\n');

console.log('Test 1 — Render V13 + priority engine cap 1+1+1 :');
console.log('  Buttons rendered  :', t1.btnCount, '(expected 3 — cap engine)');
console.log('  Labels kept       :', t1.labels);
console.log('  Types             :', t1.types);
console.log('  Slots             :', t1.slots);
console.log('  Crits             :', t1.crits);

console.log('\nTest 2 — Popup typé multi-niveau :');
console.log('  Overlay present   :', t2.overlay);
console.log('  Head with badges  :', t2.hasHead);
console.log('  Type badge        :', t2.typeBadge);
console.log('  Crit badge        :', t2.critBadge);
console.log('  Slot badge        :', t2.slotBadge);
console.log('  Operational rows  :', t2.tableRows, '(expected ≥ 1)');
console.log('  Tech accordion    :', t2.hasTech);
console.log('  Ask button        :', t2.askExists);

console.log('\nTest 3 — Métriques sessionStorage :');
console.log('  Opens             :', t3.opens, '(expected ≥ 1)');
console.log('  By type           :', JSON.stringify(t3.by_type));

console.log('\nTest 4 — "Poser cette question" :');
console.log('  Input value       :', JSON.stringify(t4.inputValue));
console.log('  Overlay closed    :', t4.overlayGone);
console.log('  Closes asked      :', t4.closes_asked, '(expected ≥ 1)');

console.log('\nTest 5 — Compat legacy {cta:label|détail} :');
console.log('  Rendered          :', t5.rendered);
console.log('  Label             :', t5.label);
console.log('  Type fallback     :', t5.typeClass, '(expected cta-type-action)');

console.log('\nTest 6 — Démotion silencieuse hors quota :');
console.log('  Buttons (kept)    :', t6.buttons, '(expected 3)');
console.log('  All labels present:', t6.allLabelsPresent, '/ 5 (texte démoté préservé)');

console.log('\nTest 7 — Screenshot capture :');
console.log('  Saved →', path.relative(process.cwd(), screenshotPath));

console.log('\nConsole errors    :', consoleErrors.length);
if (consoleErrors.length) consoleErrors.forEach(e => console.log('  ✗', e));
console.log('Page errors       :', pageErrors.length);
if (pageErrors.length) pageErrors.forEach(e => console.log('  ✗', e));

const passed =
  t1.btnCount === 3 &&
  t1.slots.includes('cta-slot-principal') &&
  t1.slots.includes('cta-slot-falsification') &&
  t2.overlay && t2.hasHead && t2.tableRows >= 1 && t2.hasTech && t2.askExists &&
  t3.opens >= 1 &&
  t4.inputValue && t4.inputValue.length > 0 && t4.overlayGone && t4.closes_asked >= 1 &&
  t5.rendered && t5.typeClass === 'cta-type-action' &&
  t6.buttons === 3 && t6.allLabelsPresent === 5 &&
  consoleErrors.length === 0 && pageErrors.length === 0;

console.log('\n━━━ VERDICT V13 :', passed ? 'PASS ✓' : 'FAIL ✗', '━━━');
process.exit(passed ? 0 : 1);
