import { colorOfNode, colorOfLink } from './colors.js';

export async function loadLaws(url = './data/laws.json') {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load laws: ${res.status}`);
  return res.json();
}

const VALID_KINDS = new Set([
  'parent', 'derives', 'iso', 'contradicts', 'related', 'absorbed_into', 'depends'
]);

export function buildGraph(dataset) {
  const nodes = dataset.nodes.map(n => ({ ...n, color: colorOfNode(n) }));
  const ids = new Set(nodes.map(n => n.id));
  const links = [];

  const addLink = (source, target, kind, attrs = {}) => {
    if (!ids.has(source) || !ids.has(target)) return;
    if (source === target) return;
    if (!VALID_KINDS.has(kind)) return;
    if (kind === 'iso' && (!attrs.invariants || attrs.invariants.length === 0)) return;
    const weight = attrs.weight ?? defaultWeight(kind, source, target, nodes);
    links.push({ source, target, kind, weight, ...attrs, color: colorOfLink({ kind, weight }) });
  };

  for (const edge of (dataset.edges || [])) {
    addLink(edge.source, edge.target, edge.kind, edge);
  }

  return {
    nodes,
    links,
    families: dataset.families,
    compositions: dataset.compositions || [],
    p0_5_meta: dataset.p0_5_meta || null
  };
}

function defaultWeight(kind, source, target, nodes) {
  if (kind === 'parent') {
    const t = nodes.find(n => n.id === target);
    return t?.weight ?? 0.5;
  }
  return { derives: 0.50, iso: 0.65, contradicts: 0.60, related: 0.30, absorbed_into: 0.40, depends: 0.55 }[kind] ?? 0.4;
}

export function neighborsOf(graph, nodeId) {
  const nset = new Set();
  for (const l of graph.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === nodeId) nset.add(t);
    if (t === nodeId) nset.add(s);
  }
  return nset;
}

export function branchFrom(graph, rootId) {
  const visited = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    for (const l of graph.links) {
      if (l.kind !== 'parent') continue;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === id && !visited.has(t)) { visited.add(t); queue.push(t); }
      if (t === id && !visited.has(s)) { visited.add(s); queue.push(s); }
    }
  }
  return visited;
}

export function prune(graph, threshold) {
  const keep = new Set(
    graph.nodes.filter(n => (n.weight ?? 0) >= threshold || n.canonical).map(n => n.id)
  );
  const nodes = graph.nodes.filter(n => keep.has(n.id));
  const links = graph.links.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return keep.has(s) && keep.has(t);
  });
  return { nodes, links, families: graph.families, compositions: graph.compositions, p0_5_meta: graph.p0_5_meta };
}

export function familyInvariant(graph, familyId) {
  const f = (graph.families || []).find(x => x.id === familyId);
  return f?.invariant || null;
}

export function attractorMu0(graph) {
  return graph.nodes.filter(n => n.attractor_tier === 'μ0');
}
