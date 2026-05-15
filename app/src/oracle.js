export function auditGraph(graph) {
  const report = {
    timestamp: new Date().toISOString(),
    counts: { nodes: graph.nodes.length, links: graph.links.length },
    issues: [],
    metrics: {}
  };
  const byId = new Map(graph.nodes.map(n => [n.id, n]));

  for (const n of graph.nodes) {
    for (const field of ['parents', 'children', 'related', 'contradictions']) {
      for (const r of n[field] || []) {
        if (!byId.has(r)) {
          report.issues.push({ severity: 'broken_ref', node: n.id, field, ref: r });
        }
      }
    }
    if (n.S_local != null && n.S_global != null) {
      const gap = n.S_local - n.S_global;
      if (gap > 0.30) {
        report.issues.push({ severity: 'false_coherence', node: n.id, gap: +gap.toFixed(2) });
      }
    }
    if (!n.canonical && (!n.parents || n.parents.length === 0)) {
      report.issues.push({ severity: 'orphan', node: n.id });
    }
  }

  const slocal  = graph.nodes.map(n => n.S_local  ?? 0);
  const sglobal = graph.nodes.map(n => n.S_global ?? 0);
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  report.metrics.S_local_avg  = +avg(slocal).toFixed(3);
  report.metrics.S_global_avg = +avg(sglobal).toFixed(3);
  report.metrics.gap_avg = +(report.metrics.S_local_avg - report.metrics.S_global_avg).toFixed(3);
  report.metrics.density = +(graph.links.length / Math.max(1, graph.nodes.length)).toFixed(2);

  const familyCounts = {};
  for (const n of graph.nodes) familyCounts[n.family] = (familyCounts[n.family] || 0) + 1;
  report.metrics.families = familyCounts;

  return report;
}

export function formatReport(r) {
  const lines = [];
  lines.push(`ORACLE AUDIT — ${r.timestamp}`);
  lines.push(`Nodes: ${r.counts.nodes} · Links: ${r.counts.links} · Density: ${r.metrics.density}`);
  lines.push(`S_local avg = ${r.metrics.S_local_avg} · S_global avg = ${r.metrics.S_global_avg} · gap = ${r.metrics.gap_avg}`);
  lines.push(`Families: ${Object.entries(r.metrics.families).map(([k,v])=>`${k}:${v}`).join(' · ')}`);
  if (r.issues.length === 0) {
    lines.push('No structural issues detected.');
  } else {
    lines.push(`Issues (${r.issues.length}):`);
    for (const i of r.issues.slice(0, 30)) {
      lines.push(`  · [${i.severity}] ${JSON.stringify(i)}`);
    }
    if (r.issues.length > 30) lines.push(`  … +${r.issues.length - 30} more`);
  }
  return lines.join('\n');
}
