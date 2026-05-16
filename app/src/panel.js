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

function propagatedBlock(node) {
  if (node.S_propagated == null) return '';
  const sRaw = node.S_local_raw ?? node.S_local ?? 0;
  const sProp = node.S_propagated;
  const gap = sRaw - sProp;
  const gapColor = gap > 0.20 ? 'var(--unstable)' : gap > 0.10 ? 'var(--accent)' : '#3ad17a';
  const depLoad = node.dependency_load ?? 0;
  const implCount = node.implicit_constraint_count ?? 0;
  const rtCost = node.runtime_cost ?? 0;
  const tCost = node.temporal_cost ?? 0;
  const stabAfter = node.stability_after_propagation ?? 0;
  const cgp = node.cross_graph_pressure ?? 0;
  return `<section>
    <h4>S propagé (coût réel contextuel)</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">S₀</span>
        <span class="frames-label">S_local raw</span>
        <span class="frames-content"><strong>${sRaw.toFixed(3)}</strong> · cohérence naïve</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">S↻</span>
        <span class="frames-label">S propagé</span>
        <span class="frames-content"><strong>${sProp.toFixed(3)}</strong>
          <span style="color:${gapColor};margin-left:8px">gap ${gap >= 0 ? '−' : '+'}${Math.abs(gap).toFixed(3)}</span></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊥</span>
        <span class="frames-label">Dep. load</span>
        <span class="frames-content"><strong>${depLoad.toFixed(3)}</strong> · BFS-2 pondéré</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">#</span>
        <span class="frames-label">Contraintes impl.</span>
        <span class="frames-content"><strong>${implCount}</strong> · iso+comp+invariants</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€r</span>
        <span class="frames-label">Coût runtime</span>
        <span class="frames-content"><strong>${rtCost.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€t</span>
        <span class="frames-label">Coût temporel</span>
        <span class="frames-content"><strong>${tCost.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⇉</span>
        <span class="frames-label">Stab. post-prop.</span>
        <span class="frames-content"><strong>${stabAfter.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⇊</span>
        <span class="frames-label">Pression cross-G</span>
        <span class="frames-content"><strong>${cgp.toFixed(3)}</strong></span>
      </div>
    </div>
  </section>`;
}

