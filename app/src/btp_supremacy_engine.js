// app/src/btp_supremacy_engine.js
// Mission V9 — BTP SUPREMACY ENGINE
//
// Force le système à produire des réponses BTP de niveau expert
// judiciaire / BET senior :
//   - détection automatique 16+ pathologies
//   - exigence de réponse multi-cause (CAUSE_MAP hiérarchisée)
//   - hiérarchie 10-niveaux (danger → actions → limites)
//   - métriques opérationnelles spécifiques BTP

// ───────────────────── PATHOLOGIES BTP ─────────────────────
const PATHOLOGIES = {
  fissuration: /\b(fissur\w*|lézard\w*|craquel\w*|micro.?fissur\w*|faïenç\w*)\b/i,
  rga: /\b(RGA|retrait.gonflement|argile gonflante|sécheresse|réhydratation|sol argileux)\b/i,
  humidite: /\b(humidit\w*|infiltration\w*|condensation\w*|remontée capillaire|salpêtre|moisissure\w*|champignon\w*)\b/i,
  corrosion: /\b(corrosion|rouille|oxyd\w*|armature\w* (corrodée|exposée)|éclat\w* béton)\b/i,
  ventilation: /\b(ventilation|VMC|aération|renouvellement (de l['']?air|air)|infiltrométrie)\b/i,
  thermique: /\b(pont thermique|déperdition\w*|isolation|R thermique|U thermique|condensation surfacique|moisi)\b/i,
  decennale: /\b(décennale|garantie décennale|article 1792|impropre à (sa |la )?destination|atteinte au gros œuvre)\b/i,
  ipn: /\b(IPN|HEA|HEB|UPN|poutre métallique|profilé acier)\b/i,
  reprise_sous_oeuvre: /\b(reprise (en |de )?sous.?œuvre|micropieux|injection résine|consolidation)\b/i,
  tassement: /\b(tassement|affaissement|effondrement (partiel|sol)|déformation différentielle)\b/i,
  contreventement: /\b(contreventement|stabilité horizontale|effort sismique|moment fléchissant)\b/i,
  voirie: /\b(voirie|chaussée|trottoir|réseau (enterré|eaux))\b/i,
  hydrologie: /\b(hydrologie|nappe phréatique|écoulement|ruissellement|drainage|évacuation pluvial)\b/i,
  charpente: /\b(charpente|chevron|panne|ferme|liteau|tuile)\b/i,
  electricite: /\b(installation électrique|tableau électrique|disjoncteur|NF C 15.?100)\b/i,
  amiante: /\b(amiante|fibrociment|tôle ondulée amiantée|repérage avant travaux)\b/i,
};

// ───────────────────── DOMAINES D'EXPERTISE ─────────────────────
const EXPERT_LEXICON = {
  structural: /\b(IPN|HEA|HEB|moment fléchissant|effort tranchant|Eurocode|DTU 13|reprise sous.?œuvre|micropieux|contreventement|déformation|fluage|fatigue|fissuration structurelle)\b/i,
  pathology: /\b(pathologie|diagnostic|symptôme|cause racine|cofacteur|amplificateur|déclencheur|propagateur|cascade|étiologie)\b/i,
  field_action: /\b(sondage|carottage|prélèvement|caméra thermique|infrarouge|humidimètre|fissuromètre|inclinomètre|piézomètre|essai pénétrométrique|CPT|laboratoire géotechnique)\b/i,
  decennale_legal: /\b(article 1792|2270|décennale|biennale|parfait achèvement|réception|tribunal|expertise judiciaire|jurisprudence)\b/i,
  measurement: /\b(\d+(?:[,.]\d+)?\s*(mm|cm|m|kN|MPa|°C|%|kWh|kVA|m²|m³)|DTU \d+\.?\d*|Eurocode \d|NF\s+(P|EN|C))\b/i,
};

/**
 * Détecte les pathologies BTP mentionnées dans une question/réponse.
 */
export function detectPathologies(text) {
  if (!text) return [];
  const detected = [];
  for (const [name, rx] of Object.entries(PATHOLOGIES)) {
    if (rx.test(text)) detected.push(name);
  }
  return detected;
}

/**
 * Mesure la profondeur d'expertise BTP dans une réponse.
 */
export function pathologyDepthScore(text) {
  if (!text || text.length < 50) return 0;
  let score = 0;
  for (const [_, rx] of Object.entries(EXPERT_LEXICON)) {
    if (rx.test(text)) score += 0.20;
  }
  return +Math.min(1, score).toFixed(3);
}

