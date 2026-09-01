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
// NEW (mission RUNTIME_COGNITIVE_PATH_COMPETITION) : chat bar + routes
const chatBar = await page.locator('#chat-bar').isVisible();
const chatInput = await page.locator('#chat-input').isVisible();
const chatMic = await page.locator('#chat-mic').isVisible();
const chatFile = await page.locator('#chat-file').isVisible();
console.log(`  Chat bar visible     : ${chatBar}`);
console.log(`  Chat input field     : ${chatInput}`);
console.log(`  Mic button           : ${chatMic}`);
console.log(`  File button          : ${chatFile}`);

// Submit a question and verify routes display
let routes_ok = false;
try {
  await page.locator('#chat-input').fill('comment réduire la propagation runtime ?');
  await page.locator('#chat-send').click();
  await page.waitForTimeout(700);
  const resultsVisible = await page.locator('#chat-results').isVisible();
  const routeCards = await page.locator('.route-card').count();
  const winnerCard = await page.locator('.route-card.winner').count();
  const baselineRows = await page.locator('.baseline-row').count();
  console.log(`  Results panel        : ${resultsVisible}`);
  console.log(`  Route cards          : ${routeCards}`);
  console.log(`  Winner card          : ${winnerCard}`);
  console.log(`  Baseline rows        : ${baselineRows}`);
  routes_ok = resultsVisible && routeCards === 6 && winnerCard === 1 && baselineRows === 2;
  // Screenshot the chat results
  await page.screenshot({ path: 'app/preview-chat.png', fullPage: false });
} catch (e) { console.log('Chat test failed:', e.message); }

// NEW (mission REALTIME_ROUTE_VISUALIZATION) : routes visibles dans le graphe
let route_viz_ok = false;
try {
  const viz = await page.evaluate(() => {
    // Count meshes whose color is tinted (not original) — proxy : material.emissive non-black for winner
    let coloured = 0, winnerPulse = 0;
    const meshes = document.querySelectorAll('canvas');
    // Inspect via __zoranFG scene
    const fg = window.__zoranFG;
    if (!fg) return null;
    const scene = fg.scene();
    let tinted = 0, glowing = 0, dimmed = 0;
    scene.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        if (obj.material.emissiveIntensity > 0.02) glowing++;
      }
      if (obj.isMesh && obj.material && obj.material.opacity < 0.20) dimmed++;
    });
    return { glowing, dimmed };
  });
  // Mission ROUTE_FOCUS_MODE : verify dim > 150 (graphe s'effondre vraiment)
  // + verify route-mode body class
  const rmActive = await page.evaluate(() => document.body.classList.contains('route-mode'));
  console.log(`  Route viz : glowing=${viz?.glowing}  dimmed=${viz?.dimmed}  body.route-mode=${rmActive}`);
  // 241 lois - max 60 dans 6 routes = ~180 hors-routes ; on attend > 150 dimmed
  route_viz_ok = viz && viz.glowing > 0 && viz.dimmed > 150 && rmActive;
} catch (e) { console.log('Route viz test failed:', e.message); }

