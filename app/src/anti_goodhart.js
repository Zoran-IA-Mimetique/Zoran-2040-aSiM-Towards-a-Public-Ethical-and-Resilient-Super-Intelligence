// app/src/anti_goodhart.js
// Mission MISSION_CLAUDE_REZO_SYSTEMIC_SELECTION_20260517
//
// ANTI-GOODHART — 4 détecteurs automatiques qui repèrent dans une
// réponse les signaux d'optimisation destructive / piège métrique /
// effondrement de proxy / conflit local-global.
//
// Loi de Goodhart : "When a measure becomes a target, it ceases to
// be a good measure." Tous les systèmes optimisés sur un proxy de Y
// au lieu de Y convergent vers un état qui maximise le proxy en
// détruisant Y.
//
// Chaque détecteur retourne :
//   { fires: bool, score: [0..1], evidence: [string], hint: string }
//
// score ∈ [0..1] = sévérité estimée (0 = pas de signal, 1 = signal fort)
// fires = true si score >= 0.3

// ───────────────────── DÉTECTEUR 1 : FAUX OPTIMISATION ─────────────────────
// Mentionne maximisation/optimisation d'une métrique SANS mention du
// coût correspondant sur une autre dimension.
const OPTIMIZATION_TARGET_RX = /\b(maximis(er|ation)|optimis(er|ation)|augmenter (au maximum|fortement)|pousser au maximum|driver (vers le haut|à fond))\s+(le |la |les |l['']|du |de la |des )?(\w+)/gi;
const COST_AWARENESS_RX = /\b(au détriment de|au prix d['e]|en sacrifiant|en échange de|tradeoff|trade.?off|compromis|coût|effet secondaire|impact négatif|conséquence|inconvénient|élimination des|au risque de|sacrifi|destruction de|au dépens de)\b/gi;

export function detectFalseOptimization(text) {
  if (!text || text.length < 30) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  const targets = [...text.matchAll(OPTIMIZATION_TARGET_RX)];
  const costMentions = (text.match(COST_AWARENESS_RX) || []).length;
  if (targets.length === 0) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  // Ratio : optimisations sans contrepartie nommée
  const orphanRatio = Math.max(0, targets.length - costMentions) / targets.length;
  const score = +Math.min(1, orphanRatio * (targets.length >= 2 ? 1.0 : 0.6)).toFixed(3);
  const evidence = targets.slice(0, 3).map(m => m[0]);
  return {
    fires: score >= 0.3,
    score,
    evidence,
    hint: score >= 0.3
      ? `${targets.length} mention(s) d'optimisation pour ${costMentions} mention(s) de coût/tradeoff. Nommer ce qui est sacrifié.`
      : '',
  };
}

// ───────────────────── DÉTECTEUR 2 : PROXY COLLAPSE ─────────────────────
// Utilisation d'un proxy/indicateur comme s'il était la cible réelle.
// Ex : "améliorer le DPE" (proxy) vs "améliorer la performance énergétique réelle".
const PROXY_TERMS_RX = /\b(KPI|score|note|classement|ranking|DPE|biomarqueur|métrique|indicateur|benchmark|évaluation|grade|niveau|étoile|certification|label)\b/gi;
const REAL_TARGET_DISCLAIMER_RX = /\b(au.?delà (de la |du )?(métrique|score|note|KPI|indicateur)|réalité (sous.?jacente|terrain)|ce que (la métrique|l['']indicateur) ne (mesure|capture) pas|limite (de la |du )?(métrique|indicateur)|le score n['']est pas (la |le )|attention au proxy|risque de Goodhart)\b/gi;

export function detectProxyCollapse(text) {
  if (!text || text.length < 30) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  const proxies = (text.match(PROXY_TERMS_RX) || []);
  const disclaimers = (text.match(REAL_TARGET_DISCLAIMER_RX) || []).length;
  if (proxies.length === 0) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  // Score = densité de proxies sans disclaimer
  const orphan = Math.max(0, proxies.length - disclaimers * 2);
  // Normaliser : 3+ proxies orphelins = score 1.0
  const score = +Math.min(1, orphan / 3).toFixed(3);
  return {
    fires: score >= 0.3,
    score,
    evidence: [...new Set(proxies)].slice(0, 4),
    hint: score >= 0.3
      ? `${proxies.length} proxy/indicateur(s) cité(s), ${disclaimers} mise(s) en garde. Distinguer la mesure de la cible réelle.`
      : '',
  };
}

// ───────────────────── DÉTECTEUR 3 : METRIC TUNNEL ─────────────────────
// La réponse se focalise sur UNE seule métrique sans diversité, sans
// considérer dimensions multiples du problème.
const METRIC_FOCUS_RX = /\b(seule métrique|unique indicateur|seul KPI|focus(ation)? exclusi(f|ve) sur|ne mesurer que|piloter (uniquement |seulement )?par|gouverner par (la |le )?(score|KPI|métrique))\b/gi;
const DIMENSIONALITY_MARKERS_RX = /\b(multi.?dimensionnel|plusieurs dimensions|diversité (de |des )?critères|équilibre entre|trade.?off|composite|pondération|portefeuille (d['']indicateur|de mesure)|tableau de bord|dashboard équilibré|balanced)\b/gi;

export function detectMetricTunnel(text) {
  if (!text || text.length < 30) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  const tunnelMarkers = (text.match(METRIC_FOCUS_RX) || []).length;
  const diversity = (text.match(DIMENSIONALITY_MARKERS_RX) || []).length;
  // Tunnel = présence de focus exclusif + absence diversité
  const baseScore = tunnelMarkers > 0 ? 0.5 + tunnelMarkers * 0.2 : 0;
  const diversityDiscount = Math.min(0.5, diversity * 0.15);
  const score = +Math.max(0, Math.min(1, baseScore - diversityDiscount)).toFixed(3);
  return {
    fires: score >= 0.3,
    score,
    evidence: tunnelMarkers > 0 ? ['focus mono-métrique détecté'] : [],
    hint: score >= 0.3
      ? `Focalisation sur une dimension unique. Élargir : ajouter 2-3 dimensions complémentaires (résilience, coût caché, viabilité long terme).`
      : '',
  };
}

// ───────────────────── DÉTECTEUR 4 : LOCAL VS GLOBAL CONFLICT ─────────────────────
// Gain local mentionné SANS considération de l'effet global / systémique.
const LOCAL_GAIN_RX = /\b(amélior(er|ation) (locale|ponctuelle|immédiate)|gain (ici|sur ce poste|local|à ce niveau|spécifique|immédiat\w*|ponctuel\w*)|optimis(er|ation) (cette |ce )?(point|élément|composant|module|étape|spécifique|locale|ponctuel\w*)|résout (le )?(problème immédiat|le symptôme))\b/gi;
const GLOBAL_AWARENESS_RX = /\b(effet (sur le |sur l['']|global|systémique|d['']ensemble)\w*|impact (global|d['']ensemble|systémique|sur le système)\w*|conséquence\w* sur (le système|l['']ensemble|le reste|les autres)|équilibre global|cohérence d['']ensemble|propagation\w*|cascade\w*|rebond ailleurs|déplacer le problème)/gi;

export function detectLocalVsGlobalConflict(text) {
  if (!text || text.length < 30) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  const local = (text.match(LOCAL_GAIN_RX) || []).length;
  const global = (text.match(GLOBAL_AWARENESS_RX) || []).length;
  if (local === 0) {
    return { fires: false, score: 0, evidence: [], hint: '' };
  }
  // Gain local sans mention globale = signal
  const score = +Math.min(1, Math.max(0, local - global) / 2).toFixed(3);
  return {
    fires: score >= 0.3,
    score,
    evidence: [`${local} gain(s) local(aux), ${global} mention(s) globale(s)`],
    hint: score >= 0.3
      ? `Optimisation locale sans contre-partie globale nommée. Vérifier : ce gain ici déplace-t-il un problème ailleurs ?`
      : '',
  };
}

// ───────────────────── RUNNER ─────────────────────
/**
 * Lance les 4 détecteurs sur un texte. Retourne le rapport complet
 * + score systémique anti-Goodhart agrégé.
 */
export function runAntiGoodhart(text) {
  const checks = {
    false_optimization:        detectFalseOptimization(text),
    proxy_collapse:            detectProxyCollapse(text),
    metric_tunnel:             detectMetricTunnel(text),
    local_vs_global_conflict:  detectLocalVsGlobalConflict(text),
  };
  const fired = Object.values(checks).filter(c => c.fires);
  const meanScore = Object.values(checks).reduce((s, c) => s + c.score, 0) / 4;
  // Score de risque Goodhart [0..1] — plus haut = plus de risque
  const goodhart_risk = +Math.min(1, meanScore).toFixed(3);
  // Score systémique inverse [0..1] — plus haut = plus sain
  const systemic_health = +(1 - goodhart_risk).toFixed(3);
  return {
    checks,
    fired_count: fired.length,
    fired_codes: fired.map(c => c.evidence[0] || 'detected'),
    goodhart_risk,
    systemic_health,
    hints: Object.entries(checks)
      .filter(([_, c]) => c.fires)
      .map(([code, c]) => ({ code, hint: c.hint })),
  };
}
