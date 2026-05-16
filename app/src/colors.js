export const PALETTE = {
  canonical:  '#4ea3ff',
  variant:    '#3ad17a',
  palieronic: '#b86bff',
  unstable:   '#ff6b6b',
  absorbed:   '#7a7a7a',
  attractor_mu0: '#ffcc4d',
  attractor_mu1: '#f0a83a',
  link:       'rgba(180,196,224,0.18)',
  link_strong:'rgba(255,204,77,0.55)',
  link_contradiction: 'rgba(255,107,107,0.55)',
  link_iso:   'rgba(184,107,255,0.55)',
  link_absorbed: 'rgba(120,120,120,0.45)',
  link_related: 'rgba(180,196,224,0.10)',
  link_derives: 'rgba(58,209,122,0.40)'
};

export function colorOfNode(node) {
  if (node.stability === 'absorbée') return PALETTE.absorbed;
  if (node.stability === 'instable') return PALETTE.unstable;
  if (node.attractor_tier === 'μ0') return PALETTE.attractor_mu0;
  if (node.attractor_tier === 'μ1') return PALETTE.attractor_mu1;
  if (node.palieronic) return PALETTE.palieronic;
  if (node.canonical) return PALETTE.canonical;
  return PALETTE.variant;
}

export function colorOfLink(link) {
  if (link.kind === 'contradicts') return PALETTE.link_contradiction;
  if (link.kind === 'iso')          return PALETTE.link_iso;
  if (link.kind === 'absorbed_into')return PALETTE.link_absorbed;
  if (link.kind === 'derives')      return PALETTE.link_derives;
  if (link.kind === 'related')      return PALETTE.link_related;
  if (link.kind === 'parent' && (link.weight ?? 0) >= 0.85) return PALETTE.link_strong;
  return PALETTE.link;
}