/**
 * Détecte la présence d'une CAUSE_MAP structurée multi-cause.
 */
const CAUSE_MAP_MARKERS = {
  dominante: /\b(cause (dominante|principale|prépondérante|première)|origine principale)\b/i,
  cofacteurs: /\b(cofacteur\w*|facteur\w* aggravant\w*|cumul (avec|de))\b/i,
  amplificateurs: /\b(amplificateur\w*|amplifi\w*|exacerb\w*|aggrav\w*)\b/i,
  declencheurs: /\b(déclencheur\w*|élément déclenchant|événement initiateur)\b/i,
  revelateurs: /\b(révélateur\w*|symptôme révélateur|signe avant.?coureur|prodrom\w*)\b/i,
  propagateurs: /\b(propagateur\w*|propagation|cascade|effet domino|réaction en chaîne)\b/i,
};

export function multiCauseResolutionScore(text) {
  if (!text || text.length < 100) return 0;
  let count = 0;
  const found = [];
  for (const [name, rx] of Object.entries(CAUSE_MAP_MARKERS)) {
    if (rx.test(text)) { count++; found.push(name); }
  }
  return {
    score: +(count / 6).toFixed(3),
    layers_found: found,
    missing: Object.keys(CAUSE_MAP_MARKERS).filter(k => !found.includes(k)),
  };
}

/**
 * Détecte respect de la hiérarchie de réponse BTP attendue (10 niveaux).
 */
const HIERARCHY_LEVELS = [
  { level: 'danger_immediat', rx: /\b(danger immédiat|urgence|vital|évacuation|effondrement imminent|risque vital)\b/i },
  { level: 'stabilite_structurelle', rx: /\b(stabilité (structurelle|de l['']ouvrage)|étaiement|consolidation|reprise)\b/i },
  { level: 'causalite_dominante', rx: /\b(cause (dominante|principale|prépondérante)|origine principale)\b/i },
  { level: 'cofacteurs', rx: /\b(cofacteur\w*|facteur\w* aggravant\w*)\b/i },
  { level: 'risques_differes', rx: /\b(risque\w* différé\w*|à terme|dégradation (différée|future)|effet à \d+ ans)\b/i },
  { level: 'instrumentation', rx: /\b(instrumentation|mesure terrain|sondage|caméra thermique|humidimètre|fissuromètre|essai)\b/i },
  { level: 'responsabilite', rx: /\b(responsab\w*|décennale|assurance|garanti\w*|opposab\w*)\b/i },
  { level: 'actions_immediates', rx: /\b(action\w* immédiate\w*|à faire (immédiatement|tout de suite|sous \d+|à court terme)|étape 1|priorité 1)\b/i },
  { level: 'actions_moyen_terme', rx: /\b(moyen terme|sous \d+ (mois|semaines)|à \d+ semaines|à \d+ mois|planifié)\b/i },
  { level: 'limites_certitude', rx: /\b(limit\w* de certitude|à confirmer|à vérifier|sous réserve|incertitude|hypothèse à valider|nécessite expertise)\b/i },
];

export function hierarchyComplianceScore(text) {
  if (!text || text.length < 100) return 0;
  const present = [];
  for (const h of HIERARCHY_LEVELS) {
    if (h.rx.test(text)) present.push(h.level);
  }
  return {
    score: +(present.length / HIERARCHY_LEVELS.length).toFixed(3),
    levels_present: present,
    levels_missing: HIERARCHY_LEVELS.filter(h => !present.includes(h.level)).map(h => h.level),
  };
}

/**
 * Awareness de la décennale + responsabilité juridique.
 */
export function decennaleAwarenessScore(text) {
  if (!text) return 0;
  let score = 0;
  if (/\b(décennale|article 1792|garantie décennale)\b/i.test(text)) score += 0.40;
  if (/\b(article 2270|biennale|parfait achèvement|réception)\b/i.test(text)) score += 0.20;
  if (/\b(impropre à (sa |la )?destination|atteinte au gros œuvre)\b/i.test(text)) score += 0.20;
  if (/\b(assureur|RCP|responsabilité civile professionnelle)\b/i.test(text)) score += 0.20;
  return +Math.min(1, score).toFixed(3);
}

/**
 * Field actionability — la réponse propose-t-elle des mesures terrain concrètes ?
 */
