// app/src/overthink_detector.js
// Mission V6 — OVERTHINK_DETECTOR
//
// Post-hoc : la réponse PRODUITE est-elle disproportionnée par rapport
// à la complexité de la question ?
//
// Pattern à détecter :
//   "Qui est Frédéric Tabary ?" (simple)
//   → réponse 800 mots, 14 structures cognitives activées,
//     4 cadres méta, 7 lois mobilisées
//   = OVERTHINK manifeste
//
// Inputs :
//   - question (string)
//   - response_text (string)
//   - n_laws_activated (number, optionnel)
//   - n_routes_activated (number, optionnel)
//   - n_structures_detected (number, optionnel)
//   - complexity_score (du complexity_estimator)
//
// Output :
//   { overthink_score [0..1], evidence, hint }

import { estimateComplexity } from './complexity_estimator.js';

/**
 * Détecte la sur-réflexion improductive.
 * Score haut = système a sur-orchestré.
 */
export function detectOverthink({
  question,
  responseText,
  n_laws_activated = null,
  n_routes_activated = null,
  n_structures_detected = null,
  complexity_score = null,
  depth_required = null,
}) {
  if (!question || !responseText) {
    return { overthink_score: 0, evidence: [], hint: '' };
  }
  // Préfère l'estimation complète (depth_required du gating rule-based)
  const est = depth_required ? { depth_required, complexity_score: complexity_score ?? 0 }
                              : estimateComplexity(question);
  const depth = est.depth_required;
  const cplx = est.complexity_score;
  const respWords = responseText.split(/\s+/).filter(w => w.length > 0).length;

  // Budget par niveau de profondeur (basé sur gating rule-based, pas cplx seul)
  const budgets = {
    simple:  { words: 80,   structures: 1, routes: 1, laws: 0 },
    medium:  { words: 250,  structures: 3, routes: 2, laws: 3 },
    deep:    { words: 600,  structures: 6, routes: 3, laws: 10 },
    fractal: { words: 1500, structures: 10, routes: 5, laws: 30 },
  };
  const budget = budgets[depth] || budgets.simple;

  const wordsRatio = respWords / budget.words;
  const wordOverthink = Math.max(0, Math.min(1, (wordsRatio - 1) * 0.5));

  const structOverthink = n_structures_detected != null
    ? Math.max(0, Math.min(1, (n_structures_detected - budget.structures) * 0.20))
    : 0;

  const routeOverthink = n_routes_activated != null
    ? Math.max(0, Math.min(1, (n_routes_activated - budget.routes) * 0.20))
    : 0;

  const lawOverthink = n_laws_activated != null
    ? Math.max(0, Math.min(1, (n_laws_activated - budget.laws) / 50))
    : 0;

  // Composite — chaque dimension contribue indépendamment
  const overthink_score = +Math.max(0, Math.min(1,
    0.40 * wordOverthink
    + 0.25 * structOverthink
    + 0.20 * routeOverthink
    + 0.15 * lawOverthink
  )).toFixed(3);

  const evidence = [];
  if (wordOverthink > 0.2) evidence.push(`réponse ${respWords} mots vs budget ${budget.words} (depth=${depth})`);
  if (structOverthink > 0.2) evidence.push(`${n_structures_detected} structures vs budget ${budget.structures}`);
  if (routeOverthink > 0.2) evidence.push(`${n_routes_activated} routes vs budget ${budget.routes}`);
  if (lawOverthink > 0.2) evidence.push(`${n_laws_activated} lois vs budget ${budget.laws}`);

  return {
    overthink_score,
    budget,
    actual: { words: respWords, structures: n_structures_detected, routes: n_routes_activated, laws: n_laws_activated },
    depth_used: depth,
    complexity_used: cplx,
    evidence,
    hint: overthink_score >= 0.40
      ? `Sur-orchestration vs budget ${depth} (${budget.words}w / ${budget.structures}s / ${budget.routes}r). Réduire profondeur : skip routes, fast-path baseline.`
      : '',
  };
}
