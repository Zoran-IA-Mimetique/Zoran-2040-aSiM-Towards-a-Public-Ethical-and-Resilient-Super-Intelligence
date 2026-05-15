import { loadLaws, buildGraph, neighborsOf, prune } from './graph.js';
import { renderDetail } from './panel.js';
import { buildIndex, search } from './search.js';
import { makeHistory } from './history.js';
import { auditGraph, formatReport } from './oracle.js';

const $ = sel => document.querySelector(sel);

const state = {
  dataset: null,
  graph: null,
  graphView: null,
  fg: null,
  index: null,
  history: makeHistory(),
  pruning: false,
  highlightNodes: new Set(),
  highlightLinks: new Set(),
  selected: null
};

const MISSION = 'ZORAN_FRACTAL_LAW_TREE_OMEGA_20260515';

function setStatus() {
  $('#status-mission').textContent = `MISSION ${MISSION}`;
  const n = state.graphView.nodes.length;
  const l = state.graphView.links.length;
  const fam = state.graphView.families?.length ?? 0;
  $('#status-counts').textContent = `nodes ${n} · links ${l} · families ${fam}`;
  const slocal = avg(state.graphView.nodes.map(n => n.S_local ?? 0));
  const sglobal = avg(state.graphView.nodes.map(n => n.S_global ?? 0));
  $('#status-coherence').textContent =
    `S_local=${slocal.toFixed(2)} · S_global=${sglobal.toFixed(2)} · gap=${(slocal - sglobal).toFixed(2)}`;
}

function avg(a) { return a.length ? a.reduce((x,y)=>x+y,0) / a.length : 0; }

function buildSidebar() {
  const famUl = $('#families');
  famUl.innerHTML = '';
  for (const f of state.graph.families) {
    const li = document.createElement('li');
    li.dataset.family = f.id;
    li.innerHTML = `<span class="swatch" style="background:${familyColor(f.id)}"></span>${f.id} — <span style="color:var(--fg-2)">${f.label.split('—')[0].trim()}</span>`;
    li.title = f.label;
    li.addEventListener('click', () => focusFamily(f.id));
    famUl.appendChild(li);
  }

  const idxUl = $('#index');
  idxUl.innerHTML = '';
  const sorted = [...state.graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const n of sorted) {
    const li = document.createElement('li');
    li.dataset.id = n.id;
    li.innerHTML = `<span class="swatch" style="background:${n.color}"></span>${n.id} <span style="color:var(--fg-2)">${escapeShort(n.title)}</span>`;
    li.title = n.title;
    li.addEventListener('click', () => selectNode(n.id, true));
    idxUl.appendChild(li);
  }
}

function familyColor(family) {
  const map = {
    ULG:'#4ea3ff', DVE:'#3ad17a', UDE:'#ffcc4d', GHUC:'#b86bff',
    WP11:'#5ad1c4', WP12:'#5a8cff', SDE:'#ff8a4e', PAL:'#b86bff',
    VAR:'#3ad17a', ISO:'#ffcc4d'
  };
  return map[family] || '#888';
}

function escapeShort(s) {
  const t = String(s);
  return t.length > 32 ? t.slice(0, 30) + '…' : t;
}

function selectNode(id, focus) {
  const node = state.graphView.nodes.find(n => n.id === id);
  if (!node) return;
  state.selected = node;
  state.history.push(id);
  updateHistoryButtons();
  computeHighlight(node);
  if (focus && state.fg) {
    const dist = 140;
    const dx = node.x || 0, dy = node.y || 0, dz = node.z || 1;
    const r = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    state.fg.cameraPosition(
      { x: dx * (dist + r)/r, y: dy * (dist + r)/r, z: dz * (dist + r)/r },
      node, 800
    );
  }
  renderDetail(node, pickId => selectNode(pickId, true));
  document.querySelectorAll('#index li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id);
  });
  if (state.fg) state.fg.refresh();
}

function computeHighlight(node) {
  state.highlightNodes = new Set([node.id]);
  state.highlightLinks = new Set();
  const neighbors = neighborsOf(state.graphView, node.id);
  neighbors.forEach(id => state.highlightNodes.add(id));
  for (const l of state.graphView.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === node.id || t === node.id) state.highlightLinks.add(l);
  }
}

function focusFamily(familyId) {
  document.querySelectorAll('#families li').forEach(li => {
    li.classList.toggle('active', li.dataset.family === familyId);
  });
  const targets = state.graphView.nodes.filter(n => n.family === familyId);
  if (!targets.length) return;
  let cx = 0, cy = 0, cz = 0;
  for (const t of targets) { cx += t.x || 0; cy += t.y || 0; cz += t.z || 0; }
  cx /= targets.length; cy /= targets.length; cz /= targets.length;
  const r = Math.sqrt(cx*cx + cy*cy + cz*cz) || 1;
  const d = 300;
  state.fg.cameraPosition({ x: cx + d*cx/r, y: cy + d*cy/r, z: cz + d*cz/r }, { x: cx, y: cy, z: cz }, 1000);
}

function updateHistoryButtons() {
  $('#btn-back').disabled = !state.history.canBack();
  $('#btn-forward').disabled = !state.history.canForward();
}

