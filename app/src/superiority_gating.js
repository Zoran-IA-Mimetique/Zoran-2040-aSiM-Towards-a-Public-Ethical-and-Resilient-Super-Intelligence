// app/src/superiority_gating.js
// Extrait de superiority.js (ZORAN_CORE_OS_FOUNDATION — découplage god-function, étape 2).
//
// Bloc PUR : construction du set de stratégies ZORAN à mettre en compétition,
// avec skip des routes hors-domaine (domain_fitness < 0.30). Aucun appel LLM —
// entièrement testable hors-ligne.
//
// Comportement IDENTIQUE au bloc inline d'origine (déplacement mécanique,
// zéro modification de logique). Voir tools/superiority_units_check.mjs.

import { computeDomainFitness, shouldSkipRoute, getStrategyProfile } from './route_specialization.js';

// Top 3 routes utilisées pour la compétition (sous-ensemble — coût API maîtrisé)
export const SUPERIORITY_ROUTES = ['frugale', 'anti_hallucination', 'structurelle'];

// Construit le set [{stratName, route, laws, domain_fitness}] pour les 3
// stratégies, en skippant les routes hors-domaine (mission ROUTE_SPECIALIZATION).
// args = { routeResults, allNodes, detectedStructures }
// Retourne { zoranSpecs, skippedRoutes }.
export function buildZoranSpecs({ routeResults, allNodes, detectedStructures }) {
  const zoranSpecs = [];
  const skippedRoutes = [];
  for (const stratName of SUPERIORITY_ROUTES) {
    const route = routeResults.routes.find(r => r.strategy === stratName);
    if (!route) continue;
    const fitness = computeDomainFitness(stratName, detectedStructures);
    if (shouldSkipRoute(stratName, detectedStructures)) {
      // Route skippée pour économie API + propreté benchmark
      skippedRoutes.push({
        strategy: stratName,
        label: route.label || stratName,
        domain_fitness: +fitness.toFixed(3),
        profile: getStrategyProfile(stratName),
        reason: `domain_fitness=${fitness.toFixed(2)} < 0.30 — hors domaine de spécialisation`,
      });
      console.log(`[ZORAN sup] SKIP ${stratName} : fitness=${fitness.toFixed(2)}`);
      continue;
    }
    const laws = (route.laws_used || []).map(id => allNodes.find(n => n.id === id)).filter(Boolean);
    zoranSpecs.push({ stratName, route, laws, domain_fitness: +fitness.toFixed(3) });
  }
  return { zoranSpecs, skippedRoutes };
}
