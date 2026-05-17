// app/src/systemic_coherence.js
// Mission MISSION_CLAUDE_REZO_SYSTEMIC_SELECTION_20260517
//
// SYSTEMIC_COHERENCE — score composite [0..1] qui mesure la VIABILITÉ
// SYSTÉMIQUE d'une réponse, séparément de sa précision, son style ou sa
// longueur. Hypothèse :
//
//   "La vraie performance n'est pas l'optimisation locale.
//    C'est la préservation de la cohérence systémique globale."
//
// Sous-scores (5) :
//   A. RESILIENCE          — marges, redondances, absorbeurs préservés
//   B. MULTISCALE          — local + global + temporel + causal
//   C. FALSE_BENEFIT_DETEC — détecte gains trompeurs / proxies dangereux
//   D. CAUSAL_ROBUSTNESS   — anti mono-causalité, multi-causes assumées
//   E. LONG_TERM_VIABILITY — dette invisible, effets différés, durabilité
//
// Approche : heuristique regex sur la réponse texte. Ne mesure pas la
// véracité, mais la STRUCTURE COGNITIVE de la réponse. Une réponse qui
// nomme explicitement marges, contre-exemples, dette long terme et
// causes multiples a une cohérence systémique ÉLEVÉE — qu'elle soit
// vraie ou fausse au sens factuel.

// ───────────────────── A. RESILIENCE ─────────────────────
// Mots/concepts qui signalent PRÉSERVATION de marges, absorbeurs,
// redondance, diversité, capacité d'adaptation.
const MARGIN_PRESERVATION_RX = /\b(marge|réserve|redondan|tampon|absorbeur|diversit|variance utile|capacit[ée] d['']adaptation|degré de liberté|robustess|résili|tolérance|flexibil|backup|fallback|plan B|alternative|secours)\b/gi;

// Mots/concepts qui signalent DESTRUCTION de marges — optimisation
// agressive, suppression de redondance, rigidification.
const MARGIN_DESTRUCTION_RX = /\b(maximis(er|ation)|optimis(er|ation) (au maximum|maximale)|éliminer (la |toute )?(redondance|variance|marge)|just.?in.?time pur|zéro stock|zéro tampon|supprime[rz]? (les |toute )?marg|réduire au minimum|au plus serré|au plus juste|comprimer (tout|au maximum)|raser les marges)\b/gi;

export function resilienceScore(text) {
  if (!text || text.length < 30) return 0.5;
  const preserve = (text.match(MARGIN_PRESERVATION_RX) || []).length;
  const destroy = (text.match(MARGIN_DESTRUCTION_RX) || []).length;
  // Base 0.5, bonus pour préservation, malus pour destruction
  const bonus = Math.min(0.4, preserve * 0.08);
  const penalty = Math.min(0.5, destroy * 0.20);
  return +Math.max(0, Math.min(1, 0.5 + bonus - penalty)).toFixed(3);
}

// ───────────────────── B. MULTISCALE ─────────────────────
// Une réponse cohérente nomme plusieurs échelles : locale + globale,
// court + long terme, cause directe + cause systémique.
const SCALE_LOCAL_RX    = /\b(local\w*|imm[ée]diat\w*|ponctuel\w*|sur place|à ce niveau|au cas par cas|spécifique\w*)\b/gi;
const SCALE_GLOBAL_RX   = /\b(global\w*|systémique\w*|d['']ensemble|à l['']échelle|général\w*|structurel\w*|holisti\w*|macro\b|agrégé\w*)/gi;
const SCALE_TEMPORAL_RX = /\b(court terme|moyen terme|long terme|à terme|dans le temps|durée|persistance|dans \d+ ans?|sur \d+ ans?|à \d+ ans|temporel\w*|dérive)\b/gi;
const SCALE_CAUSAL_RX   = /\b(cause racine|cause profonde|cause directe|cause sous.?jacente|cha[iî]ne causale|multi.?factoriel\w*|cofacteur\w*|cascade\w*|propagation)\b/gi;

export function multiscaleCoherence(text) {
  if (!text || text.length < 30) return 0;
  const scales = [
    SCALE_LOCAL_RX, SCALE_GLOBAL_RX, SCALE_TEMPORAL_RX, SCALE_CAUSAL_RX,
  ].map(rx => (text.match(rx) || []).length > 0);
  const covered = scales.filter(Boolean).length;
  // 0 échelle = 0, 4 échelles = 1.0, linéaire
  return +(covered / 4).toFixed(3);
}

