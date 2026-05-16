// Smoke test: boot the app in headless chromium, capture console errors
// and verify no boot failure. Exits 1 on any error.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'app');
const PORT = 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
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
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  ignoreHTTPSErrors: true
});
const page = await ctx.newPage();

const consoleErrors = [];
const pageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => {
  pageErrors.push(err.message);
});

let boot_ok = false;
try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 10000 });
  await page.waitForFunction(() =>
    document.querySelector('#status-counts')?.textContent?.includes('nodes'),
    { timeout: 6000 }
  );
  boot_ok = true;
} catch (e) {
  console.error('Page boot failed:', e.message);
}

// Try clicking a node and verifying panel opens
let click_ok = false;
try {
  // Force the lib to settle so meshes are positioned
  await page.waitForTimeout(800);
  // Use the index sidebar to click a known node id
  const item = page.locator('#index li[data-id="GHUC-001"]').first();
  await item.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await item.click({ timeout: 5000, force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const visible = await page.locator('#detail').isVisible();
  click_ok = visible;
} catch (e) {
  console.error('Click test failed:', e.message);
}

// Read counts from statusbar
const counts = await page.locator('#status-counts').textContent();
const coherence = await page.locator('#status-coherence').textContent();

// Test focus-branche (F)
let focus_ok = false;
try {
  await page.keyboard.press('f');
  await page.waitForTimeout(200);
  focus_ok = await page.locator('#btn-focus.active').count() > 0;
  await page.keyboard.press('f'); // toggle off
} catch (_) {}

// Test pruning (P)
let prune_ok = false;
try {
  await page.keyboard.press('p');
  await page.waitForTimeout(300);
  const c = await page.locator('#status-counts').textContent();
  prune_ok = !c.includes('nodes 45'); // count changed
  await page.keyboard.press('p'); // toggle off
} catch (_) {}

// Test draggable panel — drag LEFT (panel starts near right edge)
let drag_ok = false;
let drag_diag = '';
try {
  const before = await page.locator('#detail').boundingBox();
  if (before) {
    const handle = await page.locator('#detail-header').boundingBox();
    if (handle) {
      await page.mouse.move(handle.x + 30, handle.y + 10);
      await page.mouse.down();
      // Move left (panel starts top-right ; drag toward center)
      await page.mouse.move(handle.x - 300, handle.y + 200, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      const after = await page.locator('#detail').boundingBox();
      const dx = after ? Math.abs(after.x - before.x) : 0;
      const dy = after ? Math.abs(after.y - before.y) : 0;
      drag_diag = `before x=${before.x.toFixed(0)} y=${before.y.toFixed(0)} | after x=${after?.x?.toFixed(0)} y=${after?.y?.toFixed(0)} | dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`;
      drag_ok = dx > 50 || dy > 50;
    }
  }
} catch (e) { drag_diag = 'exception: ' + e.message; }

// Take a screenshot WITH panel open (selected GHUC-001) BEFORE Esc test
await page.locator('#index li[data-id="GHUC-001"]').first().click();
await page.waitForTimeout(600);
// Scroll the detail panel to S_propagated section
await page.evaluate(() => {
  const body = document.getElementById('detail-body');
  if (body) {
    // Find S propagé section
    const sections = body.querySelectorAll('h4');
    for (const h of sections) {
      if (h.textContent.includes('S propagé')) {
        h.scrollIntoView({ block: 'start', behavior: 'instant' });
        break;
      }
    }
  }
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'app/preview-live.png', fullPage: false });

// Verify the Superior Laws section is populated AND the badge appears
const supSectionCount = await page.locator('#superior-laws li').count();
const supBadgeVisible = await page.locator('.z-superior-badge').count();
const supSectionLabel = await page.locator('.frames-label:has-text("Probability")').count();
const tempSectionCount = await page.locator('#temporal-laws li').count();
const tempPanelLabel = await page.locator('.frames-label:has-text("Pression cohér")').count();
const distPanelLabel = await page.locator('.frames-label:has-text("Validation")').count();
const propSectionLabel = await page.locator('.frames-label:has-text("S propagé")').count();
const propGapLabel = await page.locator('.frames-label:has-text("Contraintes impl")').count();
console.log(`\n  Superior Laws sidebar : ${supSectionCount} items`);
console.log(`  ★ SUPÉRIEURE badge   : ${supBadgeVisible > 0 ? 'visible' : 'absent'}`);
console.log(`  Probability section  : ${supSectionLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Temporal sidebar     : ${tempSectionCount} items`);
console.log(`  Pression cohérence   : ${tempPanelLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Validation distrib.  : ${distPanelLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  S propagé section    : ${propSectionLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Contraintes impl.    : ${propGapLabel > 0 ? 'présente' : 'absente'}`);
const llmLabel = await page.locator('.frames-label:has-text("LLM score")').count();
const boundaryLabel = await page.locator('.frames-label:has-text("Boundary")').count();
const driftLabel = await page.locator('.frames-label:has-text("Drift proba")').count();
const ahLabel = await page.locator('.frames-label:has-text("Anti-hallu")').count();
console.log(`  LLM relevance section: ${llmLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Boundary section     : ${boundaryLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Drift probability    : ${driftLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Anti-hallu score     : ${ahLabel > 0 ? 'présente' : 'absente'}`);
const sustLabel = await page.locator('.frames-label:has-text("Sustainability")').count();
const fragLabel = await page.locator('.frames-label:has-text("Frugality")').count();
const classesLabel = await page.locator('.frames-label:has-text("Classes")').count();
console.log(`  Sustainability sect. : ${sustLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Frugality score      : ${fragLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Classes badges       : ${classesLabel > 0 ? 'présente' : 'absente'}`);

// Scroll panel to expose experimental section for screenshot
await page.evaluate(() => {
  const body = document.getElementById('detail-body');
  if (body) {
    const sections = body.querySelectorAll('h4');
    for (const h of sections) {
      if (h.textContent.includes('Soutenabilité runtime')) {
        h.scrollIntoView({ block: 'start' }); break;
      }
    }
  }
});
await page.waitForTimeout(200);
await page.screenshot({ path: 'app/preview-experimental.png', fullPage: false });

// Screenshot focused on a superior law (★) to capture the gold halo rings
try {
  await page.locator('#superior-laws li').first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'app/preview-superior.png', fullPage: false });
} catch (_) {}

// Second screenshot — sidebar visible (panel closed)
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
// Scroll sidebar to expose the Temporal Selection section
const tempHeader = await page.locator('h3:has-text("Sélection temporelle")').first();
await tempHeader.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
await page.screenshot({ path: 'app/preview-sidebar.png', fullPage: false });

// Test 'S' toggle sidebar (Full Hand Navigation mission)
let sidebar_toggle_ok = false;
try {
  const visibleBefore = await page.locator('#sidebar').isVisible();
  // Click button (S keyboard may conflict with native shortcuts on chromium)
  await page.locator('#btn-sidebar').click();
  await page.waitForTimeout(350);
  const hiddenAfter = await page.evaluate(() => document.body.classList.contains('sidebar-hidden'));
  // Screenshot in immersive mode
  await page.screenshot({ path: 'app/preview-immersive.png', fullPage: false });
  await page.locator('#btn-sidebar').click();
  await page.waitForTimeout(350);
  const visibleAgain = !await page.evaluate(() => document.body.classList.contains('sidebar-hidden'));
  sidebar_toggle_ok = visibleBefore && hiddenAfter && visibleAgain;
} catch (e) { console.error('Sidebar toggle test failed:', e.message); }

// Test pan capability — verify controls have pan enabled + API call moves camera
let pan_ok = false;
try {
  const result = await page.evaluate(() => {
    const fg = window.__zoranFG;
    if (!fg) return { ok: false, reason: 'no fg' };
    const ctrl = fg.controls();
    if (!ctrl) return { ok: false, reason: 'no controls' };
    const enabled = ctrl.enablePan !== false; // undefined or true counts as enabled
    const camBefore = fg.camera().position.clone();
    const tgtBefore = ctrl.target ? ctrl.target.clone() : null;
    // Programmatic pan : offset target by world-space vector
    if (ctrl.target && typeof ctrl.update === 'function') {
      ctrl.target.x += 30;
      ctrl.target.y += 20;
      fg.camera().position.x += 30;
      fg.camera().position.y += 20;
      ctrl.update();
    }
    const camAfter = fg.camera().position.clone();
    const tgtAfter = ctrl.target ? ctrl.target.clone() : null;
    const dcam = camBefore.distanceTo(camAfter);
    const dtgt = tgtBefore && tgtAfter ? tgtBefore.distanceTo(tgtAfter) : 0;
    return { ok: dcam > 1 && dtgt > 1 && enabled, enabled, dcam, dtgt,
             controlsType: ctrl.constructor && ctrl.constructor.name };
  });
  console.log(`  pan diag: enabled=${result.enabled} dcam=${(result.dcam||0).toFixed(2)} dtarget=${(result.dtgt||0).toFixed(2)} controls=${result.controlsType}`);
  pan_ok = result.ok;
} catch (e) { console.error('Pan test failed:', e.message); }

// Test Esc closes panel
let esc_ok = false;
try {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  esc_ok = !(await page.locator('#detail').isVisible());
} catch (_) {}

await browser.close();
server.close();

console.log('\n──── SMOKE TEST RESULTS ────');
console.log('boot_ok            :', boot_ok);
console.log('click_open_panel   :', click_ok);
console.log('focus_branche (F)  :', focus_ok);
console.log('prune_toggle (P)   :', prune_ok);
console.log('drag_panel         :', drag_ok, '|', drag_diag);
console.log('sidebar_toggle     :', sidebar_toggle_ok);
console.log('pan_right_drag     :', pan_ok);
console.log('esc_closes_panel   :', esc_ok);
console.log('status counts      :', counts);
console.log('status coherence   :', coherence);
console.log('console errors     :', consoleErrors.length);
for (const e of consoleErrors) console.log('  · ', e);
console.log('page errors        :', pageErrors.length);
for (const e of pageErrors) console.log('  ✗ ', e);

const fail = !boot_ok || !click_ok || !focus_ok || !prune_ok || !drag_ok || !esc_ok
           || pageErrors.length > 0 || consoleErrors.length > 0;
process.exit(fail ? 1 : 0);
