// app/src/fragility_detector.js
// Mission V4 — détecteurs "réponses séduisantes mais fragiles".
//
// Beaucoup de réponses LLM "sonnent juste" — structure dense, actions
// claires, vocabulaire confiant — MAIS sont structurellement fragiles :
// dépendances cachées, coût futur ignoré, monocausalité précoce, absence
// d'hypothèses explicites. Ces réponses sont les plus dangereuses parce
// qu'elles inspirent confiance.
//
// 4 détecteurs orthogonaux aux V3 anti-Goodhart :
//   1. detectSeductiveButFragile()  — qualité de surface + fragilité structurelle
//   2. futureHiddenCost()           — gain immédiat sans dimension future
//   3. perturbationRobustness()     — réponse robuste si conditions changent
//   4. antiMonocauseEarlyLock()     — verrouillage causal trop précoce
//
// Chaque détecteur retourne :
//   { score: [0..1], evidence: [string], hint: string }

// ───────────────────── 1. SEDUCTIVE BUT FRAGILE ─────────────────────
// Réponse qui paraît excellente (dense, structurée, actionnable) mais
// signale fragilité : confiance excessive, zéro hedge, zéro contingence,
// zéro "à vérifier".
const HIGH_CONFIDENCE_RX = /\b(toujours|jamais|certainement|absolument|évidemment|sans aucun doute|garantit?|prouvé que|impossible|infaillible|indéniable\w*)\b/gi;
const STRONG_RECOMMENDATION_RX = /\b(il faut|vous devez|il convient (de|que)|priorité absolue|impératif|obligatoire|exigé)\b/gi;
const CALIBRATED_HEDGE_RX = /\b(à vérifier|selon le contexte|sous réserve|probable\w*|vraisemblable\w*|peut être|peut-être|en général|dans la plupart|si confirmé|à condition|nécessite expertise|à valider)\b/gi;
const CONTINGENCY_MARKER_RX = /\b(plan B|alternative|backup|fallback|si (ça )?échoue|en cas de|si problème|recours|secours)\b/gi;

export function detectSeductiveButFragile(text) {
  if (!text || text.length < 100) {
    return { score: 0, evidence: [], hint: '' };
  }
  const confidence = (text.match(HIGH_CONFIDENCE_RX) || []).length;
  const strongRec = (text.match(STRONG_RECOMMENDATION_RX) || []).length;
  const hedges = (text.match(CALIBRATED_HEDGE_RX) || []).length;
  const contingency = (text.match(CONTINGENCY_MARKER_RX) || []).length;
  // Surface confidence index
  const surfaceConfidence = confidence + strongRec;
  // Structural humility index
  const structuralHumility = hedges + contingency;
  // Séduisant mais fragile = haute confiance + zéro humilité
  if (surfaceConfidence < 2) return { score: 0, evidence: [], hint: '' };
  const ratio = surfaceConfidence / Math.max(1, surfaceConfidence + structuralHumility);
  const score = +Math.min(1, ratio * Math.min(1, surfaceConfidence / 3)).toFixed(3);
  return {
    score,
    evidence: [`${surfaceConfidence} marqueurs confiance, ${structuralHumility} hedge/contingence`],
    hint: score >= 0.4
      ? `Réponse confiante (${surfaceConfidence} affirmations fortes) sans hedge ni plan B (${structuralHumility}). Ajouter "à vérifier" + alternatives.`
      : '',
  };
}

// ───────────────────── 2. FUTURE HIDDEN COST ─────────────────────
// Réponse propose action avec gain immédiat clair MAIS ne nomme jamais
// la dimension future : cumul, dette, effet rebond, opportunité perdue.
const IMMEDIATE_GAIN_RX = /\b(gain (immédiat|rapide|direct)|effet immédiat|résultat immédiat|réduit immédiatement|améliore directement|économie immédiate)\b/gi;
const ACTION_PROPOSE_RX = /\b(installer|remplacer|optimiser|supprimer|réduire|éliminer|automatiser|déployer|adopter|implémenter|mettre en place)\b/gi;
const FUTURE_CONSIDERATION_RX = /\b(à terme|long terme|moyen terme|à \d+ ans?|sur \d+ ans?|durée de vie|amortissement|maintenance|coût d['']opportunité|effet cumulé|cumulatif|dette|rebond|à retardement)\b/gi;

export function futureHiddenCost(text) {
  if (!text || text.length < 100) {
    return { score: 0, evidence: [], hint: '' };
  }
  const gain = (text.match(IMMEDIATE_GAIN_RX) || []).length;
  const actions = (text.match(ACTION_PROPOSE_RX) || []).length;
  const future = (text.match(FUTURE_CONSIDERATION_RX) || []).length;
  // Risque : beaucoup d'actions ou gains sans aucune mention future
  const actionDensity = gain * 2 + actions;
  if (actionDensity < 2) return { score: 0, evidence: [], hint: '' };
  const orphanActions = Math.max(0, actionDensity - future * 2);
  const score = +Math.min(1, orphanActions / Math.max(3, actionDensity)).toFixed(3);
  return {
    score,
    evidence: [`${actionDensity} actions/gains, ${future} mention(s) future/dette`],
    hint: score >= 0.4
      ? `${actionDensity} actions proposées, ${future} considération future. Nommer dette, amortissement, effet à 5 ans.`
      : '',
  };
}

