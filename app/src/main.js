import { loadLaws, buildGraph, neighborsOf, prune, branchFrom } from './graph.js';
import { wireChatBar } from './chat.js';
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
  focusBranch: false,
  particlesEnabled: false,
  highlightNodes: new Set(),
  highlightLinks: new Set(),
  branchVisible: null,
  selected: null,
  lastAudit: null,
  meshes: new Map(),     // node.id → THREE.Mesh
  textures: new Map(),   // node.id → THREE.CanvasTexture
  halos: new Map(),      // node.id → THREE.Mesh (torus halo)
  targetOpacity: new Map() // node.id → number
};

const MISSION = 'ZORAN_INT_V2_20260515';

// ─────────────────────────── helpers ───────────────────────────
function avg(a) { return a.length ? a.reduce((x,y)=>x+y,0) / a.length : 0; }
function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }
function escapeShort(s) {
  const t = String(s);
  return t.length > 30 ? t.slice(0, 28) + '…' : t;
}
function familyColor(family) {
  const map = {
    ULG:'#4ea3ff', DVE:'#3ad17a', UDE:'#ffcc4d', GHUC:'#b86bff',
    WP11:'#5ad1c4', WP12:'#5a8cff', SDE:'#ff8a4e', PAL:'#b86bff'
  };
  return map[family] || '#888';
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function pickContrastingColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#0a0d14' : '#f0f3fa';
}
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const f = v => Math.min(255, Math.round(v + (255 - v) * amount));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const f = v => Math.max(0, Math.round(v * (1 - amount)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

// ─────────────────── billiard texture (canvas) ───────────────────
function makeBilliardTexture(node) {
  const cached = state.textures.get(node.id);
  if (cached) return cached;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const baseColor = node.color || '#888';

  // Background: radial gradient that gives subtle depth even before lighting
  const grad = ctx.createRadialGradient(W/2, H/2, 30, W/2, H/2, 280);
  grad.addColorStop(0.0, lighten(baseColor, 0.10));
  grad.addColorStop(0.7, baseColor);
  grad.addColorStop(1.0, darken(baseColor, 0.20));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Equator band (subtle highlight)
  const bandGrad = ctx.createLinearGradient(0, 80, 0, 176);
  bandGrad.addColorStop(0.0, 'rgba(255,255,255,0.00)');
  bandGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  bandGrad.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 80, W, 96);

  const textColor = pickContrastingColor(baseColor);

  // Tier badge in top center (small)
  if (node.attractor_tier) {
    ctx.font = '600 22px "Inter", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor === '#0a0d14' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.80)';
    ctx.fillText(node.attractor_tier, W/2, 50);
  }

  // Main label: node.id
  const isCanonical = node.canonical;
  const fontSize = isCanonical ? 64 : 52;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", "Menlo", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = textColor;
  ctx.fillText(node.id, W/2, 138);
  ctx.shadowColor = 'transparent';

  const tex = new THREE.CanvasTexture(canvas);
  if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
  // Anisotropy needs the renderer ; we will upgrade later in initGraph()
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  state.textures.set(node.id, tex);
  return tex;
}

function tierSpec(node) {
  if (node.attractor_tier === 'μ0') return { clearcoat: 0.55, reflectivity: 0.40 };
  if (node.attractor_tier === 'μ1') return { clearcoat: 0.45, reflectivity: 0.35 };
  if (node.canonical)               return { clearcoat: 0.35, reflectivity: 0.30 };
  return                                   { clearcoat: 0.25, reflectivity: 0.20 };
}

// ─────────────────── billiard mesh (sphere + halo) ──────────────
function makeBilliardMesh(node) {
  const cached = state.meshes.get(node.id);
  if (cached) return cached;

  // V3 hierarchy : taille = topological_weight (fallback weight si pré-V3)
  const tw = (typeof node.topological_weight === 'number')
    ? node.topological_weight : (node.weight ?? 0.5);
  const radius = 2 + tw * 12;
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const tex = makeBilliardTexture(node);
  const tier = tierSpec(node);

  const matOpts = {
    map: tex,
    color: 0xffffff,
    metalness: 0.15,
    roughness: 0.45,
    transparent: true,
    opacity: 1.0
  };
  // MeshPhysicalMaterial-only props (gracefully fall back if missing)
  if (THREE.MeshPhysicalMaterial) {
    matOpts.clearcoat = tier.clearcoat;
    matOpts.clearcoatRoughness = 0.20;
    matOpts.reflectivity = tier.reflectivity;
  }
  const Material = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
  const mat = new Material(matOpts);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.zoranNodeId = node.id;
  mesh.userData.zoranBaseRadius = radius;
  mesh.userData.zoranHoverScale = 1.0;

  // Halo torus around the sphere (face camera, hidden by default — selection)
  const ringGeo = new THREE.TorusGeometry(radius * 1.18, Math.max(0.08, radius * 0.04), 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffcc4d, transparent: true, opacity: 0.85, depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.visible = false;
  mesh.add(ring);
  state.halos.set(node.id, ring);

  // PERSISTENT GOLD HALO on superior_law_candidate (visible in graph)
  // Mission ZORAN_DYNAMIC_VELOCITY_HIERARCHY_GRAPH : les ★ doivent
  // être visibles DANS LE GRAPHE (pas seulement sidebar/panel).
  if (node.superior_law_candidate) {
    // Inner bright gold ring (orbit plane independent — face camera each frame)
    const supRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.40, Math.max(0.10, radius * 0.06), 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.95, depthWrite: false })
    );
    // Outer warm-orange aura
    const supRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.70, Math.max(0.07, radius * 0.04), 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xff9c2e, transparent: true, opacity: 0.65, depthWrite: false })
    );
    // Wide glow corona (soft)
    const supRing3 = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 2.05, Math.max(0.05, radius * 0.025), 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xffe88a, transparent: true, opacity: 0.30, depthWrite: false })
    );
    mesh.add(supRing1);
    mesh.add(supRing2);
    mesh.add(supRing3);
    mesh.userData.zoranSuperiorRings = [supRing1, supRing2, supRing3];

    // Star sprite floating above the sphere
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 128; starCanvas.height = 128;
    const sctx = starCanvas.getContext('2d');
    sctx.clearRect(0, 0, 128, 128);
    sctx.fillStyle = '#ffd34d';
    sctx.font = 'bold 96px serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.shadowColor = '#ffcc4d';
    sctx.shadowBlur = 22;
    sctx.fillText('★', 64, 70);
    const starTex = new THREE.CanvasTexture(starCanvas);
    starTex.minFilter = THREE.LinearFilter;
    const starMat = new THREE.SpriteMaterial({
      map: starTex, color: 0xffffff, transparent: true,
      depthWrite: false, depthTest: false
    });
    const star = new THREE.Sprite(starMat);
    const starScale = Math.max(6, radius * 1.1);
    star.scale.set(starScale, starScale, 1);
    star.position.set(0, radius * 1.95, 0);
    star.renderOrder = 999;
    mesh.add(star);
    mesh.userData.zoranSuperiorStar = star;
  }

  state.meshes.set(node.id, mesh);
  state.targetOpacity.set(node.id, 1.0);
  return mesh;
}

