import { colorOfNode, colorOfLink } from './colors.js';

export async function loadLaws(url = './data/laws.json') {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load laws: ${res.status}`);
  return res.json();
}

export function buildGraph(dataset) {
  const nodes = dataset.nodes.map(n => ({ ...n, color: colorOfNode(n) }));
  const ids = new Set(nodes.map(n => n.id));
  const links = [];

  const addLink = (source, target, kind, weight = 0.5) => {
    if (!ids.has(source) || !ids.has(target)) return;
    if (source === target) return;
    links.push({ source, target, kind, weight, color: colorOfLink({ kind, weight }) });
  };

  for (const n of nodes) {
    for (const p of n.parents || [])         addLink(p, n.id, 'parent', n.weight ?? 0.5);
    for (const r of n.related || [])         addLink(n.id, r, 'related', 0.4);
    for (const c of n.contradictions || [])  addLink(n.id, c, 'contradiction', 0.6);
    if (n.family === 'ISO' && (n.parents || []).length >= 2) {
      for (const p of n.parents) addLink(n.id, p, 'isomorphism', 0.7);
    }
  }

  return { nodes, links, families: dataset.families };
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
  return { nodes, links, families: graph.families };
}
