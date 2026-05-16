function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function tierBadge(node) {
  const parts = [];
  if (node.superior_law_candidate) {
    const p = (node.superior_law_probability ?? 0).toFixed(2);
    parts.push(`<span class="z-superior-badge" title="Loi supérieure détectée (probability ${p})">★ SUPÉRIEURE</span>`);
  }
  if (node.attractor_tier) {
    parts.push(`<span class="z-tier-badge">${esc(node.attractor_tier)}</span>`);
  }
  return parts.join('');
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

function superiorBlock(node) {
  const p = node.superior_law_probability;
  if (p == null) return '';
  const isCand = node.superior_law_candidate;
  const detail = node.superior_score_detail || {};
  const label = isCand ? 'Loi supérieure détectée' : 'Score loi supérieure';
  return `<section>
    <h4>${esc(label)} ${isCand ? '★' : ''}</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">Σ</span>
        <span class="frames-label">Probability</span>
        <span class="frames-content"><strong>${p.toFixed(3)}</strong>
        ${isCand ? '<span style="color:var(--accent);margin-left:8px">≥ 0.50 ✓</span>' :
                   '<span style="color:var(--fg-2);margin-left:8px">< 0.50</span>'}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊙</span>
        <span class="frames-label">Composition</span>
        <span class="frames-content">${(detail.composition ?? 0).toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">◉</span>
        <span class="frames-label">Multi-échelle</span>
        <span class="frames-content">${detail.multi_scale ?? 0} niveau(x)</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊕</span>
        <span class="frames-label">Branches</span>
        <span class="frames-content">${detail.branches_explained ?? 0} expliquées</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">↻</span>
        <span class="frames-label">Cross-domain</span>
        <span class="frames-content">${detail.cross_domain ?? 0} domaines</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊗</span>
        <span class="frames-label">Réutilisabilité</span>
        <span class="frames-content">${detail.reusability ?? 0} citations entrantes</span>
      </div>
    </div>
  </section>`;
}

function distributedBlock(node) {
  if (node.distributed_validation_score == null) return '';
  const dvs = node.distributed_validation_score;
  const gss = node.graph_survival_score ?? 0;
  const cr = node.composition_resilience ?? 0;
  const cgs = node.cross_graph_stability ?? 0;
  const hc = node.hierarchical_confidence ?? 0;
  const confLabel = hc >= 0.70 ? '<span style="color:var(--accent)">forte</span>' :
                    hc >= 0.50 ? '<span style="color:#3ad17a">modérée</span>' :
                    '<span style="color:var(--fg-2)">faible</span>';
  return `<section>
    <h4>Validation distribuée (graphe entier)</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">⇄</span>
        <span class="frames-label">Validation</span>
        <span class="frames-content"><strong>${dvs.toFixed(3)}</strong> · compatibilités voisinage</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">▲</span>
        <span class="frames-label">Survie graphe</span>
        <span class="frames-content"><strong>${gss.toFixed(3)}</strong> · impact si retrait</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊙</span>
        <span class="frames-label">Résilience comp.</span>
        <span class="frames-content"><strong>${cr.toFixed(3)}</strong> · stabilité compositions</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊕</span>
        <span class="frames-label">Stabilité cross-G</span>
        <span class="frames-content"><strong>${cgs.toFixed(3)}</strong> · à travers familles</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">★</span>
        <span class="frames-label">Confiance hiér.</span>
        <span class="frames-content"><strong>${hc.toFixed(3)}</strong> · consensus ${confLabel}</span>
      </div>
    </div>
  </section>`;
}

function temporalBlock(node) {
  if (node.temporal_stability == null) return '';
  const ts = node.temporal_stability;
  const pr = node.perturbation_resistance ?? 0;
  const ss = node.survival_score ?? 0;
  const csp = node.cross_scale_persistence ?? 0;
  const mc = node.maintenance_cost ?? 0;
  const cp = node.collapse_probability ?? 0;
  const sps = node.selection_pressure_score ?? 0;
  const cps = node.coherence_pressure_score ?? 0;
  const dsr = node.dynamic_selection_rank ?? null;
  const dsrBadge = dsr !== null && dsr <= 25
    ? `<span style="color:var(--accent);font-weight:700">rang #${dsr} · top 25</span>`
    : dsr !== null ? `<span style="color:var(--fg-2)">rang #${dsr}</span>` : '';
  const collapseColor = cp <= 0.30 ? '#3ad17a' : cp <= 0.60 ? 'var(--accent)' : 'var(--unstable)';
  return `<section>
    <h4>Sélection temporelle (dynamique réelle) ${dsrBadge}</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">⌚</span>
        <span class="frames-label">Stabilité temp.</span>
        <span class="frames-content"><strong>${ts.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⨯</span>
        <span class="frames-label">Résist. pertur.</span>
        <span class="frames-content"><strong>${pr.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">↯</span>
        <span class="frames-label">Survie</span>
        <span class="frames-content"><strong>${ss.toFixed(3)}</strong> · sous retrait dépendance</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊞</span>
        <span class="frames-label">Persistance</span>
        <span class="frames-content"><strong>${csp.toFixed(3)}</strong> · multi-échelle</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€</span>
        <span class="frames-label">Coût maint.</span>
        <span class="frames-content"><strong>${mc.toFixed(3)}</strong> · plus haut = moins coûteux</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⚠</span>
        <span class="frames-label">P(collapse)</span>
        <span class="frames-content"><strong style="color:${collapseColor}">${cp.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">Π</span>
        <span class="frames-label">Pression sél.</span>
        <span class="frames-content"><strong>${sps.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">▾</span>
        <span class="frames-label">Pression cohér.</span>
        <span class="frames-content"><strong>${cps.toFixed(3)}</strong> · ce que "le réel" sélectionne</span>
      </div>
    </div>
  </section>`;
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
    ${superiorBlock(node)}
    ${distributedBlock(node)}
    ${temporalBlock(node)}
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