// ─────────────────────── highlight / state sync ───────────────
function recomputeOpacityTargets() {
  for (const n of state.graphView.nodes) {
    let target = 1.0;
    // Layer visibility (mission MULTI_CORE_PATTERN)
    if (state.layerVisibility && n.core_id && state.layerVisibility[n.core_id] === false) {
      target = 0.05;
    }
    else if (state.branchVisible && !state.branchVisible.has(n.id)) target = 0.18;
    else if (state.highlightNodes.size > 0 && !state.highlightNodes.has(n.id)) target = 0.32;
    state.targetOpacity.set(n.id, target);
  }
}

function applyLayerVisibility() {
  recomputeOpacityTargets();
  if (state.fg) state.fg.refresh();
}

// ─── REALTIME ROUTE VISUALIZATION (mission ZORAN_REALTIME_COGNITIVE_ROUTE_VISUALIZATION) ───
// state.activeRoutes : Map<route_id, { color, laws:Set, edges:Set, eliminated:bool, winner:bool, rank, strength }>
// max 6 routes simultanées (mission spec)

const ROUTE_COLORS = {
  frugale:            { hex: 0x3ad17a, css: '#3ad17a' },  // vert
  anti_hallucination: { hex: 0xff6b6b, css: '#ff6b6b' },  // rouge
  runtime_rapide:     { hex: 0x4dd6ff, css: '#4dd6ff' },  // cyan
  propagation_forte:  { hex: 0xb86bff, css: '#b86bff' },  // violet
  temporal_survival:  { hex: 0xff9c2e, css: '#ff9c2e' },  // orange
  structurelle:       { hex: 0x4ea3ff, css: '#4ea3ff' },  // bleu
};

function routeColorOf(strategy) {
  return ROUTE_COLORS[strategy] || { hex: 0xcccccc, css: '#cccccc' };
}

export function activateRoutes(competitionResult) {
  // Build the active routes registry from a path competition result
  state.activeRoutes = new Map();
  const routes = competitionResult.routes || [];
  const winner = competitionResult.winner;
  // Sort by selection_score desc, take top 6 max
  const sorted = [...routes].sort((a, b) => b.selection_score - a.selection_score).slice(0, 6);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const col = routeColorOf(r.strategy);
    const laws = new Set(r.laws_used);
    // Edges: between any 2 laws of this route
    const edges = new Set();
    for (const l of state.graphView.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (laws.has(s) && laws.has(t)) edges.add(l);
    }
    state.activeRoutes.set(r.route_id, {
      route_id: r.route_id,
      strategy: r.strategy,
      label: r.label || r.strategy,
      color: col,
      laws,
      edges,
      eliminated: !!r.eliminated,
      winner: r.route_id === winner,
      rank: i + 1,
      strength: Math.max(0.3, r.selection_score),
    });
  }
  state.routeMode = true;
  applyRouteVisualization();
}

export function deactivateRoutes() {
  // Restore original colors + drop route layer
  for (const [id, mesh] of state.meshes.entries()) {
    const orig = mesh.userData.zoranOrigColor;
    if (orig && mesh.material && mesh.material.color) {
      mesh.material.color.setHex(orig);
    }
    if (mesh.material && mesh.material.emissive) {
      mesh.material.emissive.setHex(0x000000);
    }
    mesh.userData.zoranWinnerPulse = false;
  }
  state.activeRoutes = null;
  state.routeMode = false;
  recomputeOpacityTargets();
  if (state.fg) state.fg.refresh();
}