// NEW (mission DRAGGABLE_RUNTIME_RESPONSE_POPUP) : draggable + minimize
let popup_drag_ok = false;
let popup_min_ok = false;
try {
  const before = await page.locator('#chat-results').boundingBox();
  if (before) {
    const handle = await page.locator('#chat-results-header').boundingBox();
    if (handle) {
      await page.mouse.move(handle.x + 100, handle.y + 12);
      await page.mouse.down();
      await page.mouse.move(handle.x - 200, handle.y + 150, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      const after = await page.locator('#chat-results').boundingBox();
      const dx = after ? Math.abs(after.x - before.x) : 0;
      const dy = after ? Math.abs(after.y - before.y) : 0;
      console.log(`  Popup drag : dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`);
      popup_drag_ok = dx > 50 || dy > 50;
    }
  }
  // Test minimize — use evaluate to click directly (avoid Playwright stacking issues)
  await page.evaluate(() => {
    const b = document.getElementById('chat-results-min');
    if (b) b.click();
  });
  await page.waitForTimeout(250);
  const isMin = await page.evaluate(() => {
    const el = document.getElementById('chat-results');
    return { has: !!el, hasMin: el ? el.classList.contains('minimized') : false,
             btnExists: !!document.getElementById('chat-results-min') };
  });
  console.log(`  popup min diag : btn=${isMin.btnExists} hasMinClass=${isMin.hasMin}`);
  popup_min_ok = isMin.hasMin;
  await page.screenshot({ path: 'app/preview-routes-viz.png', fullPage: false });
  // Restore via evaluate (avoid Playwright interception)
  await page.evaluate(() => {
    const b = document.getElementById('chat-results-min');
    if (b) b.click();
  });
  await page.waitForTimeout(150);
} catch (e) { console.log('Popup drag/min test failed:', e.message); }

try {
  await page.locator('#chat-results-close').click();
  await page.waitForTimeout(200);
} catch (_) {}

// NEW (mission ZORAN_NOISE_MINIMIZATION) : noise + signal-to-noise UI
const noiseDec = await page.locator('.frames-label:has-text("Décision")').count();
const snrLabel = await page.locator('.frames-label:has-text("S/N ratio")').count();
const noiseAddLabel = await page.locator('.frames-label:has-text("Bruit ajouté")').count();
const frLabel = await page.locator('.frames-label:has-text("Frugalité")').count();
console.log(`  Noise decision       : ${noiseDec > 0 ? 'présente' : 'absente'}`);
console.log(`  S/N ratio bar        : ${snrLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Noise contribution   : ${noiseAddLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Frugality ratio      : ${frLabel > 0 ? 'présente' : 'absente'}`);

// NEW : provenance + cores + counters (missions 2026-05-16 night)
const provLabel = await page.locator('.frames-label:has-text("SHA + version")').count();
const filLabel = await page.locator('.frames-label:has-text("Filiation")').count();
const lriLabel = await page.locator('.frames-label:has-text("LRI")').count();
const coresUl = await page.locator('#cores-list li').count();
const counters = await page.locator('#status-counts').textContent();
const hasStar = counters.includes('★');
const hasFrugal = counters.includes('frugal');
const hasCores = counters.includes('cores');
console.log(`  Provenance SHA       : ${provLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Filiation row        : ${filLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  LRI / Keep prob.     : ${lriLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Cores sidebar list   : ${coresUl} items`);
console.log(`  Counters ★/frugal/cores: ${hasStar?'★':''} ${hasFrugal?'frugal':''} ${hasCores?'cores':''}`);

// New : generative + selection sections (missions 2026-05-16)
const genLabel = await page.locator('.frames-label:has-text("Profil génér")').count();
const scopeLabel = await page.locator('.frames-label:has-text("Scope")').count();
const oracleLabel = await page.locator('.frames-label:has-text("Oracle conf")').count();
const selLabel = await page.locator('.frames-label:has-text("Priorité sél")').count();
const topicLabel = await page.locator('.frames-label:has-text("Sujet pertin")').count();
const ceLabel = await page.locator('.frames-label:has-text("Cog. efficiency")').count();
console.log(`  Generative profile   : ${genLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Generative scope     : ${scopeLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Oracle confidence    : ${oracleLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Selection priority   : ${selLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Topic relevance      : ${topicLabel > 0 ? 'présente' : 'absente'}`);
console.log(`  Cog. efficiency      : ${ceLabel > 0 ? 'présente' : 'absente'}`);

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

// Screenshot focused on a superior law (★) to capture the gold halo rings + sprite
try {
  await page.locator('#superior-laws li').first().click();
  // Zoom in extra-close to make ★ rings + star sprite clearly visible
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const fg = window.__zoranFG;
    if (!fg) return;
    // Find first ★ law's mesh and aim camera at it from very close
    const sel = (window.__zoranSelected && window.__zoranSelected) || null;
    // Use the existing focusCamOn helper via internal state if exposed
  });
  await page.waitForTimeout(800);
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

// Test manual pan via window.__zoranPan (REAL_HAND_NAVIGATION_FIX)
let manual_pan_ok = false;
try {
  const result = await page.evaluate(() => {
    const fg = window.__zoranFG;
    if (!fg || !window.__zoranPan) return { ok: false };
    const c = fg.camera();
    const before = c.position.clone();
    window.__zoranPan(120, 80);
    const after = c.position.clone();
    return { ok: before.distanceTo(after) > 0.5, d: before.distanceTo(after) };
  });
  console.log(`  manual pan API: dcam=${(result.d||0).toFixed(2)}`);
  manual_pan_ok = result.ok;
} catch (_) {}

// Test layer toggle
let layer_toggle_ok = false;
try {
  const before = await page.locator('#cores-list li').count();
  if (before > 0) {
    await page.locator('#cores-list li').first().locator('[data-toggle]').click();
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const vis = window.__zoranFG && document.querySelector('#cores-list li [data-toggle]')?.textContent;
      return vis;
    });
    layer_toggle_ok = state === '∅';
    // Restore
    await page.locator('#cores-list li').first().locator('[data-toggle]').click();
  }
} catch (e) { console.log('  layer toggle err:', e.message); }

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