export function fieldActionabilityScore(text) {
  if (!text) return 0;
  const fieldMeasures = (text.match(EXPERT_LEXICON.field_action) || []).length;
  const measurements = (text.match(EXPERT_LEXICON.measurement) || []).length;
  return +Math.min(1, fieldMeasures * 0.15 + measurements * 0.10).toFixed(3);
}

/**
 * Contradictory audit strength — résistance à l'expertise contradictoire.
 */
export function contradictoryAuditStrengthScore(text) {
  if (!text) return 0;
  let score = 0;
  if (/\b(expertise contradictoire|contre.?expertise|second avis|audit indépendant)\b/i.test(text)) score += 0.25;
  if (/\b(hypothèse\w* alternative\w*|si (au contraire|à l['']inverse)|contre.?hypothèse)\b/i.test(text)) score += 0.25;
  if (/\b(à condition que|sous réserve (de|que)|nécessite confirmation|à valider par)\b/i.test(text)) score += 0.20;
  if (/\b(limit\w* de (cette )?(analyse|conclusion|certitude)|hypothèse de travail|cadre d['']?analyse)\b/i.test(text)) score += 0.30;
  return +Math.min(1, score).toFixed(3);
}

/**
 * Structural risk awareness.
 */
export function structuralRiskAwarenessScore(text) {
  if (!text) return 0;
  const structuralMarkers = (text.match(EXPERT_LEXICON.structural) || []).length;
  const pathologyMarkers = (text.match(EXPERT_LEXICON.pathology) || []).length;
  return +Math.min(1, (structuralMarkers + pathologyMarkers) * 0.12).toFixed(3);
}

/**
 * BTP_OPERATIONAL_SCORE composite — note opérationnelle BTP /1.
 */
export function btpOperationalScore(text) {
  if (!text || text.length < 100) {
    return { score: 0, reason: 'insufficient_text', components: {} };
  }
  const depth = pathologyDepthScore(text);
  const multiCause = multiCauseResolutionScore(text).score;
  const hierarchy = hierarchyComplianceScore(text).score;
  const decennale = decennaleAwarenessScore(text);
  const fieldAct = fieldActionabilityScore(text);
  const audit = contradictoryAuditStrengthScore(text);
  const structural = structuralRiskAwarenessScore(text);

  const composite = +(
    0.20 * depth
    + 0.20 * multiCause
    + 0.15 * hierarchy
    + 0.10 * decennale
    + 0.15 * fieldAct
    + 0.10 * audit
    + 0.10 * structural
  ).toFixed(3);

  return {
    score: composite,
    components: {
      pathology_depth: depth,
      multi_cause_resolution: multiCause,
      hierarchy_compliance: hierarchy,
      decennale_awareness: decennale,
      field_actionability: fieldAct,
      contradictory_audit_strength: audit,
      structural_risk_awareness: structural,
    },
    verdict: composite >= 0.65 ? 'expert_level'
           : composite >= 0.45 ? 'senior_level'
           : composite >= 0.30 ? 'competent'
           : 'shallow',
  };
}

/**
 * Détecte si la question est BTP.
 */
export function isBTPQuestion(question) {
  if (!question) return false;
  return detectPathologies(question).length > 0
      || EXPERT_LEXICON.structural.test(question)
      || EXPERT_LEXICON.decennale_legal.test(question)
      || /\b(bâtiment|construction|maison|immeuble|toiture|fondation|mur|plancher|charpente|sol|terrain)\b/i.test(question);
}

/**
 * Rapport BTP complet pour UI / superiority.
 */
export function btpAnalysis(question, responseText) {
  const isBTP = isBTPQuestion(question);
  if (!isBTP) {
    return { is_btp: false };
  }
  const pathologies_in_question = detectPathologies(question);
  const pathologies_in_response = detectPathologies(responseText);
  const op = btpOperationalScore(responseText);
  const mc = multiCauseResolutionScore(responseText);
  const hier = hierarchyComplianceScore(responseText);
  return {
    is_btp: true,
    pathologies_detected_question: pathologies_in_question,
    pathologies_detected_response: pathologies_in_response,
    pathologies_coverage_ratio: pathologies_in_question.length === 0
      ? 1.0
      : +(pathologies_in_response.filter(p => pathologies_in_question.includes(p)).length
          / pathologies_in_question.length).toFixed(3),
    operational_score: op,
    multi_cause_map: mc,
    hierarchy_compliance: hier,
  };
}