function experimentalBlock(node) {
  if (node.runtime_sustainability == null) return '';
  const rs = node.runtime_sustainability;
  const lts = node.long_term_stability ?? 0;
  const fs = node.frugality_score ?? 0;
  const cs = node.collapse_sensitivity ?? 0;
  const classes = node.experimental_classes || [];
  const curve = node.propagated_cost_curve || [];
  const classColor = c => ({
    'fondatrice':'var(--canonical)',
    'survivante':'#3ad17a',
    'frugale':'var(--accent)',
    'runtime_critique':'#b86bff',
    'toxique_propagationnelle':'var(--unstable)',
    'neutre':'var(--fg-2)'
  }[c] || 'var(--fg-2)');
  const classBadges = classes.map(c =>
    `<span style="display:inline-block;background:${classColor(c)};color:#07080c;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin:1px">${esc(c)}</span>`
  ).join('');
  const cursColor = cs > 0.50 ? 'var(--unstable)' : cs > 0.20 ? 'var(--accent)' : '#3ad17a';
  // mini-curve sparkline
  const sparkPath = curve.length > 1
    ? curve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 20} ${30 - v * 25}`).join(' ')
    : '';
  return `<section>
    <h4>Soutenabilité runtime (expérimentale)</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">★★</span>
        <span class="frames-label">Classes</span>
        <span class="frames-content">${classBadges || '<span style="color:var(--fg-2)">aucune</span>'}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">∞</span>
        <span class="frames-label">Sustainability</span>
        <span class="frames-content"><strong>${rs.toFixed(3)}</strong> · long terme</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">≈</span>
        <span class="frames-label">Long-term stab.</span>
        <span class="frames-content"><strong>${lts.toFixed(3)}</strong> · variance inverse</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€¢</span>
        <span class="frames-label">Frugality</span>
        <span class="frames-content"><strong>${fs.toFixed(3)}</strong> · impact / coût</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⚡</span>
        <span class="frames-label">Collapse sens.</span>
        <span class="frames-content"><strong style="color:${cursColor}">${cs.toFixed(3)}</strong></span>
      </div>
      ${sparkPath ? `<div class="frames-row"><span class="frames-glyph">↝</span>
        <span class="frames-label">Cost curve</span>
        <span class="frames-content">
          <svg width="220" height="32" style="vertical-align:middle">
            <path d="${sparkPath}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
          </svg>
        </span>
      </div>` : ''}
    </div>
  </section>`;
}

function llmRelevanceBlock(node) {
  if (node.llm_relevance_score == null) return '';
  const llm = node.llm_relevance_score;
  const ri = node.runtime_impact_score ?? 0;
  const ah = node.anti_hallucination_score ?? 0;
  const cg = node.contextualization_gain ?? 0;
  const cdr = node.cross_domain_reuse ?? 0;
  const rss = node.runtime_survival_score ?? 0;
  const cp = node.canonical_priority ?? 0;
  const tier = llm >= 0.65 ? 'fondamentale'
             : llm >= 0.55 ? 'majeure'
             : llm >= 0.45 ? 'utile'
             : llm >= 0.30 ? 'marginale'
             : 'non pertinente';
  const tierColor = llm >= 0.55 ? 'var(--accent)'
                  : llm >= 0.45 ? '#3ad17a'
                  : llm >= 0.30 ? 'var(--fg-1)'
                  : 'var(--unstable)';
  return `<section>
    <h4>Pertinence LLM (utilité ZORANs)</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">Λ</span>
        <span class="frames-label">LLM score</span>
        <span class="frames-content"><strong style="color:${tierColor}">${llm.toFixed(3)}</strong>
          <span style="color:${tierColor};margin-left:8px">${tier}</span></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊳</span>
        <span class="frames-label">Runtime impact</span>
        <span class="frames-content"><strong>${ri.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">✕</span>
        <span class="frames-label">Anti-hallu</span>
        <span class="frames-content"><strong>${ah.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊞</span>
        <span class="frames-label">Context gain</span>
        <span class="frames-content"><strong>${cg.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">↻</span>
        <span class="frames-label">Cross-domain reuse</span>
        <span class="frames-content"><strong>${cdr.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⌛</span>
        <span class="frames-label">Runtime survival</span>
        <span class="frames-content"><strong>${rss.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">‖</span>
        <span class="frames-label">Canonical priority</span>
        <span class="frames-content"><strong>${cp.toFixed(3)}</strong></span>
      </div>
    </div>
  </section>`;
}

function boundaryBlock(node) {
  if (node.boundary_score == null) return '';
  const bs = node.boundary_score;
  const td = node.topic_distance;
  const rr = node.runtime_relevance ?? 0;
  const pc = node.propagation_cost ?? 0;
  const dp = node.drift_probability ?? 0;
  const ig = node.information_gain ?? 0;
  const cd = node.contextual_density ?? 0;
  const pdl = node.propagation_depth_limit ?? 2;
  const rfs = node.runtime_focus_score ?? 0;
  const driftColor = dp > 0.50 ? 'var(--unstable)' : dp > 0.30 ? 'var(--accent)' : '#3ad17a';
  const bsColor = bs > 0.65 ? '#3ad17a' : bs > 0.45 ? 'var(--accent)' : 'var(--fg-2)';
  return `<section>
    <h4>Bornage contextuel (sujet actif)</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">⊕</span>
        <span class="frames-label">Boundary</span>
        <span class="frames-content"><strong style="color:${bsColor}">${bs.toFixed(3)}</strong> · prioritaire runtime si > 0.65</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">↦</span>
        <span class="frames-label">Topic distance</span>
        <span class="frames-content"><strong>${td}</strong> · BFS depuis ancres</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊙</span>
        <span class="frames-label">Runtime relev.</span>
        <span class="frames-content"><strong>${rr.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€p</span>
        <span class="frames-label">Coût propag.</span>
        <span class="frames-content"><strong>${pc.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⚠</span>
        <span class="frames-label">Drift proba.</span>
        <span class="frames-content"><strong style="color:${driftColor}">${dp.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">Δ</span>
        <span class="frames-label">Info gain</span>
        <span class="frames-content"><strong>${ig.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊞</span>
        <span class="frames-label">Context density</span>
        <span class="frames-content"><strong>${cd.toFixed(3)}</strong></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⇣</span>
        <span class="frames-label">Depth limit</span>
        <span class="frames-content"><strong>${pdl}</strong> · BFS max recommandé</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">◎</span>
        <span class="frames-label">Focus runtime</span>
        <span class="frames-content"><strong>${rfs.toFixed(3)}</strong></span>
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

function generativeBlock(node) {
  if (node.generative_relevance == null) return '';
  const gr = node.generative_relevance;
  const cs = node.child_stability_score ?? 0;
  const leq = node.local_exploration_quality ?? 0;
  const dv = node.derivation_validity ?? 0;
  const ge = node.generation_entropy ?? 0;
  const ogc = node.oracle_generation_confidence ?? 0;
  const scope = node.generative_scope || [];
  const forbidden = node.forbidden_expansions || [];
  const depthLimit = node.generation_depth_limit ?? 0;
  const genCost = node.generation_cost ?? 0;
  const profile = gr >= 0.60 ? 'attracteur génératif'
                : gr >= 0.40 ? 'générateur correct'
                : gr >= 0.25 ? 'générateur faible'
                : 'stérile';
  const profileColor = gr >= 0.60 ? '#3ad17a'
                     : gr >= 0.40 ? 'var(--accent)'
                     : gr >= 0.25 ? 'var(--fg-2)'
                     : 'var(--unstable)';
  const scopeBadges = scope.slice(0, 6).map(s =>
    `<span style="display:inline-block;background:var(--bg-2);color:var(--canonical);font-size:9px;padding:1px 5px;border-radius:3px;margin:1px;border:1px solid var(--line)">${esc(s)}</span>`
  ).join('');
  return `<section>
    <h4>Capacité générative distribuée</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">⚛</span>
        <span class="frames-label">Profil génér.</span>
        <span class="frames-content"><strong style="color:${profileColor}">${profile}</strong> · relevance ${gr.toFixed(3)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">≼</span>
        <span class="frames-label">Scope autorisé</span>
        <span class="frames-content">${scopeBadges || '<span style="color:var(--fg-2)">aucun</span>'}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊘</span>
        <span class="frames-label">Profondeur lim</span>
        <span class="frames-content"><strong>${depthLimit}</strong> · ${forbidden.length} expansions interdites</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">✓</span>
        <span class="frames-label">Validité dériv.</span>
        <span class="frames-content"><strong>${dv.toFixed(3)}</strong> · stabilité filles ${cs.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">≀</span>
        <span class="frames-label">Entropie gén.</span>
        <span class="frames-content"><strong>${ge.toFixed(3)}</strong> · qual. explo. ${leq.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊙</span>
        <span class="frames-label">Oracle conf.</span>
        <span class="frames-content"><strong>${ogc.toFixed(3)}</strong> · coût gén. ${genCost.toFixed(2)}</span>
      </div>
    </div>
  </section>`;
}

function selectionBlock(node) {
  if (node.selection_priority == null) return '';
  const sp = node.selection_priority;
  const tr = node.topic_relevance ?? 0;
  const ig = node.information_gain ?? 0;
  const ce = node.cognitive_efficiency ?? 0;
  const mpc = node.minimum_precision_contribution ?? 0;
  const rcr = node.runtime_cost_ratio ?? 0;
  const pe = node.propagation_efficiency ?? 0;
  const adm = node.threshold_admissibility;
  const tier = sp >= 0.55 ? 'haute priorité'
             : sp >= 0.45 ? 'admissible'
             : sp >= 0.30 ? 'marginal'
             : 'rejeté seuil';
  const tierColor = sp >= 0.55 ? '#3ad17a'
                  : sp >= 0.45 ? 'var(--accent)'
                  : sp >= 0.30 ? 'var(--fg-2)'
                  : 'var(--unstable)';
  const admDot = adm
    ? '<span style="color:#3ad17a">✓ admis</span>'
    : '<span style="color:var(--unstable)">✗ sous seuil</span>';
  return `<section>
    <h4>Sélection cognitive runtime</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">▲</span>
        <span class="frames-label">Priorité sél.</span>
        <span class="frames-content"><strong style="color:${tierColor}">${tier}</strong> · ${sp.toFixed(3)} · ${admDot}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊕</span>
        <span class="frames-label">Sujet pertin.</span>
        <span class="frames-content"><strong>${tr.toFixed(3)}</strong> · gain info ${ig.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⚖</span>
        <span class="frames-label">Cog. efficiency</span>
        <span class="frames-content"><strong>${ce.toFixed(3)}</strong> · contrib. précis. ${mpc.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⊟</span>
        <span class="frames-label">Coût runtime</span>
        <span class="frames-content"><strong>${rcr.toFixed(3)}</strong> · propag. eff. ${pe.toFixed(2)}</span>
      </div>
    </div>
  </section>`;
}

function noiseBlock(node) {
  if (node.signal_to_noise == null) return '';
  const snr = node.signal_to_noise;
  const nc = node.noise_contribution ?? 0;
  const rg = node.runtime_gain ?? 0;
  const fr = node.frugality_ratio ?? 0;
  const dr = node.drift_risk ?? 0;
  const ppc = node.precision_per_cost ?? 0;
  const su = node.structural_usefulness ?? 0;
  const keep = node.keep_runtime;
  const verdict = keep
    ? '<strong style="color:#3ad17a">✓ keep runtime</strong>'
    : '<strong style="color:var(--unstable)">✗ noise/reject</strong>';
  const snrColor = snr >= 0.70 ? '#3ad17a'
                 : snr >= 0.50 ? 'var(--accent)'
                 : snr >= 0.30 ? 'var(--fg-2)'
                 : 'var(--unstable)';
  const ncColor = nc <= 0.30 ? '#3ad17a'
                : nc <= 0.50 ? 'var(--accent)' : 'var(--unstable)';
  // ascii bar [▮▮▮▯▯] for S/N
  const bars = Math.round(snr * 5);
  const bar = '▮'.repeat(bars) + '▯'.repeat(5 - bars);
  return `<section>
    <h4>Bruit runtime · signal-to-noise</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">≷</span>
        <span class="frames-label">Décision</span>
        <span class="frames-content">${verdict} · gain ${rg.toFixed(3)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">∿</span>
        <span class="frames-label">S/N ratio</span>
        <span class="frames-content"><strong style="color:${snrColor}">${snr.toFixed(3)}</strong> <span style="font-family:ui-monospace,monospace;color:${snrColor}">${bar}</span></span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⌗</span>
        <span class="frames-label">Bruit ajouté</span>
        <span class="frames-content"><strong style="color:${ncColor}">${nc.toFixed(3)}</strong> · drift ${dr.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">€</span>
        <span class="frames-label">Frugalité</span>
        <span class="frames-content"><strong>${fr.toFixed(3)}</strong> · précision/coût ${ppc.toFixed(2)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">▣</span>
        <span class="frames-label">Util. struct.</span>
        <span class="frames-content"><strong>${su.toFixed(3)}</strong> · indépendante du runtime</span>
      </div>
    </div>
  </section>`;
}

function provenanceBlock(node) {
  if (!node.sha512 && !node.law_relevance_index) return '';
  const lri = node.law_relevance_index;
  const kp = node.keep_probability;
  const rs = node.retention_status;
  const ver = node.version || 1;
  const sha = node.sha_short || (node.sha512 || '').slice(0, 12);
  const ts = node.timestamp_utc || '';
  const lmts = node.last_modified_utc || '';
  const origin = node.origin_engine || '?';
  const parents = node.parent_laws || [];
  const children = node.child_laws || [];
  const cstatus = node.canonical_status || '?';
  const rstatus = node.runtime_status || '?';
  const coreId = node.core_id && node.core_id !== 'orphan' ? node.core_id : null;
  const retentColor = {
    'canonical':'#3ad17a',
    'runtime_candidate':'var(--accent)',
    'sandbox':'var(--canonical)',
    'archive':'var(--fg-2)',
    'purge_candidate':'var(--unstable)',
  }[rs] || 'var(--fg-1)';
  return `<section>
    <h4>Provenance + rétention</h4>
    <div class="frames">
      <div class="frames-row"><span class="frames-glyph">⌧</span>
        <span class="frames-label">SHA + version</span>
        <span class="frames-content"><code style="font-size:10px;background:transparent;padding:0">${esc(sha)}</code> · v${ver} · ${esc(origin)}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⌚</span>
        <span class="frames-label">Timestamps</span>
        <span class="frames-content" style="font-size:10px">créée ${esc(ts.slice(0,19))} · maj ${esc(lmts.slice(0,19))}</span>
      </div>
      <div class="frames-row"><span class="frames-glyph">⇡</span>
        <span class="frames-label">Filiation</span>
        <span class="frames-content">${parents.length} parents · ${children.length} enfants${coreId ? ` · noyau <strong>${esc(coreId)}</strong>` : ''}</span>
      </div>
      ${lri != null ? `<div class="frames-row"><span class="frames-glyph">⌭</span>
        <span class="frames-label">LRI / Keep p.</span>
        <span class="frames-content"><strong>${lri.toFixed(3)}</strong> · keep ${kp.toFixed(3)} · <strong style="color:${retentColor}">${esc(rs)}</strong></span>
      </div>` : ''}
      <div class="frames-row"><span class="frames-glyph">⊟</span>
        <span class="frames-label">Statuts</span>
        <span class="frames-content" style="font-size:10px">canonical: ${esc(cstatus)} · runtime: ${esc(rstatus)}</span>
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
    ${noiseBlock(node)}
    ${provenanceBlock(node)}
    ${superiorBlock(node)}
    ${selectionBlock(node)}
    ${generativeBlock(node)}
    ${llmRelevanceBlock(node)}
    ${experimentalBlock(node)}
    ${propagatedBlock(node)}
    ${boundaryBlock(node)}
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
