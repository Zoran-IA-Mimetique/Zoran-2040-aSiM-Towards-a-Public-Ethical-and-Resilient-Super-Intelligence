// app/src/structural_mapping.js
// Mission ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516
//
// Diagnostic du benchmark : matching lexical échoue sur questions
// concrètes (ex: "supprimer murs porteurs" → off-topic alors que
// risque/contradiction/propagation/temporal/bornage sont structurellement
// pertinents).
//
// Ce module détecte les STRUCTURES COGNITIVES IMPLICITES d'une question
// (pas les mots-clés ZORAN) et les mappe vers les familles/lois compatibles.

// Détecteurs structurels par catégorie : regex sémantiques en français
// Chaque pattern matché ajoute une structure à la signature cognitive.
// Regex tolérantes : pluriels (s?), accents optionnels, racines partielles
const STRUCTURE_PATTERNS = {
  risque: {
    rx: /(risque|danger|s[eé]curit|catastroph|effondr|chute|incident|accident|fragil|critique|grave|menac|p[eé]ril|corrosion|microfissur|surchauff|explos\w*\s+(des|du)\s+co[uû]ts?|d[ée]rive|d[eé]struct\w*\s+des\s+marges?|destruction\s+des\s+(marges|redondances?|r[eé]silience))/i,
    families: ['WP12'],
    laws: ['WP12-002', 'WP12-004', 'WP12-009', 'WP12-021'],
    label: 'risque / sécurité',
  },
  contradiction: {
    rx: /(contradict|opposit|conflit|incoh[eé]rent|incompatib|paradox|clash|tension|d[eé]saccord)/i,
    families: ['WP11', 'DVE'],
    laws: ['WP11-002', 'WP11-005', 'WP11-009', 'DVE-006'],
    label: 'contradiction / incohérence',
  },
  hypothese_cachee: {
    rx: /(suppos|hypoth|admet|on dit|ça tient|toujours|jamais|implicite|sous-entend|tacit|pr[eé]sum|cens[eé])/i,
    families: ['DVE', 'WP12'],
    laws: ['DVE-020', 'DVE-021', 'WP12-009', 'WP12-010', 'WP11-011'],
    label: 'hypothèse non vérifiée',
  },
  propagation: {
    rx: /(propag|redistribu|cascad|charge|impact|domino|encha[iî]n|r[eé]percu|diffus|d[eé]ploi|supprim|enlev|d[eé]molir|d[eé]construi|modif.{0,5}structur|r[eé]partition)/i,
    families: ['GHUC', 'UDE'],
    laws: ['GHUC-001', 'GHUC-002', 'GHUC-003', 'UDE-001'],
    label: 'propagation / cascade structurelle',
  },
  temporalite: {
    rx: /(temps|temporel|dur[eé]e|ancien|histor|long terme|[0-9]+\s*(an|jour|mois|si[èe]cle)|av[ae]nir|futur|maintenant|pass[eé]|imm[eé]ubl|vieux|vieille)/i,
    families: ['PAL', 'WP11'],
    laws: ['PAL-001', 'PAL-002', 'WP11-013', 'WP11-015'],
    label: 'stabilité temporelle / vieillissement',
  },
  bornage: {
    rx: /(born|limit|frontier|p[eé]rim[eè]tre|scope|cadre|domaine|jusqu['à]o[uù]|port[eé]e|[eé]tendue|p[eé]rim[eè]tr)/i,
    families: ['WP12'],
    laws: ['WP12-028', 'WP12-031', 'WP12-035'],
    label: 'bornage / scope',
  },
  auditabilite: {
    rx: /(audit|trace|preuve|justif|v[eé]rifi|sourc|r[eé]f[eé]r|attest|prouve|certif|expertis|contr[oô]l)/i,
    families: ['WP12', 'GHUC'],
    laws: ['WP12-007', 'WP12-008', 'WP12-019', 'GHUC-005'],
    label: 'auditabilité / traçabilité',
  },
  decision_action: {
    rx: /(d[eé]cider|action|faire|proc[eé]der|enga|valider|approuv|refuser|choisir|opter|veut|souhait|projet|cr[eé]er|r[eé]nover|transform)/i,
    families: ['SDE', 'WP12'],
    laws: ['SDE-001', 'SDE-009', 'WP12-034'],
    label: 'décision / action',
  },
  compression_synthese: {
    rx: /(r[eé]sum|synth[eè]s|compress|essentiel|principal|priorit|simplif|cl[eé]s?|distill)/i,
    families: ['GHUC'],
    laws: ['GHUC-002', 'GHUC-002-a', 'GHUC-011'],
    label: 'compression / synthèse',
  },
  comparaison: {
    rx: /(compar|vs|versus|diff[eé]renc|[éeè]cart|mieux|pire|meilleur|optimal|alternativ)/i,
    families: ['SDE', 'WP11'],
    laws: ['SDE-002', 'WP11-017'],
    label: 'comparaison',
  },
  causalite: {
    rx: /(parce que|pourquoi|caus\w*|raison|origin\w*|cons[eé]quenc\w*|effet|d[oô]u|provoqu\w*|entra[iî]n\w*|m[eè]ne|mécanism\w*|étiologi\w*)/i,
    families: ['SDE'],
    laws: ['SDE-009'],
    label: 'causalité / explication',
  },
};

/**
 * Détecte les structures cognitives implicites dans une question.
 * Retourne :
 *   structures: [{key, label, families, laws}]
 *   structural_match_score: 0..1 (combien de patterns ont matché)
 *   matched_laws: Set des law IDs uniques activés
 *   matched_families: Set des familles uniques activées
 */
export function mapStructural(question) {
  if (!question) return { structures: [], structural_match_score: 0,
    matched_laws: new Set(), matched_families: new Set() };
  const matched = [];
  const allLaws = new Set();
  const allFams = new Set();
  for (const [key, pat] of Object.entries(STRUCTURE_PATTERNS)) {
    if (pat.rx.test(question)) {
      matched.push({ key, label: pat.label, families: pat.families, laws: pat.laws });
      pat.laws.forEach(l => allLaws.add(l));
      pat.families.forEach(f => allFams.add(f));
    }
  }
  // structural_match_score : ratio des structures matchées vs total possible
  // bonus : présent dans corpus ZORAN (forme une signature riche)
  const score = matched.length / Math.max(3, Object.keys(STRUCTURE_PATTERNS).length / 2);
  return {
    structures: matched,
    structural_match_score: Math.min(1.0, score),
    matched_laws: allLaws,
    matched_families: allFams,
  };
}

/**
 * Augmente le topic score d'un nœud en utilisant les structures matchées.
 * Si la loi appartient à un pattern matché → boost.
 */
export function structuralTopicBoost(node, structuralMap) {
  if (!structuralMap || !structuralMap.matched_laws) return 0;
  let boost = 0;
  if (structuralMap.matched_laws.has(node.id)) boost += 0.40;
  const fam = node.id.split('-')[0];
  if (structuralMap.matched_families.has(fam)) boost += 0.15;
  return Math.min(0.55, boost);
}