// ───────────────────── 3. PERTURBATION ROBUSTNESS ─────────────────────
// La réponse reste-t-elle valide si une variable change ? Cherche les
// marqueurs "si X change", conditions explicites, hypothèses nommées.
const CONDITIONAL_MARKER_RX = /\b(si (le |la |les |l['']|cette? |ce |un[e]? )|dans l['']hypothèse|à condition (que|de)|sous réserve|sauf si|à moins que|en supposant|en cas (de|où)|si jamais)\b/gi;
const ASSUMPTION_NAMED_RX = /\b(hypothèse|on (suppose|admet|considère)|en partant du principe|étant donné|sachant que|on (assume|postule))\b/gi;
const VARIABILITY_MARKER_RX = /\b(varie|variation|changement|évolu\w*|fluctu\w*|dépend (de|du|des)|selon (la |le |les )|différent\w* selon)\b/gi;

export function perturbationRobustness(text) {
  if (!text || text.length < 100) {
    return { score: 0.5, evidence: [], hint: '' };
  }
  const conditionals = (text.match(CONDITIONAL_MARKER_RX) || []).length;
  const assumptions = (text.match(ASSUMPTION_NAMED_RX) || []).length;
  const variability = (text.match(VARIABILITY_MARKER_RX) || []).length;
  // Bonus : nomme conditions/hypothèses/variabilité = robuste
  const robustnessBonus = Math.min(0.5, (conditionals + assumptions * 1.5 + variability) * 0.10);
  const score = +Math.max(0, Math.min(1, 0.5 + robustnessBonus)).toFixed(3);
  return {
    score,
    evidence: [`${conditionals} conditionnels, ${assumptions} hypothèses nommées, ${variability} variabilité`],
    hint: score < 0.5
      ? `Aucune hypothèse explicite. Que se passe-t-il si une variable change ? Nommer les conditions de validité.`
      : '',
  };
}

// ───────────────────── 4. ANTI MONOCAUSE EARLY LOCK ─────────────────────
// Verrouillage causal trop précoce : la réponse annonce dès le début une
// cause unique sans avoir exploré les alternatives. Pattern classique
// d'erreur diagnostique.
const EARLY_CAUSAL_LOCK_RX = /\b((la|le) (problème|cause|raison|coupable|source) (vient|est|provient|réside) (de|d['']|dans)|c['']est (manifestement|clairement|certainement|évidemment) (à cause|dû|le résultat)|s['']explique uniquement par)\b/gi;
const ALTERNATIVE_EXPLORATION_RX = /\b(plusieurs (causes|explications|hypothèses|facteurs)|alternative\w*|hypothèse différentiel\w*|on peut aussi|il faut (envisager|considérer|écarter) (que|aussi)|à distinguer|à différencier|cofacteur\w*|en l['']absence d['']autres causes|examiner d['']autres pistes)\b/gi;

export function antiMonocauseEarlyLock(text) {
  if (!text || text.length < 100) {
    return { score: 0.5, evidence: [], hint: '' };
  }
  const earlyLock = (text.match(EARLY_CAUSAL_LOCK_RX) || []).length;
  const alternatives = (text.match(ALTERNATIVE_EXPLORATION_RX) || []).length;
  // Lock précoce = risque, alternatives = robustesse
  // Score haut = robuste (anti-monocause)
  const penalty = Math.min(0.4, earlyLock * 0.20);
  const bonus = Math.min(0.4, alternatives * 0.15);
  const score = +Math.max(0, Math.min(1, 0.5 - penalty + bonus)).toFixed(3);
  return {
    score,
    evidence: [`${earlyLock} verrouillage(s) précoce(s), ${alternatives} alternative(s) explorée(s)`],
    hint: score < 0.4
      ? `Verrouillage causal trop tôt. Lister au moins 2-3 hypothèses alternatives avant de conclure.`
      : '',
  };
}

// ───────────────────── RUNNER ─────────────────────
/**
 * Lance les 4 détecteurs V4 + score composite.
 * fragility_risk [0..1] — plus haut = plus fragile (alertant)
 * Composite = pondération de :
 *   - seductive_but_fragile (poids 0.30)
 *   - future_hidden_cost (poids 0.30)
 *   - 1 - perturbation_robustness (poids 0.20)
 *   - 1 - anti_monocause_early_lock (poids 0.20)
 */
export function runFragilityDetector(text) {
  const seductive = detectSeductiveButFragile(text);
  const future = futureHiddenCost(text);
  const perturbation = perturbationRobustness(text);
  const antiMono = antiMonocauseEarlyLock(text);
  const fragility_risk = +(
    0.30 * seductive.score
    + 0.30 * future.score
    + 0.20 * (1 - perturbation.score)
    + 0.20 * (1 - antiMono.score)
  ).toFixed(3);
  return {
    detectors: {
      seductive_but_fragile: seductive,
      future_hidden_cost: future,
      perturbation_robustness: perturbation,
      anti_monocause_early_lock: antiMono,
    },
    fragility_risk,
    structural_strength: +(1 - fragility_risk).toFixed(3),
    hints: [seductive, future, perturbation, antiMono]
      .map((d, i) => ({
        code: ['seductive_but_fragile', 'future_hidden_cost', 'perturbation_robustness', 'anti_monocause_early_lock'][i],
        hint: d.hint,
      }))
      .filter(h => h.hint),
  };
}