function applyRouteVisualization() {
  if (!state.activeRoutes) return;
  // Determine, for each node, which routes use it + winner membership
  const nodeRoutes = new Map(); // id -> [{ color, eliminated, winner, strength }]
  for (const route of state.activeRoutes.values()) {
    for (const lawId of route.laws) {
      if (!nodeRoutes.has(lawId)) nodeRoutes.set(lawId, []);
      nodeRoutes.get(lawId).push(route);
    }
  }
  // Apply per-mesh tint
  for (const [id, mesh] of state.meshes.entries()) {
    if (!mesh.userData.zoranOrigColor && mesh.material && mesh.material.color) {
      mesh.userData.zoranOrigColor = mesh.material.color.getHex();
    }
    const involved = nodeRoutes.get(id);
    if (involved && involved.length > 0) {
      // Pick dominant route : winner > best score
      const winner = involved.find(r => r.winner);
      const dom = winner || involved.reduce((a, b) => a.strength >= b.strength ? a : b);
      if (mesh.material && mesh.material.color) {
        // Tint toward route color (50% blend)
        const c = new THREE.Color(dom.color.hex);
        const orig = new THREE.Color(mesh.userData.zoranOrigColor);
        mesh.material.color.copy(orig).lerp(c, 0.55);
      }
      if (mesh.material && mesh.material.emissive && dom.winner) {
        mesh.material.emissive.setHex(dom.color.hex);
        mesh.material.emissiveIntensity = 0.20;
        mesh.userData.zoranWinnerPulse = true;
      } else if (mesh.material && mesh.material.emissive) {
        // soft glow for non-winner involved nodes
        mesh.material.emissive.setHex(dom.color.hex);
        mesh.material.emissiveIntensity = dom.eliminated ? 0.0 : 0.08;
        mesh.userData.zoranWinnerPulse = false;
      }
      // Opacity : eliminated = faded, others normal
      state.targetOpacity.set(id, dom.eliminated ? 0.30 : 1.0);
    } else {
      // Not in any route : dim heavily (mission : "routes rejetées s'atténuent")
      if (mesh.material && mesh.material.color) {
        mesh.material.color.setHex(mesh.userData.zoranOrigColor || 0x666666);
      }
      if (mesh.material && mesh.material.emissive) {
        mesh.material.emissive.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
      mesh.userData.zoranWinnerPulse = false;
      state.targetOpacity.set(id, 0.12);
    }
  }
  if (state.fg) state.fg.refresh();
}

function updateHalos() {
  if (!state.fg) return;
  const cam = state.fg.camera();
  if (!cam) return;
  // Selection halos
  for (const [id, halo] of state.halos.entries()) {
    const visible = !!(state.selected && state.selected.id === id);
    halo.visible = visible;
    if (visible && halo.parent) {
      halo.lookAt(cam.position);
    }
  }
  // Persistent superior_law rings — orient toward camera + soft pulse
  const t = performance.now() * 0.001;
  const pulse = 1.0 + Math.sin(t * 1.6) * 0.06;
  for (const mesh of state.meshes.values()) {
    const rings = mesh.userData.zoranSuperiorRings;
    if (rings) {
      for (let i = 0; i < rings.length; i++) {
        rings[i].lookAt(cam.position);
        rings[i].scale.set(pulse, pulse, 1);
      }
    }
    // Star sprite already auto-billboarded (Sprite always faces camera)
  }
}

function tickAnimation() {
  // Per-frame opacity lerp + hover scale lerp + halo facing + winner pulse
  const t = performance.now() * 0.001;
  // Soft winner pulse — 1.5 Hz, ±0.15 intensity (mission : sobre, lent, stable)
  const winnerPulse = 0.20 + Math.sin(t * 1.5 * Math.PI * 2) * 0.10;
  for (const [id, mesh] of state.meshes.entries()) {
    const target = state.targetOpacity.get(id) ?? 1.0;
    const cur = mesh.material.opacity;
    if (Math.abs(cur - target) > 0.005) {
      mesh.material.opacity = cur + (target - cur) * 0.18;
      mesh.material.transparent = mesh.material.opacity < 0.99;
    }
    const tgtScale = mesh.userData.zoranHoverScale ?? 1.0;
    const curScale = mesh.scale.x;
    if (Math.abs(curScale - tgtScale) > 0.003) {
      const next = curScale + (tgtScale - curScale) * 0.20;
      mesh.scale.set(next, next, next);
    }
    // Winner pulse — only for nodes flagged as winner-route members
    if (mesh.userData.zoranWinnerPulse && mesh.material && mesh.material.emissive) {
      mesh.material.emissiveIntensity = winnerPulse;
    }
  }
  updateHalos();
  requestAnimationFrame(tickAnimation);
}

// ───────────────────── lighting (PBR) ──────────────────────────
function setupLighting() {
  const scene = state.fg.scene();
  // Soft cool ambient
  const ambient = new THREE.AmbientLight(0x404858, 0.45);
  scene.add(ambient);
  // Cool rim (fill from back-bottom)
  const rim = new THREE.DirectionalLight(0x6080a0, 0.30);
  rim.position.set(-40, -20, -60);
  scene.add(rim);
  // Note : 3d-force-graph already adds its own AmbientLight + DirectionalLight ;
  // we only complement to make clearcoat readable.
}

// ───────────────────────── status / sidebar ────────────────────
function setStatus() {
  $('#status-mission').textContent = `MISSION ${MISSION}`;
  const nodes = state.graphView.nodes;
  const n = nodes.length;
  const l = state.graphView.links.length;
  const fam = state.graphView.families?.length ?? 0;
  // GLOBAL_RUNTIME_COUNTERS — mission MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES
  const superior = nodes.filter(x => x.superior_law_candidate).length;
  const frugal   = nodes.filter(x => (x.frugality_score ?? 0) >= 0.65).length;
  const toxic    = nodes.filter(x => (x.experimental_classes || []).includes('toxique_propagationnelle')).length;
  const sandbox  = state.sandboxCount ?? 0;
  const cores    = state.coresDetected ?? 0;
  const runtimeAdm = nodes.filter(x => x.threshold_admissibility === true).length;
  const keepRt = nodes.filter(x => x.keep_runtime === true).length;
  const noisy  = nodes.filter(x => x.keep_runtime === false && x.signal_to_noise != null).length;
  $('#status-counts').textContent =
      `nodes ${n} · links ${l} · fam ${fam} · ★${superior} · frugal ${frugal} · toxic ${toxic} · sandbox ${sandbox} · keep ${keepRt} · noise ${noisy} · cores ${cores}`;
  const m = state.lastAudit?.metrics;
  if (m) {
    $('#status-coherence').textContent =
      `S_local=${m.S_local_avg.toFixed(2)} · S_global=${m.S_global_published} · HS=${m.HS.toFixed(2)}`;
  } else {
    const slocal = avg(state.graphView.nodes.map(n => n.S_local ?? 0));
    $('#status-coherence').textContent = `S_local=${slocal.toFixed(2)} · S_global=proxy:?`;
  }
}

function buildSidebar() {
  const famUl = $('#families');
  famUl.innerHTML = '';

  // Compute per-family counts (Stage H)
  const counts = {};
  for (const n of state.graph.nodes) {
    counts[n.family] = (counts[n.family] || 0) + 1;
  }

  for (const f of state.graph.families) {
    const li = document.createElement('li');
    li.dataset.family = f.id;
    const inv = f.invariant ? ` <span class="fam-inv" title="${escAttr(f.invariant)}">·</span>` : '';
    const fractalMark = f.fractality_demonstrated ? ' <span class="fam-fractal" title="famille fractale démontrée">⊛</span>' : '';
    const count = counts[f.id] || 0;
    li.innerHTML = `<span class="swatch" style="background:${familyColor(f.id)}"></span>`
      + `<span class="fam-id">${f.id}</span>`
      + `<span class="fam-count" title="lois canoniques">${count}</span>`
      + fractalMark
      + ` <span style="color:var(--fg-2)">${escapeShort(f.label.split('—').slice(1).join('—').trim() || f.label)}</span>${inv}`;
    li.title = f.invariant ? `${f.label}\n\nInvariant: ${f.invariant}\n\nLois canoniques : ${count}${f.fractality_demonstrated ? '\nFractalité démontrée ✓' : ''}` : f.label;
    li.addEventListener('click', () => focusFamily(f.id));
    famUl.appendChild(li);
  }

  const idxUl = $('#index');
  idxUl.innerHTML = '';
  const sorted = [...state.graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const n of sorted) {
    const li = document.createElement('li');
    li.dataset.id = n.id;
    const tierBadge = n.attractor_tier ? ` <span class="tier-badge">${n.attractor_tier}</span>` : '';
    const supStar = n.superior_law_candidate ? '<span class="superior-star" title="Loi supérieure">★</span>' : '';
    li.innerHTML = `<span class="swatch" style="background:${n.color}"></span>${supStar}${n.id}${tierBadge} <span style="color:var(--fg-2)">${escapeShort(n.title)}</span>`;
    li.title = n.superior_law_candidate
      ? `${n.title}\n\n★ Loi supérieure (probability ${(n.superior_law_probability ?? 0).toFixed(3)})`
      : n.title;
    li.addEventListener('click', () => selectNode(n.id, true));
    idxUl.appendChild(li);
  }

  // Section "Lois supérieures" — top par probability
  const supUl = $('#superior-laws');
  if (supUl) {
    supUl.innerHTML = '';
    const supLaws = state.graph.nodes
      .filter(n => n.superior_law_candidate)
      .sort((a, b) => (b.superior_law_probability ?? 0) - (a.superior_law_probability ?? 0));
    if (supLaws.length === 0) {
      supUl.innerHTML = '<li style="color:var(--fg-2)">aucune détectée</li>';
    } else {
      for (const n of supLaws) {
        const li = document.createElement('li');
        li.dataset.id = n.id;
        const p = (n.superior_law_probability ?? 0).toFixed(2);
        li.innerHTML = `<span class="swatch" style="background:${n.color}"></span>${n.id}<span class="prob">${p}</span>`;
        li.title = `${n.title}\n\nProbability: ${p}\nFamille: ${n.family}`;
        li.addEventListener('click', () => selectNode(n.id, true));
        supUl.appendChild(li);
      }
    }
  }

  // ─── LAYER_MANAGER : noyaux émergents (mission MULTI_CORE_PATTERN) ───
  const coresUl = $('#cores-list');
  if (coresUl && state.cores && state.cores.cores && state.cores.cores.length) {
    coresUl.innerHTML = '';
    state.layerVisibility = state.layerVisibility || {};
    for (const c of state.cores.cores) {
      if (state.layerVisibility[c.core_id] == null) state.layerVisibility[c.core_id] = true;
      const li = document.createElement('li');
      li.dataset.coreId = c.core_id;
      const color = familyColor(c.dominant_family);
      const checked = state.layerVisibility[c.core_id] ? '✓' : '∅';
      li.innerHTML = `<span class="swatch" style="background:${color}"></span>`
        + `<span style="font-family:ui-monospace,monospace;font-size:10px">${c.core_id.replace('CORE-','')}</span>`
        + `<span class="fam-count" title="taille noyau">${c.size}</span>`
        + `<span style="margin-left:auto;color:var(--accent);font-size:11px;cursor:pointer" data-toggle="1">${checked}</span>`;
      li.title = `${c.core_id}\n\nCentres : ${c.gravity_center.join(', ')}\nDensité : ${c.density}\nStabilité : ${c.stability_score}\nClic centre = focus | Clic ✓ = toggle layer`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', e => {
        if (e.target.dataset.toggle) {
          // Toggle layer visibility
          state.layerVisibility[c.core_id] = !state.layerVisibility[c.core_id];
          e.target.textContent = state.layerVisibility[c.core_id] ? '✓' : '∅';
          applyLayerVisibility();
        } else {
          // Focus on core gravity center
          const target = c.gravity_center[0];
          if (target) selectNode(target, true);
        }
      });
      coresUl.appendChild(li);
    }
    $('#cores-all')?.addEventListener('click', () => {
      for (const c of state.cores.cores) state.layerVisibility[c.core_id] = true;
      buildSidebar();
      applyLayerVisibility();
    });
    $('#cores-isolate')?.addEventListener('click', () => {
      // Isole le noyau dont un membre est sélectionné, ou le 1er noyau
      const selCore = state.selected?.core_id || state.cores.cores[0].core_id;
      for (const c of state.cores.cores) state.layerVisibility[c.core_id] = (c.core_id === selCore);
      buildSidebar();
      applyLayerVisibility();
    });
  }

  // Section "Sélection temporelle" — top 25 par dynamic_selection_rank
  const tempUl = $('#temporal-laws');
  if (tempUl) {
    tempUl.innerHTML = '';
    const tempLaws = state.graph.nodes
      .filter(n => n.dynamic_selection_rank != null)
      .sort((a, b) => (a.dynamic_selection_rank ?? 9999) - (b.dynamic_selection_rank ?? 9999))
      .slice(0, 25);
    if (tempLaws.length === 0) {
      tempUl.innerHTML = '<li style="color:var(--fg-2)">non calculée</li>';
    } else {
      for (const n of tempLaws) {
        const li = document.createElement('li');
        li.dataset.id = n.id;
        const cps = (n.coherence_pressure_score ?? 0).toFixed(2);
        const rank = n.dynamic_selection_rank;
        li.innerHTML = `<span class="swatch" style="background:${n.color}"></span>
          <span style="font-size:9px;color:var(--fg-2);margin-right:4px">#${rank}</span>
          ${n.id}<span class="prob">${cps}</span>`;
        li.title = `${n.title}\n\nRank dynamique: #${rank}\nCoherence pressure: ${cps}`;
        li.addEventListener('click', () => selectNode(n.id, true));
        tempUl.appendChild(li);
      }
    }
  }
}

