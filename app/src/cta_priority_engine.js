// ZORAN_CTA_CLICKABLE_RUNTIME_V13 — Priority engine.
//
// Contrainte SDE-029 : MAX 1 principal + 1 secondaire + 1 falsification.
// Tout CTA hors quota est démoté en texte simple (label sans button)
// pour préserver l'information sans saturer l'affordance visuelle.
//
// Score = SCORE_BY_CRIT[crit] * SCORE_BY_TYPE[type]

const SCORE_BY_CRIT = { high: 3, medium: 2, low: 1 };
const SCORE_BY_TYPE = {
  falsif: 1.8,
  risque: 1.5,
  juridique: 1.5,
  terrain: 1.2,
  monitor: 1.0,
  action: 0.8,
};

export function scoreCta(cta) {
  if (!cta) return 0;
  const c = SCORE_BY_CRIT[cta.crit] || 2;
  const t = SCORE_BY_TYPE[cta.type] || 1.0;
  // Bonus si tous les champs riches sont présents (signe que LLM s'est appliqué)
  const richness = ['cout', 'delai', 'preuve', 'risque', 'detail']
    .filter(k => cta[k] && cta[k].length > 2).length;
  return c * t + richness * 0.1;
}

// Sélectionne au max : 1 principal + 1 secondaire + 1 falsification.
// Entrée : liste de CTAs parsés (objets avec type/crit/...).
// Sortie : { keep: [...], drop: [...] }
// Préserve l'ordre d'apparition pour les keep.
export function prioritize(ctas) {
  if (!ctas || ctas.length === 0) return { keep: [], drop: [] };

  const indexed = ctas.map((cta, i) => ({ cta, i, score: scoreCta(cta) }));

  // 1) Slot FALSIFICATION : top score parmi type=falsif
  const falsifCandidates = indexed.filter(x => x.cta.type === 'falsif');
  falsifCandidates.sort((a, b) => b.score - a.score);
  const falsif = falsifCandidates[0] || null;

  // 2) Slot PRINCIPAL : top score parmi non-falsif et non encore pris
  const taken = new Set();
  if (falsif) taken.add(falsif.i);
  const nonFalsif = indexed.filter(x => x.cta.type !== 'falsif' && !taken.has(x.i));
  nonFalsif.sort((a, b) => b.score - a.score);
  const principal = nonFalsif[0] || null;
  if (principal) taken.add(principal.i);

  // 3) Slot SECONDAIRE : top score parmi non-falsif, type DIFFÉRENT du principal si possible
  let secondaire = null;
  if (principal) {
    const remaining = nonFalsif.filter(x => !taken.has(x.i));
    const differentType = remaining.find(x => x.cta.type !== principal.cta.type);
    secondaire = differentType || remaining[0] || null;
  } else {
    // Pas de principal mais on a peut-être que des falsif → 2e falsif = secondaire ?
    // Politique : si seul falsif, on garde 1 max (pas double falsif).
    secondaire = null;
  }
  if (secondaire) taken.add(secondaire.i);

  // Assemble keep dans l'ordre d'apparition originale
  const keepIndices = new Set([
    ...(principal ? [principal.i] : []),
    ...(secondaire ? [secondaire.i] : []),
    ...(falsif ? [falsif.i] : []),
  ]);

  const keep = indexed.filter(x => keepIndices.has(x.i)).map(x => x.cta);
  const drop = indexed.filter(x => !keepIndices.has(x.i)).map(x => x.cta);

  // Tag les slots (utile pour debug + UI)
  keep.forEach(cta => {
    if (principal && cta === principal.cta) cta._slot = 'principal';
    else if (secondaire && cta === secondaire.cta) cta._slot = 'secondaire';
    else if (falsif && cta === falsif.cta) cta._slot = 'falsification';
  });

  return { keep, drop };
}
