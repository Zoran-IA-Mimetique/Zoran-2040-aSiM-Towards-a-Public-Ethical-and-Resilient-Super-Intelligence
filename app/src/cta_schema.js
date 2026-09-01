// ZORAN_CTA_CLICKABLE_RUNTIME_V13 — Schéma + parser des CTA typés.
//
// SYNTAXE V13 (LLM ou fallback) :
//   {cta:type|label=X|crit=high|cout=X|delai=X|preuve=X|risque=X|detail=X}
//
// SYNTAXE LEGACY (toujours supportée) :
//   {cta:label}             → {type:'action', label, detail:''}
//   {cta:label | détail}    → {type:'action', label, detail}
//
// Détection : si le 1er segment matche un type connu → V13, sinon → legacy.
//
// Types : terrain, falsif, risque, juridique, monitor, action (générique)
// Criticités : high, medium, low

export const CTA_TYPES = ['terrain', 'falsif', 'risque', 'juridique', 'monitor', 'action'];
export const CTA_CRITS = ['high', 'medium', 'low'];

// Aliases tolérants
const TYPE_ALIASES = {
  falsification: 'falsif',
  falsifier: 'falsif',
  monitoring: 'monitor',
  measure: 'monitor',
  mesure: 'monitor',
  legal: 'juridique',
  field: 'terrain',
  systemic: 'risque',
};

const CRIT_ALIASES = {
  haute: 'high', haut: 'high', critique: 'high', critical: 'high',
  moyenne: 'medium', moyen: 'medium', med: 'medium',
  basse: 'low', bas: 'low',
};

function normalizeType(s) {
  if (!s) return 'action';
  const k = s.trim().toLowerCase();
  return CTA_TYPES.includes(k) ? k : (TYPE_ALIASES[k] || null);
}

function normalizeCrit(s) {
  if (!s) return 'medium';
  const k = s.trim().toLowerCase();
  return CTA_CRITS.includes(k) ? k : (CRIT_ALIASES[k] || 'medium');
}

// Parse le contenu interne d'un marker {cta:...}.
// Retourne null si parsing échoue (laisse le marker brut).
export function parseCtaContent(raw) {
  if (!raw) return null;
  const segments = raw.split('|').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const firstType = normalizeType(segments[0]);
  const isV13 = firstType !== null && segments.slice(1).some(s => /^[a-z_]+=/.test(s));

  if (isV13) {
    const cta = {
      type: firstType,
      label: '',
      crit: 'medium',
      cout: '',
      delai: '',
      preuve: '',
      risque: '',
      detail: '',
    };
    for (const seg of segments.slice(1)) {
      const m = seg.match(/^([a-z_]+)\s*=\s*(.+)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === 'label') cta.label = val;
      else if (key === 'crit' || key === 'criticite' || key === 'criticité') cta.crit = normalizeCrit(val);
      else if (key === 'cout' || key === 'coût' || key === 'cost') cta.cout = val;
      else if (key === 'delai' || key === 'délai' || key === 'delay') cta.delai = val;
      else if (key === 'preuve' || key === 'proof') cta.preuve = val;
      else if (key === 'risque' || key === 'risk') cta.risque = val;
      else if (key === 'detail' || key === 'détail') cta.detail = val;
    }
    if (!cta.label) return null;
    return cta;
  }

  // Legacy : 1er segment = label, reste = detail
  return {
    type: 'action',
    label: segments[0],
    crit: 'medium',
    cout: '',
    delai: '',
    preuve: '',
    risque: '',
    detail: segments.slice(1).join(' | '),
  };
}

// Extrait tous les markers d'un texte, renvoie une liste de
// { raw, content, parsed, index, length } pour chaque match.
export function extractAllCtas(text) {
  if (!text) return [];
  const out = [];
  const rx = /\{cta:\s*([^}]+?)\s*\}/gi;
  let m;
  while ((m = rx.exec(text)) !== null) {
    out.push({
      raw: m[0],
      content: m[1],
      parsed: parseCtaContent(m[1]),
      index: m.index,
      length: m[0].length,
    });
  }
  return out;
}

// Sérialise un objet CTA en marker V13 (utile pour fallback et tests).
export function serializeCta(cta) {
  const t = normalizeType(cta.type) || 'action';
  const parts = [t, `label=${cta.label || ''}`];
  if (cta.crit && cta.crit !== 'medium') parts.push(`crit=${cta.crit}`);
  if (cta.cout) parts.push(`cout=${cta.cout}`);
  if (cta.delai) parts.push(`delai=${cta.delai}`);
  if (cta.preuve) parts.push(`preuve=${cta.preuve}`);
  if (cta.risque) parts.push(`risque=${cta.risque}`);
  if (cta.detail) parts.push(`detail=${cta.detail}`);
  return `{cta:${parts.join('|')}}`;
}

// Labels lisibles pour l'UI (français).
export const TYPE_LABELS = {
  terrain: 'Action terrain',
  falsif: 'Contre-hypothèse',
  risque: 'Risque systémique',
  juridique: 'Garde juridique',
  monitor: 'Mesure discriminante',
  action: 'Exploration',
};

export const CRIT_LABELS = {
  high: 'Critique',
  medium: 'Standard',
  low: 'Optionnel',
};
