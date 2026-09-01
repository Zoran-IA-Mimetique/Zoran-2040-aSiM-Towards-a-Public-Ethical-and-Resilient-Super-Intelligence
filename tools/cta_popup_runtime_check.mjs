// Runtime check spécifique : CTA inline cliquable + popup info-bulle.
// Injecte un faux résultat avec markers {cta:label|détail}, vérifie le rendu DOM,
// simule un click, vérifie le popup. Aucun appel API LLM.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'app');
const PORT = 8766;
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
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
  args: ['--ignore-certificate-errors', '--allow-insecure-localhost']
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => pageErrors.push(err.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 10000 });
// Wait a moment for app init then capture state diagnostics
await page.waitForTimeout(2500);
const bootDiag = await page.evaluate(() => ({
  hasState: !!window.state,
  hasGraph: !!window.state?.graph,
  graphNodes: window.state?.graph?.nodes?.length || 0,
  documentReady: document.readyState,
  bodyChildren: document.body.children.length,
  chatInputExists: !!document.getElementById('chat-input'),
}));
console.log('[boot] diagnostics:', JSON.stringify(bootDiag));
if (!bootDiag.hasGraph) {
  console.error('FAIL: window.state.graph never initialized after 2.5s');
  console.log('Console errors so far:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  ✗', e));
  console.log('Page errors so far:', pageErrors.length);
  pageErrors.forEach(e => console.log('  ✗', e));
  await browser.close();
  server.close();
  process.exit(1);
}

// Test 1 : rendu d'un texte avec markers {cta:label|détail}
const renderResult = await page.evaluate(async () => {
  const m = await import('./src/superiority_render.js');
  const text = 'Suspecter {cta:Étude G2 PRO | NF P 94-500 impose étude géotechnique de conception. Coût ≈3500€, délai 4-6 semaines.} sous 1 mois. Diagnostic confirmé par {cta:Jauges Saugnac | Pose tous les 50cm le long des fissures, lecture mensuelle pendant 6 mois.}.';
  const html = m.renderResponseWithCTAs(text, false);
  // Inject into a test container
  const div = document.createElement('div');
  div.id = 'cta-runtime-test';
  div.innerHTML = html;
  document.body.appendChild(div);
  const buttons = div.querySelectorAll('.zoran-inline-cta');
  return {
    htmlLength: html.length,
    buttonsCount: buttons.length,
    firstButtonLabel: buttons[0]?.textContent || null,
    firstButtonDetail: buttons[0]?.dataset.ctaDetail || null,
    firstButtonTitle: buttons[0]?.title || null,
    secondButtonLabel: buttons[1]?.textContent || null,
    secondButtonDetail: buttons[1]?.dataset.ctaDetail || null,
  };
});

// Test 2 : click sur le bouton ouvre-t-il un popup ?
// Le handler click est attaché dans wireChatBar — vérifions qu'il existe globalement
const clickWiring = await page.evaluate(() => {
  // Cherche un listener click global qui matche .zoran-inline-cta
  // Indirectement : simule un click et regarde si un overlay apparaît
  const btn = document.querySelector('#cta-runtime-test .zoran-inline-cta');
  if (!btn) return { found: false };
  btn.click();
  // Wait sync : check after microtask
  return new Promise(resolve => setTimeout(() => {
    const overlay = document.querySelector('.zoran-cta-popup-overlay');
    resolve({
      found: true,
      overlayPresent: !!overlay,
      popupLabel: overlay?.querySelector('.zoran-cta-popup-label')?.textContent || null,
      popupDetail: overlay?.querySelector('.zoran-cta-popup-detail')?.textContent || null,
      askButtonExists: !!overlay?.querySelector('.zoran-cta-popup-ask'),
    });
  }, 100));
});

// Test 3 : click "Poser cette question" remplit le chat input ?
const askWiring = await page.evaluate(() => {
  const input = document.getElementById('chat-input');
  const askBtn = document.querySelector('.zoran-cta-popup-ask');
  if (!input || !askBtn) return { found: false, inputExists: !!input, askExists: !!askBtn };
  const beforeValue = input.value;
  askBtn.click();
  return new Promise(resolve => setTimeout(() => {
    resolve({
      found: true,
      beforeValue,
      afterValue: input.value,
      overlayStillPresent: !!document.querySelector('.zoran-cta-popup-overlay'),
    });
  }, 100));
});

// Test 4 : CSS du bouton bien chargé (fond clair, coins arrondis)
const cssCheck = await page.evaluate(() => {
  const btn = document.querySelector('#cta-runtime-test .zoran-inline-cta');
  if (!btn) return { found: false };
  const cs = window.getComputedStyle(btn);
  return {
    found: true,
    background: cs.backgroundColor,
    borderRadius: cs.borderRadius,
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    cursor: cs.cursor,
  };
});

// Test 5 : baseline (Claude brut) — markers doivent rester bruts, PAS de boutons
const baselineCheck = await page.evaluate(async () => {
  const m = await import('./src/superiority_render.js');
  const text = 'Test {cta:Ceci ne doit PAS devenir bouton | détail} fin.';
  const html = m.renderResponseWithCTAs(text, true);
  const div = document.createElement('div');
  div.innerHTML = html;
  return {
    buttonsInBaseline: div.querySelectorAll('.zoran-inline-cta').length,
    rawTextPreserved: div.textContent.includes('{cta:'),
  };
});

