function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function tierBadge(node) {
  if (!node.attractor_tier) return '';
  return `<span class="z-tier-badge">${esc(node.attractor_tier)}</span>`;
}

function tags(node) {
  const out = [];
  if (node.canonical)  out.push('<span class="tag canonical">canonique</span>');
  if (node.palieronic) out.push('<span class="tag palieronic">palieronique</span>');
  if (node.stability === 'instable') out.push('<span class="tag unstable">instable</span>');
  if (node.stability === 'absorbée') out.push('<span class="tag">absorbée</span>');
  out.push(`<span class="tag">${esc(node.family)}</span>`);
  for (const d of (node.domains || [])) out.push(`<span class="tag">${esc(d)}</span>`);
  return out.join('');
}

function relationsForNode(graph, nodeId) {
  const buckets = { parent: [], child: [], derives: [], iso: [], contradicts: [], related: [], absorbed_into: [], depends: [] };
  for (const l of graph.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (l.kind === 'parent') {
      if (s === nodeId) buckets.parent.push({ id: t, link: l });
      if (t === nodeId) buckets.child.push({ id: s, link: l });
    } else if (s === nodeId || t === nodeId) {
      const other = s === nodeId ? t : s;
      buckets[l.kind].push({ id: other, link: l });
    }
  }
  return buckets;
}

function relBlock(label, entries) {
  if (!entries || entries.length === 0) return '';
  const items = entries.map(e => {
    const inv = e.link.invariants ? ` <span class="inv">(${e.link.invariants.map(esc).join(' · ')})</span>` : '';
    const dom = e.link.domain ? ` <span class="inv">(${esc(e.link.domain)})</span>` : '';
    const reason = e.link.reason ? ` <span class="inv">(${esc(e.link.reason)})</span>` : '';
    return `<a data-pick="${esc(e.id)}">${esc(e.id)}</a>${inv}${dom}${reason}`;
  }).join('');
  return `<section class="relations"><h4>${esc(label)}</h4>${items}</section>`;
}

function framesBlock(node) {
  const f = node.frames;
  if (!f) return '';

  const listOf = (arr) =>
    arr && arr.length
      ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
      : '<span style="color:var(--fg-2)">—</span>';

  const intermediateList = (arr) => {
    if (!arr || !arr.length) return '<span style="color:var(--fg-2)">—</span>';
    return `<ul>${arr.map(e => {
      const lvl = `<span class="level-tag">${esc(e.level)}</span>`;
      return `<li>${lvl}${esc(e.scope)}</li>`;
    }).join('')}</ul>`;
  };

  return `
    <section>
      <h4>Cadres de calcul</h4>
      <div class="frames">
        <div class="frames-row row-local">
          <span class="frames-glyph">⊙</span>
          <span class="frames-label">Local</span>
          <span class="frames-content">${listOf(f.local)}</span>
        </div>
        <div class="frames-row row-intermediate">
          <span class="frames-glyph">◉</span>
          <span class="frames-label">Intermédiaire</span>
          <span class="frames-content">${intermediateList(f.intermediate)}</span>
        </div>
        <div class="frames-row row-global">
          <span class="frames-glyph">⊕</span>
          <span class="frames-label">Global</span>
          <span class="frames-content">${listOf(f.global)}</span>
        </div>
        <div class="frames-row row-proxies">
          <span class="frames-glyph">↻</span>
          <span class="frames-label">Proxies</span>
          <span class="frames-content">${listOf(f.proxies)}</span>
        </div>
        <div class="frames-row row-limits">
          <span class="frames-glyph">⊘</span>
          <span class="frames-label">Limites</span>
          <span class="frames-content">${listOf(f.limits)}</span>
        </div>
      </div>
    </section>
  `;
}

