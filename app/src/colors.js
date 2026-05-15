export const PALETTE = {
  canonical:  '#4ea3ff',
  variant:    '#3ad17a',
  palieronic: '#b86bff',
  unstable:   '#ff6b6b',
  absorbed:   '#7a7a7a',
  attractor:  '#ffcc4d',
  link:       'rgba(180,196,224,0.18)',
  link_strong:'rgba(255,204,77,0.55)',
  link_contradiction: 'rgba(255,107,107,0.55)',
  link_iso:   'rgba(184,107,255,0.55)',
};

export function colorOfNode(node) {
  if (node.stability === 'absorbée') return PALETTE.absorbed;
  if (node.stability === 'instable') return PALETTE.unstable;
  if (node.canonical && node.weight >= 0.92) return PALETTE.attractor;
  if (node.palieronic) return PALETTE.palieronic;
  if (node.canonical) return PALETTE.canonical;
  return PALETTE.variant;
}

export function colorOfLink(link) {
  if (link.kind === 'contradiction') return PALETTE.link_contradiction;
  if (link.kind === 'isomorphism')   return PALETTE.link_iso;
  if (link.kind === 'parent' && link.weight >= 0.85) return PALETTE.link_strong;
  return PALETTE.link;
}