// Test 6 : FALLBACK heuristique sur réponse ZORAN sans marker LLM
// Scénario réel : Sonnet a ignoré la consigne {cta:...}, on doit quand même
// voir des CTAs cliquables grâce au fallback côté JS.
const fallbackCheck = await page.evaluate(async () => {
  const m = await import('./src/superiority_render.js');
  const llmText = "Suspecter retrait-gonflement des argiles. Demander une étude géotechnique conforme à NF P 94-500 sous 1 mois. Vérifier l'évolution des fissures sur 6 mois. Confirmer le diagnostic par un bureau d'études structurel agréé.";
  const html = m.renderResponseWithCTAs(llmText, false);
  const div = document.createElement('div');
  div.innerHTML = html;
  const labels = [...div.querySelectorAll('.zoran-inline-cta')].map(b => b.textContent);
  return {
    markerCountInSource: (llmText.match(/\{cta:/g) || []).length,
    buttonsAfterFallback: labels.length,
    labels,
  };
});

// Test 7 : z-index — popup au-dessus de tout (settings modal etc.)
const zIndexCheck = await page.evaluate(() => {
  const overlay = document.querySelector('.zoran-cta-popup-overlay');
  const settings = document.getElementById('settings-modal');
  return {
    popupExists: !!overlay,
    settingsExists: !!settings,
    settingsZIndex: settings ? window.getComputedStyle(settings).zIndex : null,
    // Popup overlay may have been removed by askWiring earlier — re-create one for test
  };
});

await browser.close();
server.close();

// ─── REPORT ──────────────────────────────────────────────────────────
console.log('\n──── CTA POPUP RUNTIME CHECK ────\n');

console.log('Test 1 — Rendu markers {cta:label|détail} :');
console.log('  HTML length        :', renderResult.htmlLength);
console.log('  Buttons rendered   :', renderResult.buttonsCount, '(expected 2)');
console.log('  Button 1 label     :', JSON.stringify(renderResult.firstButtonLabel));
console.log('  Button 1 detail    :', JSON.stringify(renderResult.firstButtonDetail?.slice(0, 60) + '…'));
console.log('  Button 1 title     :', JSON.stringify(renderResult.firstButtonTitle));
console.log('  Button 2 label     :', JSON.stringify(renderResult.secondButtonLabel));

console.log('\nTest 2 — Click ouvre popup :');
console.log('  Button trouvé      :', clickWiring.found);
console.log('  Overlay présent    :', clickWiring.overlayPresent);
console.log('  Popup label        :', JSON.stringify(clickWiring.popupLabel));
console.log('  Popup detail (60c) :', JSON.stringify(clickWiring.popupDetail?.slice(0, 60) + '…'));
console.log('  "Poser cette ?" btn:', clickWiring.askButtonExists);

console.log('\nTest 3 — "Poser cette question" remplit input :');
console.log('  Before value       :', JSON.stringify(askWiring.beforeValue));
console.log('  After value        :', JSON.stringify(askWiring.afterValue));
console.log('  Overlay fermé      :', !askWiring.overlayStillPresent);

console.log('\nTest 4 — CSS bouton :');
console.log('  background         :', cssCheck.background);
console.log('  borderRadius       :', cssCheck.borderRadius);
console.log('  fontFamily         :', cssCheck.fontFamily?.slice(0, 60));
console.log('  fontSize           :', cssCheck.fontSize);
console.log('  cursor             :', cssCheck.cursor);

console.log('\nTest 5 — Baseline Claude brut (markers laissés bruts) :');
console.log('  Buttons (expected 0):', baselineCheck.buttonsInBaseline);
console.log('  Raw {cta: préservé :', baselineCheck.rawTextPreserved);

console.log('\nTest 6 — Fallback heuristique (LLM sans marker) :');
console.log('  Markers source LLM :', fallbackCheck.markerCountInSource, '(expected 0)');
console.log('  Buttons après fb   :', fallbackCheck.buttonsAfterFallback, '(expected ≥ 2)');
console.log('  Labels fallback    :', fallbackCheck.labels);

console.log('\nTest 7 — z-index popup vs autres modales :');
console.log('  Settings z-index   :', zIndexCheck.settingsZIndex, '(popup à 10000)');

console.log('\nConsole errors    :', consoleErrors.length);
if (consoleErrors.length) consoleErrors.forEach(e => console.log('  ✗', e));
console.log('Page errors       :', pageErrors.length);
if (pageErrors.length) pageErrors.forEach(e => console.log('  ✗', e));

// Verdict
const passed =
  renderResult.buttonsCount === 2 &&
  renderResult.firstButtonDetail?.length > 30 &&
  clickWiring.overlayPresent &&
  clickWiring.askButtonExists &&
  askWiring.afterValue?.length > 0 &&
  !askWiring.overlayStillPresent &&
  baselineCheck.buttonsInBaseline === 0 &&
  fallbackCheck.buttonsAfterFallback >= 2 &&
  consoleErrors.length === 0 &&
  pageErrors.length === 0;

console.log('\n━━━ VERDICT :', passed ? 'PASS ✓' : 'FAIL ✗', '━━━');
process.exit(passed ? 0 : 1);