function compositionsBlock(graph, nodeId) {
  const comps = (graph.compositions || []).filter(c => c.pair && c.pair.includes(nodeId));
  if (!comps.length) return '';
  const items = comps.map(c => {
    const other = c.pair.find(x => x !== nodeId) || c.pair[0];
    const preserved = (c.preserved || []).map(esc).join(' · ');
    const delta = (c.delta_S_global ?? 0).toFixed(2);
    const sign = c.delta_S_global > 0 ? '+' : '';
    return `<li><strong>${esc(c.operator || c.pair.join(' ∘ '))}</strong> · paire ${esc(other)}<br>
      <span class="inv">préserve: ${preserved}</span><br>
      <span class="inv">ΔS_global = ${sign}${delta} — ${esc(c.status || 'admissible')}</span></li>`;
  }).join('');
  return `<section><h4>Compositions opératoires</h4><ul class="examples">${items}</ul></section>`;
}

function fractalityBlock(graph, node) {
  const family = (graph.families || []).find(f => f.id === node.family);
  if (!family || !family.fractality_demonstrated) return '';
  return `<section><h4>Fractalité démontrée — famille ${esc(family.id)}</h4>
    <p class="desc">${esc(family.fractality_proof_motif || 'motif fractal démontré')}</p></section>`;
}

export function renderDetail(node, graph, onPick) {
  const detail = document.getElementById('detail');
  const body = document.getElementById('detail-body');
  const titleMini = document.getElementById('detail-title-mini');
  if (!node) {
    detail.classList.add('hidden');
    detail.setAttribute('aria-hidden', 'true');
    if (titleMini) titleMini.textContent = '';
    return;
  }
  if (titleMini) titleMini.textContent = `${node.id} — ${node.title}`;

  const eqs = (node.equations || []).map(e => `<code>${esc(e)}</code>`).join('');
  const ex  = (node.examples  || []).map(e => `<li>${esc(e)}</li>`).join('');
  const buckets = relationsForNode(graph, node.id);
  const family = (graph.families || []).find(f => f.id === node.family);
  const familyInvariant = family?.invariant
    ? `<section><h4>Invariant de famille</h4><p class="desc">${esc(family.invariant)}</p></section>`
    : '';
  const sGlobalLabel = graph.p0_5_meta && graph.p0_5_meta.compositions_demonstrated >= 3 && graph.p0_5_meta.fractal_families && graph.p0_5_meta.fractal_families.length >= 1
    ? 'S_global (loi)'
    : 'S_global (proxy)';

  body.innerHTML = `
    <h2>${tierBadge(node)}${esc(node.title)}</h2>
    <div class="meta">${esc(node.id)} · famille <strong>${esc(node.family)}</strong> · poids ${(node.weight ?? 0).toFixed(2)}</div>
    <div class="tags">${tags(node)}</div>
    <section><p class="desc">${esc(node.html_description || '')}</p></section>
    <section><div class="scores">
      <div class="score"><div class="v">${(node.S_local  ?? 0).toFixed(2)}</div><div class="l">S_local</div></div>
      <div class="score"><div class="v">${(node.S_global ?? 0).toFixed(2)}</div><div class="l">${esc(sGlobalLabel)}</div></div>
    </div></section>
    ${framesBlock(node)}
    ${eqs ? `<section class="equations"><h4>Équations</h4>${eqs}</section>` : ''}
    ${ex  ? `<section><h4>Exemples</h4><ul class="examples">${ex}</ul></section>` : ''}
    ${familyInvariant}
    ${fractalityBlock(graph, node)}
    ${compositionsBlock(graph, node.id)}
    ${relBlock('Parent',         buckets.parent)}
    ${relBlock('Enfants',        buckets.child)}
    ${relBlock('Dérive de',      buckets.derives)}
    ${relBlock('Isomorphismes',  buckets.iso)}
    ${relBlock('Contradictions', buckets.contradicts)}
    ${relBlock('Reliées',        buckets.related)}
    ${relBlock('Absorbe',        buckets.absorbed_into)}
    ${relBlock('Dépend de',      buckets.depends)}
    ${node.doi ? `<section><h4>DOI</h4><code>${esc(node.doi)}</code></section>` : ''}
  `;

  body.querySelectorAll('a[data-pick]').forEach(a => {
    a.addEventListener('click', () => onPick(a.dataset.pick));
  });

  detail.classList.remove('hidden');
  detail.setAttribute('aria-hidden', 'false');
}