// ───────────────────────── selection / nav ─────────────────────
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
  renderDetail(node, state.graphView, pickId => selectNode(pickId, true));
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
  state.branchVisible = state.focusBranch ? branchFrom(state.graphView, node.id) : null;
  recomputeOpacityTargets();
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

// Full Hand Navigation — re-center camera on any node
function focusCamOn(node) {
  if (!node || !state.fg) return;
  const dx = node.x || 0, dy = node.y || 0, dz = node.z || 1;
  const r = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
  const dist = 160;
  state.fg.cameraPosition(
    { x: dx * (dist + r)/r, y: dy * (dist + r)/r, z: dz * (dist + r)/r },
    node, 700
  );
}

// ─────────────────────────── graph init ────────────────────────
function initGraph() {
  state.graphView = state.graph;
  const el = document.getElementById('graph');

  // Expose for smoke tests / dev-tools (Full Hand Navigation mission)
  window.__zoranFG = null;
  // Use orbit controls for predictable pan (right-click drag) + zoom + rotate
  state.fg = ForceGraph3D({ controlType: 'orbit' })(el)
    .backgroundColor('rgba(0,0,0,0)')
    .graphData(state.graphView)
    .nodeId('id')
    .nodeLabel(() => '')                  // disable native tooltip per V2 spec
    .nodeThreeObject(n => makeBilliardMesh(n))
    .nodeThreeObjectExtend(false)         // replace default sphere entirely
    .linkColor(l => {
      // ROUTE MODE — route winner edges = winner color, eliminated = grey
      if (state.activeRoutes) {
        let winnerColor = null;
        let anyRouteColor = null;
        let anyEliminatedOnly = true;
        for (const route of state.activeRoutes.values()) {
          if (route.edges.has(l)) {
            anyRouteColor = route.color.css;
            if (!route.eliminated) anyEliminatedOnly = false;
            if (route.winner) { winnerColor = route.color.css; break; }
          }
        }
        if (winnerColor) return winnerColor;
        if (anyRouteColor) return anyEliminatedOnly ? 'rgba(120,130,150,0.10)' : anyRouteColor;
        return 'rgba(120,130,150,0.02)';
      }
      if (state.branchVisible) {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (!state.branchVisible.has(s) || !state.branchVisible.has(t)) return 'rgba(120,130,150,0.04)';
      }
      if (state.highlightLinks.size === 0) return l.color;
      return state.highlightLinks.has(l) ? '#ffcc4d' : 'rgba(120,130,150,0.06)';
    })
    .linkWidth(l => {
      if (state.activeRoutes) {
        for (const route of state.activeRoutes.values()) {
          if (route.edges.has(l)) {
            if (route.winner) return 2.2;
            if (route.eliminated) return 0.3;
            return 1.0;
          }
        }
        return 0.2;
      }
      return state.highlightLinks.has(l) ? 1.6 : 0.4;
    })
    .linkDirectionalParticles(l => (state.particlesEnabled && state.highlightLinks.has(l) ? 2 : 0))
    .linkDirectionalParticleSpeed(0.006)
    .linkDirectionalParticleWidth(1.2)
    .linkOpacity(0.55)
    .enableNodeDrag(true)
    .onNodeClick(n => selectNode(n.id, true))
    .onNodeHover(n => {
      // Reset prior hover
      for (const mesh of state.meshes.values()) mesh.userData.zoranHoverScale = 1.0;
      if (n) {
        const m = state.meshes.get(n.id);
        if (m) m.userData.zoranHoverScale = 1.10;
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = '';
      }
    })
    .onBackgroundClick(() => {
      state.selected = null;
      state.highlightNodes = new Set();
      state.highlightLinks = new Set();
      state.branchVisible = null;
      recomputeOpacityTargets();
      renderDetail(null);
      document.querySelectorAll('#index li').forEach(li => li.classList.remove('active'));
      state.fg.refresh();
    });

  state.fg.d3Force('charge').strength(-110);
  state.fg.d3Force('link').distance(l => {
    if (l.kind === 'parent')        return 28 + 60 * (1 - (l.weight ?? 0.5));
    if (l.kind === 'iso')           return 50;
    if (l.kind === 'contradicts')   return 80;
    if (l.kind === 'absorbed_into') return 40;
    if (l.kind === 'related')       return 90;
    return 60;
  });

  // V3 — Verticalité hiérarchique : fy gèle Y selon structural_rank
  for (const n of state.graphView.nodes) {
    if (typeof n._fy === 'number') {
      n.fy = n._fy;
    }
  }
  // Damping fort pour stabilisation rapide de l'arbre
  if (typeof state.fg.d3VelocityDecay === 'function') state.fg.d3VelocityDecay(0.45);
  if (typeof state.fg.d3AlphaDecay === 'function') state.fg.d3AlphaDecay(0.025);
  if (typeof state.fg.cooldownTime === 'function') state.fg.cooldownTime(8000);

  // Apply anisotropy now that renderer exists
  try {
    const ren = state.fg.renderer();
    if (ren && ren.capabilities && ren.capabilities.getMaxAnisotropy) {
      const maxAniso = ren.capabilities.getMaxAnisotropy();
      for (const tex of state.textures.values()) {
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;
      }
    }
  } catch (_) { /* renderer may not be ready synchronously ; fallback OK */ }

  setupLighting();
  recomputeOpacityTargets();
  window.__zoranFG = state.fg;

  // ─── REAL_HAND_NAVIGATION : pan multi-méthodes ───────────────────────
  // (mission REAL_HAND_NAVIGATION_FIX — translation libre garantie runtime)
  try {
    const ctrl = state.fg.controls();
    if (ctrl) {
      ctrl.noPan = false;
      ctrl.panSpeed = 1.2;
      ctrl.rotateSpeed = 1.2;
      ctrl.zoomSpeed  = 1.2;
      ctrl.staticMoving = true;
      ctrl.dynamicDampingFactor = 0.15;
      if ('enablePan' in ctrl) ctrl.enablePan = true;
      if ('screenSpacePanning' in ctrl) ctrl.screenSpacePanning = true;
      if ('enableDamping' in ctrl) ctrl.enableDamping = true;
      if ('dampingFactor' in ctrl) ctrl.dampingFactor = 0.10;
      // Allow LEFT click pan as well (mouseButton remap when SHIFT held)
      if (ctrl.mouseButtons && typeof THREE !== 'undefined' && THREE.MOUSE) {
        ctrl.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        ctrl.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      }
      try { ctrl.target0 && ctrl.target0.copy(ctrl.target); } catch (_) {}
      try { ctrl.position0 && ctrl.position0.copy(state.fg.camera().position); } catch (_) {}
    }
  } catch (e) { console.warn('controls() not ready', e); }

  // Prevent native context menu so right-click drag pan works on canvas
  el.addEventListener('contextmenu', e => e.preventDefault());
  // Also on the canvas itself
  setTimeout(() => {
    const cv = el.querySelector('canvas');
    if (cv) cv.addEventListener('contextmenu', e => e.preventDefault());
  }, 200);

  // ─── PAN MANUEL DIRECT (backup garanti, indépendant des controls) ───
  // Permet : SHIFT + clic gauche drag = pan ; touch 2 doigts = pan
  let manualPan = null;
  function startManualPan(x, y) { manualPan = { x, y }; el.style.cursor = 'grabbing'; }
  function doManualPan(x, y) {
    if (!manualPan) return;
    const dx = x - manualPan.x, dy = y - manualPan.y;
    manualPan = { x, y };
    const cam = state.fg.camera();
    const ctrl = state.fg.controls();
    // Move camera AND target by the same world-space offset
    // Compute world units per screen pixel based on camera distance
    const dist = ctrl && ctrl.target
      ? cam.position.distanceTo(ctrl.target)
      : cam.position.length();
    const factor = dist * 0.002;
    // Get camera basis vectors (right, up) in world space
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    cam.matrix.extractBasis(right, up, new THREE.Vector3());
    const offset = right.multiplyScalar(-dx * factor).add(up.multiplyScalar(dy * factor));
    cam.position.add(offset);
    if (ctrl && ctrl.target) ctrl.target.add(offset);
    if (ctrl && typeof ctrl.update === 'function') ctrl.update();
  }
  function endManualPan() { manualPan = null; el.style.cursor = ''; }

  el.addEventListener('pointerdown', e => {
    // SHIFT + LEFT click, OR MIDDLE button, OR RIGHT button (backup)
    if ((e.button === 0 && e.shiftKey) || e.button === 1 || e.button === 2) {
      e.preventDefault();
      startManualPan(e.clientX, e.clientY);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  el.addEventListener('pointermove', e => {
    if (manualPan) {
      e.preventDefault();
      doManualPan(e.clientX, e.clientY);
    }
  });
  el.addEventListener('pointerup', e => { if (manualPan) { e.preventDefault(); endManualPan(); } });
  el.addEventListener('pointercancel', endManualPan);

  // Touch — 2-finger drag = pan
  let touchPan = null;
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const t = e.touches;
      touchPan = { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
      startManualPan(touchPan.x, touchPan.y);
      e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (manualPan && e.touches.length === 2) {
      const t = e.touches;
      const mx = (t[0].clientX + t[1].clientX) / 2;
      const my = (t[0].clientY + t[1].clientY) / 2;
      doManualPan(mx, my);
      e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener('touchend', () => { if (manualPan) endManualPan(); });

  // Double-click on canvas = re-center + zoom on selected (or zoomToFit)
  el.addEventListener('dblclick', e => {
    if (state.selected) focusCamOn(state.selected);
    else state.fg.zoomToFit(700, 60);
  });

  // Expose pan API for tests + debug
  window.__zoranPan = function(dx, dy) {
    startManualPan(0, 0);
    doManualPan(dx, dy);
    endManualPan();
  };

  // FPS
  const fpsEl = $('#status-fps');
  let frames = 0, last = performance.now();
  function fpsTick() {
    frames += 1;
    const now = performance.now();
    if (now - last >= 1000) {
      fpsEl.textContent = `${frames} FPS`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(fpsTick);
  }
  fpsTick();

  // Per-frame state animation
  requestAnimationFrame(tickAnimation);

  window.addEventListener('resize', () => {
    state.fg.width(el.clientWidth);
    state.fg.height(el.clientHeight);
  });
}

// ───── DRAGGABLE_RUNTIME_RESPONSE_POPUP (mission 2026-05-16 05:08) ─────
// Le popup #chat-results devient déplaçable, redimensionnable, minimisable,
// pour permettre la coexistence graphe + réponse runtime.
function setupDraggableChatPopup() {
  const popup = document.getElementById('chat-results');
  const header = document.getElementById('chat-results-header');
  const closeBtn = document.getElementById('chat-results-close');
  if (!popup || !header) return;

  // Add minimize button next to close
  if (!document.getElementById('chat-results-min')) {
    const minBtn = document.createElement('button');
    minBtn.id = 'chat-results-min';
    minBtn.title = 'Minimiser';
    minBtn.textContent = '–';
    minBtn.setAttribute('aria-label', 'Minimiser popup');
    minBtn.style.cssText = 'width:26px;height:26px;background:transparent;color:var(--fg-2);border:none;cursor:pointer;font-size:18px;line-height:1';
    header.insertBefore(minBtn, closeBtn);
    minBtn.addEventListener('click', () => {
      popup.classList.toggle('minimized');
      minBtn.textContent = popup.classList.contains('minimized') ? '+' : '–';
      minBtn.title = popup.classList.contains('minimized') ? 'Restaurer' : 'Minimiser';
      try { localStorage.setItem('zoran.chat.min', popup.classList.contains('minimized') ? '1' : '0'); } catch (_) {}
    });
  }

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  header.style.cursor = 'grab';
  header.addEventListener('pointerdown', e => {
    if (e.target && (e.target.id === 'chat-results-close' || e.target.id === 'chat-results-min')) return;
    dragging = true;
    try { header.setPointerCapture(e.pointerId); } catch (_) {}
    const rect = popup.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    popup.style.transform = 'none'; // disable centering transform
    popup.style.transition = 'none';
    header.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  });
  function onMove(e) {
    if (!dragging) return;
    let left = startLeft + (e.clientX - startX);
    let top  = startTop  + (e.clientY - startY);
    const w = popup.offsetWidth, h = popup.offsetHeight;
    left = Math.max(0, Math.min(window.innerWidth - 80, left));
    top  = Math.max(48, Math.min(window.innerHeight - 60, top));
    popup.style.left = left + 'px';
    popup.style.top  = top  + 'px';
    popup.style.bottom = 'auto';
    popup.style.right = 'auto';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    header.style.cursor = 'grab';
    document.body.style.userSelect = '';
    const rect = popup.getBoundingClientRect();
    try {
      localStorage.setItem('zoran.chat.pos',
        JSON.stringify({ left: rect.left, top: rect.top, w: popup.offsetWidth, h: popup.offsetHeight }));
    } catch (_) {}
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Persist resize via ResizeObserver
  try {
    const ro = new ResizeObserver(() => {
      if (popup.classList.contains('hidden')) return;
      try {
        const r = popup.getBoundingClientRect();
        const saved = JSON.parse(localStorage.getItem('zoran.chat.pos') || '{}');
        localStorage.setItem('zoran.chat.pos', JSON.stringify({
          ...saved, w: popup.offsetWidth, h: popup.offsetHeight,
        }));
      } catch (_) {}
    });
    ro.observe(popup);
  } catch (_) {}

  // Restore saved position+size on first show
  popup.addEventListener('zoran-show', () => {
    try {
      const raw = localStorage.getItem('zoran.chat.pos');
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isFinite(s.left) && Number.isFinite(s.top)) {
          popup.style.transform = 'none';
          popup.style.left = Math.max(0, Math.min(window.innerWidth - 80, s.left)) + 'px';
          popup.style.top  = Math.max(48, Math.min(window.innerHeight - 60, s.top)) + 'px';
          popup.style.bottom = 'auto'; popup.style.right = 'auto';
        }
        if (Number.isFinite(s.w) && Number.isFinite(s.h)) {
          popup.style.width = s.w + 'px';
          popup.style.height = s.h + 'px';
        }
      }
      if (localStorage.getItem('zoran.chat.min') === '1') {
        popup.classList.add('minimized');
        const b = document.getElementById('chat-results-min');
        if (b) { b.textContent = '+'; b.title = 'Restaurer'; }
      }
    } catch (_) {}
  });

  // Hook close to also clear routes from graph
  if (closeBtn && !closeBtn.dataset.zoranWired) {
    closeBtn.dataset.zoranWired = '1';
    closeBtn.addEventListener('click', () => {
      if (typeof deactivateRoutes === 'function') deactivateRoutes();
    });
  }
}

// ───────────────────── draggable panel ─────────────────────
function setupDraggablePanel() {
  const panel = $('#detail');
  const header = $('#detail-header');
  if (!panel || !header) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header.addEventListener('pointerdown', e => {
    if (e.target && e.target.id === 'detail-close') return;
    dragging = true;
    try { header.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const rect = panel.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    panel.style.transition = 'none';
    document.body.style.userSelect = 'none';
  });

  function onMove(e) {
    if (!dragging) return;
    let left = startLeft + (e.clientX - startX);
    let top  = startTop  + (e.clientY - startY);
    const w = panel.offsetWidth, h = Math.min(panel.offsetHeight, window.innerHeight);
    left = Math.max(0, Math.min(window.innerWidth - w, left));
    top  = Math.max(48, Math.min(window.innerHeight - 60, top));
    panel.style.left  = left + 'px';
    panel.style.top   = top  + 'px';
    panel.style.right = 'auto';
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    const rect = panel.getBoundingClientRect();
    try {
      localStorage.setItem('zoran.panel.pos',
        JSON.stringify({ left: rect.left, top: rect.top }));
    } catch (_) { /* localStorage unavailable */ }
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Restore saved position once
  try {
    const raw = localStorage.getItem('zoran.panel.pos');
    if (raw) {
      const saved = JSON.parse(raw);
      if (Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        const left = Math.max(0, Math.min(window.innerWidth - 380, saved.left));
        const top  = Math.max(48, Math.min(window.innerHeight - 200, saved.top));
        panel.style.left = left + 'px';
        panel.style.top  = top  + 'px';
        panel.style.right = 'auto';
      }
    }
  } catch (_) { /* ignore */ }

  // Reset position via Shift+R
  window.addEventListener('keydown', e => {
    if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      panel.style.left = '';
      panel.style.top  = '60px';
      panel.style.right = '16px';
      try { localStorage.removeItem('zoran.panel.pos'); } catch (_) {}
    }
  });
}

// ────────────────────────── controls ───────────────────────────
function wireControls() {
  $('#btn-back').addEventListener('click', () => {
    const id = state.history.back();
    if (id) applyHistory(id);
  });
  $('#btn-forward').addEventListener('click', () => {
    const id = state.history.forward();
    if (id) applyHistory(id);
  });
  $('#btn-reset').addEventListener('click', () => {
    state.fg.zoomToFit(800, 60);
  });
  // Sidebar toggle (mode immersif)
  const sidebarBtn = $('#btn-sidebar');
  const applySidebarState = () => {
    document.body.classList.toggle('sidebar-hidden', state.sidebarHidden);
    sidebarBtn.classList.toggle('active', state.sidebarHidden);
    sidebarBtn.textContent = state.sidebarHidden ? '⇥' : '⇤';
    sidebarBtn.title = state.sidebarHidden ? 'Afficher sidebar (S)' : 'Masquer sidebar (S) — mode immersif';
    // resize 3D graph after CSS transition
    setTimeout(() => {
      const el = document.getElementById('graph');
      if (state.fg && el) {
        state.fg.width(el.clientWidth);
        state.fg.height(el.clientHeight);
      }
    }, 220);
  };
  try {
    state.sidebarHidden = localStorage.getItem('zoran.sidebar.hidden') === '1';
  } catch (_) { state.sidebarHidden = false; }
  applySidebarState();
  sidebarBtn.addEventListener('click', () => {
    state.sidebarHidden = !state.sidebarHidden;
    try { localStorage.setItem('zoran.sidebar.hidden', state.sidebarHidden ? '1' : '0'); } catch (_) {}
    applySidebarState();
  });
  $('#btn-focus').addEventListener('click', () => {
    state.focusBranch = !state.focusBranch;
    $('#btn-focus').classList.toggle('active', state.focusBranch);
    if (state.selected) computeHighlight(state.selected);
    else { state.branchVisible = null; recomputeOpacityTargets(); }
    state.fg.refresh();
  });
  $('#btn-prune').addEventListener('click', () => {
    state.pruning = !state.pruning;
    $('#btn-prune').classList.toggle('active', state.pruning);
    state.graphView = state.pruning ? prune(state.graph, 0.65) : state.graph;
    state.fg.graphData(state.graphView);
    state.lastAudit = auditGraph(state.graphView);
    recomputeOpacityTargets();
    setStatus();
  });
  $('#btn-oracle').addEventListener('click', () => {
    const report = auditGraph(state.graphView);
    state.lastAudit = report;
    const text = formatReport(report);
    console.log('%cORACLE', 'color:#ffcc4d;font-weight:bold', report);
    alert(text);
    setStatus();
  });
  $('#detail-close').addEventListener('click', e => {
    e.stopPropagation();
    renderDetail(null);
    state.highlightNodes = new Set();
    state.highlightLinks = new Set();
    state.branchVisible = null;
    recomputeOpacityTargets();
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
    if (e.key === 'Escape') {
      renderDetail(null);
      state.highlightNodes = new Set();
      state.highlightLinks = new Set();
      state.branchVisible = null;
      recomputeOpacityTargets();
      state.fg.refresh();
    }
    if (e.key === 'r' && !e.shiftKey) state.fg.zoomToFit(800, 60);
    if (e.key === 'p' || e.key === 'P') $('#btn-prune').click();
    if (e.key === 'o' || e.key === 'O') $('#btn-oracle').click();
    if (e.key === 'f' || e.key === 'F') {
      state.focusBranch = !state.focusBranch;
      $('#btn-focus').classList.toggle('active', state.focusBranch);
      if (state.selected) computeHighlight(state.selected);
      else { state.branchVisible = null; recomputeOpacityTargets(); }
      state.fg.refresh();
    }
    if (e.altKey && e.key === 'ArrowLeft')  $('#btn-back').click();
    if (e.altKey && e.key === 'ArrowRight') $('#btn-forward').click();
    // Full Hand Navigation : 'S' = toggle sidebar, Space = reset camera
    if (e.key === 's' || e.key === 'S') $('#btn-sidebar').click();
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      state.fg.zoomToFit(800, 80);
    }
    // REAL_HAND_NAVIGATION_FIX : pan clavier WASD + flèches (sans Alt)
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      const STEP = 60;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft')  dx = -STEP;
      if (e.key === 'ArrowRight') dx =  STEP;
      if (e.key === 'ArrowUp')    dy = -STEP;
      if (e.key === 'ArrowDown')  dy =  STEP;
      if (e.key === 'w' || e.key === 'W') dy = -STEP;
      if (e.key === 's' && e.shiftKey) dy = STEP;  // Shift+S only (S alone = sidebar)
      if (e.key === 'a' || e.key === 'A') dx = -STEP;
      if (e.key === 'd' || e.key === 'D') dx =  STEP;
      if ((dx !== 0 || dy !== 0) && window.__zoranPan) {
        e.preventDefault();
        window.__zoranPan(dx, dy);
      }
    }
  });
}

function applyHistory(id) {
  const node = state.graphView.nodes.find(n => n.id === id);
  if (!node) return;
  state.selected = node;
  computeHighlight(node);
  renderDetail(node, state.graphView, pickId => selectNode(pickId, true));
  if (state.fg) {
    const dx = node.x || 0, dy = node.y || 0, dz = node.z || 1;
    const r = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    state.fg.cameraPosition({ x: dx*220/r, y: dy*220/r, z: dz*220/r }, node, 600);
    state.fg.refresh();
  }
  updateHistoryButtons();
}

// ─────────────────────────── boot ──────────────────────────────
async function boot() {
  try {
    state.dataset = await loadLaws();
    state.graph = buildGraph(state.dataset);
    state.index = buildIndex(state.graph.nodes);
    state.graphView = state.graph;
    state.lastAudit = auditGraph(state.graph);
    // GLOBAL_RUNTIME_COUNTERS — load sandbox + cores counts
    state.sandboxCount = 0;
    state.coresDetected = 0;
    try {
      const sb = await fetch('./data/laws_sandbox.json', { cache: 'no-store' });
      if (sb.ok) {
        const j = await sb.json();
        state.sandboxCount = (j.nodes || []).length;
      }
    } catch (_) { /* sandbox may not exist */ }
    try {
      const cr = await fetch('./data/cores.json', { cache: 'no-store' });
      if (cr.ok) {
        const j = await cr.json();
        state.cores = j;
        state.coresDetected = (j.cores || []).length;
      }
    } catch (_) { /* cores may not exist yet */ }
    buildSidebar();
    initGraph();
    setupDraggablePanel();
    setupDraggableChatPopup();   // mission DRAGGABLE_RUNTIME_RESPONSE_POPUP
    wireControls();
    // Mission RUNTIME_COGNITIVE_PATH_COMPETITION : chat bar + 6 routes
    // + mission REALTIME_ROUTE_VISUALIZATION : activer les routes dans le graphe
    wireChatBar(
      state.graph.nodes,
      id => selectNode(id, true),
      result => activateRoutes(result),
      () => deactivateRoutes()
    );
    setStatus();
    updateHistoryButtons();
    console.log('%cZORAN — Arbre Relationnel des Lois (P0.5 INT v2)',
      'color:#ffcc4d;font-size:14px;font-weight:bold');
    console.log('mission_id:', MISSION);
    console.log('audit:', state.lastAudit);
  } catch (err) {
    console.error('Boot failed:', err);
    document.getElementById('graph').innerHTML =
      `<div style="padding:32px;color:#ff6b6b;font-family:monospace">Boot failed: ${err.message}</div>`;
  }
}

boot();
