export function auditGraph(graph) {
  const report = {
    timestamp: new Date().toISOString(),
    counts: { nodes: graph.nodes.length, links: graph.links.length },
    issues: [],
    metrics: {}
  };
  const byId = new Map(graph.nodes.map(n => [n.id, n]));

  for (const n of graph.nodes) {
    if (n.S_local != null && n.S_global != null) {
      const gap = n.S_local - n.S_global;
      if (gap > 0.30) {
        report.issues.push({ severity: 'false_coherence', node: n.id, gap: +gap.toFixed(2) });
      }
    }
    if (!n.canonical && !byId.has(n.id)) {
      report.issues.push({ severity: 'orphan', node: n.id });
    }
  }

  for (const l of graph.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (!byId.has(s) || !byId.has(t)) {
      report.issues.push({ severity: 'broken_ref', link: { s, t, kind: l.kind } });
    }
    if (l.kind === 'iso' && (!l.invariants || l.invariants.length === 0)) {
      report.issues.push({ severity: 'iso_without_invariants', link: { s, t } });
    }
  }

  const slocal  = graph.nodes.map(n => n.S_local  ?? 0);
  const sglobal = graph.nodes.map(n => n.S_global ?? 0);
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

  const inflationDeguised = graph.nodes.filter(n => /^(VAR|ISO)-/.test(n.id) && n.family !== 'VAR' && n.family !== 'ISO').length;
  const inflationRatio = inflationDeguised / Math.max(1, graph.nodes.length);

  const isoEdges = graph.links.filter(l => l.kind === 'iso');
  const isoWithInvariants = isoEdges.filter(l => l.invariants && l.invariants.length > 0).length;
  const isoInvariantsRatio = isoEdges.length === 0 ? 1 : isoWithInvariants / isoEdges.length;

  const contradictsEdges = graph.links.filter(l => l.kind === 'contradicts').length / 2; // réciprocité → /2
  const contradictionsDensity = contradictsEdges / Math.max(1, graph.nodes.length);
  const contradictionsCalibrated = contradictionsDensity >= 0.04 && contradictionsDensity <= 0.15 ? 1 : 0;

  const compositions = (graph.compositions || []).length;
  const attractorsMu0 = graph.nodes.filter(n => n.attractor_tier === 'μ0').length;
  const C_composition = attractorsMu0 === 0 ? 0 : Math.min(1, compositions / Math.max(3, attractorsMu0));

  const fractalFamilies = (graph.families || []).filter(f => f.fractality_demonstrated === true).length;
  const passesFractalPropertyRatio = Math.min(1, fractalFamilies / 3);

  const totalRefs = graph.links.length;
  const brokenRefs = report.issues.filter(i => i.severity === 'broken_ref').length;
  const C_struct = totalRefs === 0 ? 1 : 1 - brokenRefs / totalRefs;

  const S_global_computed = 0.35 * C_struct
                          + 0.40 * C_composition
                          + 0.15 * isoInvariantsRatio
                          - 0.10 * Math.min(0.20, contradictionsDensity);

  const HS = 0.25 * (1 - inflationRatio)
           + 0.30 * passesFractalPropertyRatio
           + 0.20 * C_composition
           + 0.15 * isoInvariantsRatio
           + 0.10 * contradictionsCalibrated;

  report.metrics = {
    S_local_avg:  +avg(slocal).toFixed(3),
    S_global_proxy_avg: +avg(sglobal).toFixed(3),
    S_global_computed:  +S_global_computed.toFixed(3),
    S_global_published: C_composition >= 3 / Math.max(1, attractorsMu0) ? `${S_global_computed.toFixed(2)}` : `proxy:${S_global_computed.toFixed(2)}`,
    gap_avg: +(avg(slocal) - avg(sglobal)).toFixed(3),
    density: +(graph.links.length / Math.max(1, graph.nodes.length)).toFixed(2),
    inflation_ratio: +inflationRatio.toFixed(3),
    iso_invariants_ratio: +isoInvariantsRatio.toFixed(3),
    contradictions_count: contradictsEdges,
    contradictions_density: +contradictionsDensity.toFixed(3),
    C_composition: +C_composition.toFixed(3),
    C_struct: +C_struct.toFixed(3),
    fractal_families: fractalFamilies,
    HS: +HS.toFixed(3),
    families: countBy(graph.nodes, n => n.family),
    attractors: { mu0: attractorsMu0, mu1: graph.nodes.filter(n => n.attractor_tier === 'μ1').length }
  };

  return report;
}

function countBy(arr, fn) {
  const out = {};
  for (const x of arr) { const k = fn(x); out[k] = (out[k] || 0) + 1; }
  return out;
}

export function formatReport(r) {
  const m = r.metrics;
  const lines = [];
  lines.push(`ORACLE AUDIT — ${r.timestamp}`);
  lines.push(``);
  lines.push(`Nodes: ${r.counts.nodes}   Links: ${r.counts.links}   Density: ${m.density}`);
  lines.push(`S_local avg = ${m.S_local_avg}`);
  lines.push(`S_global   = ${m.S_global_published}   (computed ${m.S_global_computed})`);
  lines.push(`HS (structural honesty) = ${m.HS}`);
  lines.push(``);
  lines.push(`Inflation ratio     = ${m.inflation_ratio}`);
  lines.push(`Iso w/ invariants   = ${m.iso_invariants_ratio}`);
  lines.push(`Contradictions      = ${m.contradictions_count}  (density ${m.contradictions_density})`);
  lines.push(`Compositions C_comp = ${m.C_composition}`);
  lines.push(`Fractal families    = ${m.fractal_families}`);
  lines.push(`Attractors          = μ0:${m.attractors.mu0}  μ1:${m.attractors.mu1}`);
  lines.push(`Families            = ${Object.entries(m.families).map(([k,v])=>`${k}:${v}`).join(' · ')}`);
  if (r.issues.length === 0) {
    lines.push(``);
    lines.push(`No structural issues detected.`);
  } else {
    lines.push(``);
    lines.push(`Issues (${r.issues.length}):`);
    for (const i of r.issues.slice(0, 20)) {
      lines.push(`  · [${i.severity}] ${JSON.stringify(i)}`);
    }
    if (r.issues.length > 20) lines.push(`  … +${r.issues.length - 20} more`);
  }
  return lines.join('\n');
}