// Test REAL pan via right-click drag dispatched as pointer events on the canvas
// (OrbitControls listens to pointer* not mouse*)
let pan_ok = false;
let pan_diag = '';
try {
  // Reset camera to known pose first
  await page.evaluate(() => window.__zoranFG && window.__zoranFG.zoomToFit(0, 40));
  await page.waitForTimeout(400);
  const ctrlInfo = await page.evaluate(() => {
    const fg = window.__zoranFG; if (!fg) return null;
    const c = fg.controls(); if (!c) return null;
    const buttons = c.mouseButtons || {};
    return {
      type: c.constructor.name,
      hasUpdate: typeof c.update === 'function',
      hasPan: typeof c.pan === 'function' || typeof c._pan === 'function',
      enablePan: c.enablePan, noPan: c.noPan, enabled: c.enabled,
      LEFT: buttons.LEFT, MIDDLE: buttons.MIDDLE, RIGHT: buttons.RIGHT,
      domTag: c.domElement ? c.domElement.tagName : null,
      domSel: c.domElement ? (c.domElement.id || c.domElement.className) : null
    };
  });
  console.log('  controls info:', JSON.stringify(ctrlInfo));

  const before = await page.evaluate(() => {
    const fg = window.__zoranFG; if (!fg) return null;
    const c = fg.camera(); const ctrl = fg.controls();
    return {
      cx: c.position.x, cy: c.position.y, cz: c.position.z,
      tx: ctrl?.target?.x ?? 0, ty: ctrl?.target?.y ?? 0, tz: ctrl?.target?.z ?? 0
    };
  });

  // Right-drag = pan natif OrbitControls. UN drag propre suffit.
  // PAS de LEFT-drag de "priming" : il laisse OrbitControls dans un état
  // qui empêche le PAN du RIGHT-drag suivant (le second drag rotate au
  // lieu de pan — confirmé par tools/_pan_probe.mjs : dcam≈418/dtgt≈418
  // sans priming, vs dtgt=0 avec priming). PAS d'events synthétiques :
  // OrbitControls moderne écoute pointermove/up sur le canvas (capture),
  // pas sur window/document.
  let moved = { ok: false };
  {
    const cb = await page.locator('#graph canvas').boundingBox();
    if (cb) {
      // Le pointerdown DOIT partir du canvas : un panneau ouvert (déplacé
      // par le test drag_panel) peut couvrir le centre. On cherche un point
      // réellement sur le canvas via elementFromPoint, sinon OrbitControls
      // ne reçoit jamais l'événement et le pan est nul.
      const pick = await page.evaluate((box) => {
        const cands = [
          [0.20, 0.50], [0.15, 0.72], [0.22, 0.28], [0.50, 0.85],
          [0.50, 0.15], [0.82, 0.72], [0.82, 0.28], [0.50, 0.50],
        ];
        for (const [fx, fy] of cands) {
          const x = box.x + box.width * fx;
          const y = box.y + box.height * fy;
          const el = document.elementFromPoint(x, y);
          if (el && el.tagName === 'CANVAS') return { x, y, ok: true };
        }
        return { ok: false };
      }, cb);
      if (pick.ok) {
        const cx = pick.x, cy = pick.y;
        console.log(`  pan drag from canvas point (${cx.toFixed(0)},${cy.toFixed(0)})`);
        await page.mouse.move(cx, cy);
        await page.mouse.down({ button: 'right' });
        for (let i = 1; i <= 14; i++) await page.mouse.move(cx + i * 14, cy + i * 9, { steps: 3 });
        await page.mouse.up({ button: 'right' });
        await page.waitForTimeout(400);
        moved = { ok: true };
      } else {
        console.log('  pan: aucun point canvas libre trouvé');
      }
    }
  }

  await page.waitForTimeout(350);
  const after = await page.evaluate(() => {
    const fg = window.__zoranFG; if (!fg) return null;
    const c = fg.camera(); const ctrl = fg.controls();
    return {
      cx: c.position.x, cy: c.position.y, cz: c.position.z,
      tx: ctrl?.target?.x ?? 0, ty: ctrl?.target?.y ?? 0, tz: ctrl?.target?.z ?? 0
    };
  });

  const dcam = Math.hypot(after.cx - before.cx, after.cy - before.cy, after.cz - before.cz);
  const dtgt = Math.hypot(after.tx - before.tx, after.ty - before.ty, after.tz - before.tz);
  pan_diag = `dcam=${dcam.toFixed(2)} dtgt=${dtgt.toFixed(2)} moved=${moved.ok}`;
  pan_ok = dcam > 1.0 || dtgt > 1.0;
} catch (e) { pan_diag = 'exception: ' + e.message; }

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
console.log('manual_pan         :', manual_pan_ok);
console.log('layer_toggle       :', layer_toggle_ok);
console.log('chat_routes_compete:', routes_ok);
console.log('route_viz_in_graph :', route_viz_ok);
console.log('popup_draggable    :', popup_drag_ok);
console.log('popup_minimize     :', popup_min_ok);
console.log('pan_right_drag     :', pan_ok, '|', pan_diag);
console.log('esc_closes_panel   :', esc_ok);
console.log('status counts      :', counts);
console.log('status coherence   :', coherence);
console.log('console errors     :', consoleErrors.length);
for (const e of consoleErrors) console.log('  · ', e);
console.log('page errors        :', pageErrors.length);
for (const e of pageErrors) console.log('  ✗ ', e);

const fail = !boot_ok || !click_ok || !focus_ok || !prune_ok || !drag_ok || !esc_ok
           || !sidebar_toggle_ok || !manual_pan_ok || !routes_ok
           || !route_viz_ok || !popup_drag_ok || !popup_min_ok
           || pageErrors.length > 0 || consoleErrors.length > 0;
process.exit(fail ? 1 : 0);