function initGraph() {
  state.graphView = state.graph;
  const el = document.getElementById('graph');

  state.fg = ForceGraph3D()(el)
    .backgroundColor('rgba(0,0,0,0)')
    .graphData(state.graphView)
    .nodeId('id')
    .nodeLabel(n => `${n.id} · ${n.title}`)
    .nodeColor(n => {
      if (state.highlightNodes.size === 0) return n.color;
      return state.highlightNodes.has(n.id) ? n.color : 'rgba(120,130,150,0.25)';
    })
    .nodeVal(n => 2 + (n.weight ?? 0.5) * 10)
    .nodeOpacity(0.92)
    .nodeResolution(16)
    .linkColor(l => {
      if (state.highlightLinks.size === 0) return l.color;
      return state.highlightLinks.has(l) ? '#ffcc4d' : 'rgba(120,130,150,0.06)';
    })
    .linkWidth(l => (state.highlightLinks.has(l) ? 1.6 : 0.4))
    .linkDirectionalParticles(l => (l.kind === 'parent' ? 1 : 0))
    .linkDirectionalParticleSpeed(0.004)
    .linkDirectionalParticleWidth(1.2)
    .linkOpacity(0.6)
    .enableNodeDrag(true)
    .onNodeClick(n => selectNode(n.id, true))
    .onBackgroundClick(() => {
      state.selected = null;
      state.highlightNodes = new Set();
      state.highlightLinks = new Set();
      renderDetail(null);
      document.querySelectorAll('#index li').forEach(li => li.classList.remove('active'));
      state.fg.refresh();
    });

  state.fg.d3Force('charge').strength(-90);
  state.fg.d3Force('link').distance(l => 30 + 60 * (1 - (l.weight ?? 0.5)));

  // FPS counter
  const fpsEl = $('#status-fps');
  let frames = 0, last = performance.now();
  function tick() {
    frames += 1;
    const now = performance.now();
    if (now - last >= 1000) {
      fpsEl.textContent = `${frames} FPS`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener('resize', () => {
    state.fg.width(el.clientWidth);
    state.fg.height(el.clientHeight);
  });
}

function wireControls() {
  $('#btn-back').addEventListener('click', () => {
    const id = state.history.back();
    if (id) { applyHistory(id); }
  });
  $('#btn-forward').addEventListener('click', () => {
    const id = state.history.forward();
    if (id) { applyHistory(id); }
  });
  $('#btn-reset').addEventListener('click', () => {
    state.fg.zoomToFit(800, 60);
  });
  $('#btn-prune').addEventListener('click', () => {
    state.pruning = !state.pruning;
    $('#btn-prune').classList.toggle('active', state.pruning);
    state.graphView = state.pruning ? prune(state.graph, 0.65) : state.graph;
    state.fg.graphData(state.graphView);
    setStatus();
  });
  $('#btn-oracle').addEventListener('click', () => {
    const report = auditGraph(state.graphView);
    const text = formatReport(report);
    console.log('%cORACLE', 'color:#ffcc4d;font-weight:bold', report);
    alert(text);
  });
  $('#detail-close').addEventListener('click', () => {
    renderDetail(null);
    state.highlightNodes = new Set();
    state.highlightLinks = new Set();
    state.fg.refresh();
  });

  const searchInput = $('#search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    if (!q) {
      document.querySelectorAll('#index li').forEach(li => li.style.display = '');
      return;
    }
    const hits = new Set(search(state.index, q, 50));
    document.querySelectorAll('#index li').forEach(li => {
      li.style.display = hits.has(li.dataset.id) ? '' : 'none';
    });
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const hits = search(state.index, searchInput.value, 1);
      if (hits[0]) selectNode(hits[0], true);
    }
  });

  window.addEventListener('keydown', e => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'Escape') { renderDetail(null); state.highlightNodes = new Set(); state.highlightLinks = new Set(); state.fg.refresh(); }
    if (e.key === 'r' || e.key === 'R') state.fg.zoomToFit(800, 60);
    if (e.key === 'p' || e.key === 'P') $('#btn-prune').click();
    if (e.key === 'o' || e.key === 'O') $('#btn-oracle').click();
    if (e.altKey && e.key === 'ArrowLeft')  $('#btn-back').click();
    if (e.altKey && e.key === 'ArrowRight') $('#btn-forward').click();
  });
}

function applyHistory(id) {
  const node = state.graphView.nodes.find(n => n.id === id);
  if (!node) return;
  state.selected = node;
  computeHighlight(node);
  renderDetail(node, pickId => selectNode(pickId, true));
  if (state.fg) {
    const dx = node.x || 0, dy = node.y || 0, dz = node.z || 1;
    const r = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    state.fg.cameraPosition({ x: dx*220/r, y: dy*220/r, z: dz*220/r }, node, 600);
    state.fg.refresh();
  }
  updateHistoryButtons();
}

async function boot() {
  try {
    state.dataset = await loadLaws();
    state.graph = buildGraph(state.dataset);
    state.index = buildIndex(state.graph.nodes);
    buildSidebar();
    initGraph();
    wireControls();
    setStatus();
    updateHistoryButtons();

    const audit = auditGraph(state.graph);
    console.log('%cZORAN — Arbre Fractal des Lois', 'color:#ffcc4d;font-size:14px;font-weight:bold');
    console.log('mission_id:', MISSION);
    console.log('audit:', audit);
  } catch (err) {
    console.error('Boot failed:', err);
    document.getElementById('graph').innerHTML =
      `<div style="padding:32px;color:#ff6b6b;font-family:monospace">Boot failed: ${err.message}</div>`;
  }
}

boot();
