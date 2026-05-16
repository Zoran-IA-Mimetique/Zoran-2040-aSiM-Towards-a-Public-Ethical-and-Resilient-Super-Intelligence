function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function tags(node) {
  const out = [];
  if (node.attractor_tier === 'μ0') out.push('<span class="tag attractor">attracteur μ0</span>');
  else if (node.attractor_tier === 'μ1') out.push('<span class="tag attractor">attracteur μ1</span>');
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

function relBlock(label, entries, onPick) {
  if (!entries || entries.length === 0) return '';
  const items = entries.map(e => {
    const inv = e.link.invariants ? ` <span class="inv">(${e.link.invariants.map(esc).join(' · ')})</span>` : '';
    const dom = e.link.domain ? ` <span class="inv">(${esc(e.link.domain)})</span>` : '';
    const reason = e.link.reason ? ` <span class="inv">(${esc(e.link.reason)})</span>` : '';
    return `<a data-pick="${esc(e.id)}">${esc(e.id)}</a>${inv}${dom}${reason}`;
  }).join('');
  return `<section class="relations"><h4>${esc(label)}</h4>${items}</section>`;
}

export function renderDetail(node, graph, onPick) {
  const detail = document.getElementById('detail');
  const body = document.getElementById('detail-body');
  if (!node) {
    detail.classList.add('hidden');
    detail.setAttribute('aria-hidden', 'true');
    return;
  }

  const eqs = (node.equations || []).map(e => `<code>${esc(e)}</code>`).join('');
  const ex  = (node.examples  || []).map(e => `<li>${esc(e)}</li>`).join('');
  const buckets = relationsForNode(graph, node.id);
  const family = (graph.families || []).find(f => f.id === node.family);
  const familyInvariant = family?.invariant
    ? `<section><h4>Invariant de famille</h4><p class="desc">${esc(family.invariant)}</p></section>`
    : '';

  body.innerHTML = `
    <h2>${esc(node.title)}</h2>
    <div class="meta">${esc(node.id)} · famille <strong>${esc(node.family)}</strong> · poids ${(node.weight ?? 0).toFixed(2)}</div>
    <div class="tags">${tags(node)}</div>
    <section><p class="desc">${esc(node.html_description || '')}</p></section>
    <section><div class="scores">
      <div class="score"><div class="v">${(node.S_local  ?? 0).toFixed(2)}</div><div class="l">S_local</div></div>
      <div class="score"><div class="v">${(node.S_global ?? 0).toFixed(2)}</div><div class="l">S_global (loi)</div></div>
    </div></section>
    ${eqs ? `<section class="equations"><h4>Équations</h4>${eqs}</section>` : ''}
    ${ex  ? `<section><h4>Exemples</h4><ul class="examples">${ex}</ul></section>` : ''}
    ${familyInvariant}
    ${relBlock('Parent',         buckets.parent,        onPick)}
    ${relBlock('Enfants',        buckets.child,         onPick)}
    ${relBlock('Dérive de',      buckets.derives,       onPick)}
    ${relBlock('Isomorphismes',  buckets.iso,           onPick)}
    ${relBlock('Contradictions', buckets.contradicts,   onPick)}
    ${relBlock('Reliées',        buckets.related,       onPick)}
    ${relBlock('Absorbe',        buckets.absorbed_into, onPick)}
    ${relBlock('Dépend de',      buckets.depends,       onPick)}
    ${node.doi ? `<section><h4>DOI</h4><code>${esc(node.doi)}</code></section>` : ''}
  `;

  body.querySelectorAll('a[data-pick]').forEach(a => {
    a.addEventListener('click', () => onPick(a.dataset.pick));
  });

  detail.classList.remove('hidden');
  detail.setAttribute('aria-hidden', 'false');
}