// ───────────────────── C. FALSE BENEFIT DETECTION ─────────────────────
// La réponse mentionne-t-elle explicitement faux bénéfices, proxies,
// gains trompeurs, métriques dangereuses ?
const FALSE_BENEFIT_LEX_RX = /\b(faux (bénéfice|succès|gain)|gain (apparent|trompeur|illusoire)|métrique (locale|trompeuse|piégeu)|proxy(?: dangereux| trompeur)?|surrogate|KPI (trompeu|piégeu|local)|illusion d['']optimisation|Goodhart|loi de Goodhart|effet pervers|effet de bord|effet rebond|déplacement (du |de )risque|optimisation destructrice|sur.?optimisation)\b/gi;

const HIDDEN_COST_MARKER_RX = /\b(coût (invisible|caché|non mesuré|d['']opportunité)|dette (technique|invisible|cachée|différée)|externalité|ce qui n['']est pas mesuré|effet secondaire|non prévu|imprévu|impact systémique)\b/gi;

export function falseBenefitDetection(text) {
  if (!text || text.length < 30) return 0;
  const flags = (text.match(FALSE_BENEFIT_LEX_RX) || []).length;
  const hidden = (text.match(HIDDEN_COST_MARKER_RX) || []).length;
  const total = flags + hidden;
  // 0 = aucune mention, 5+ = score plein
  return +Math.min(1, total / 5).toFixed(3);
}

// ───────────────────── D. CAUSAL ROBUSTNESS ─────────────────────
// Évite la mono-causalité naïve. Récompense multi-causes assumées,
// pénalise affirmations causales simplistes.
const MULTICAUSAL_RX = /\b(multi.?factoriel|plusieurs causes|cofacteur|interaction|conjonction|combinaison de facteurs|cascade|cha[iî]ne|effets cumulatif|synergie)\b/gi;
const NAIVE_CAUSAL_RX = /\b((seule|unique) cause|c['']est (uniquement|seulement) (à cause|dû) à|la (seule |vraie )?cause est|monocausal|raison principale unique)\b/gi;
const CORRELATION_DISCLAIMER_RX = /\b(corrélation n['']est pas causalité|covarier|coïncider sans causer|corrélation ne signifie pas|spurious|faux lien|confondant)\b/gi;

export function causalRobustness(text) {
  if (!text || text.length < 30) return 0.5;
  const multi = (text.match(MULTICAUSAL_RX) || []).length;
  const naive = (text.match(NAIVE_CAUSAL_RX) || []).length;
  const disclaimer = (text.match(CORRELATION_DISCLAIMER_RX) || []).length;
  const bonus = Math.min(0.4, multi * 0.10 + disclaimer * 0.20);
  const penalty = Math.min(0.4, naive * 0.20);
  return +Math.max(0, Math.min(1, 0.5 + bonus - penalty)).toFixed(3);
}

// ───────────────────── E. LONG TERM VIABILITY ─────────────────────
// La réponse mentionne-t-elle effets différés, durabilité, dette ?
const LONG_TERM_RX = /\b(long terme|à terme|durable|durabilité|pérenn|sur \d+ ans|dans \d+ ans|à \d+ ans|sustainable|viabilit[ée]|effet différé|à retardement|cumulatif|lent)\b/gi;
const SHORT_TERM_TRAP_RX = /\b(à court terme uniquement|gain immédiat|rapide et facile|quick win|effet immédiat sans|prioris(er|ation) (le )?court terme)\b/gi;

export function longTermViability(text) {
  if (!text || text.length < 30) return 0.5;
  const long = (text.match(LONG_TERM_RX) || []).length;
  const trap = (text.match(SHORT_TERM_TRAP_RX) || []).length;
  const bonus = Math.min(0.4, long * 0.08);
  const penalty = Math.min(0.4, trap * 0.25);
  return +Math.max(0, Math.min(1, 0.5 + bonus - penalty)).toFixed(3);
}

// ───────────────────── COMPOSITE ─────────────────────
/**
 * SYSTEMIC_COHERENCE_SCORE [0..1] — composite pondéré 5 axes.
 * Pondération initiale (à calibrer empiriquement) :
 *   resilience           0.25
 *   multiscale           0.20
 *   false_benefit_detec  0.20
 *   causal_robustness    0.20
 *   long_term_viability  0.15
 */
export function systemicCoherenceScore(text) {
  const r = resilienceScore(text);
  const m = multiscaleCoherence(text);
  const f = falseBenefitDetection(text);
  const c = causalRobustness(text);
  const l = longTermViability(text);
  const score = 0.25*r + 0.20*m + 0.20*f + 0.20*c + 0.15*l;
  return +Math.max(0, Math.min(1, score)).toFixed(3);
}

/**
 * Rapport détaillé — pour UI debug et journal d'audit.
 */
export function systemicCoherenceReport(text) {
  return {
    resilience:           resilienceScore(text),
    multiscale:           multiscaleCoherence(text),
    false_benefit_detec:  falseBenefitDetection(text),
    causal_robustness:    causalRobustness(text),
    long_term_viability:  longTermViability(text),
    composite:            systemicCoherenceScore(text),
  };
}
