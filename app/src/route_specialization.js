// app/src/route_specialization.js
// Mission ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516
//
// Chaque route ZORAN a un PROFIL DE SPÉCIALISATION : structures cognitives
// fortes/faibles. Une route ne devrait PAS être appelée sur un domaine où
// elle est faible (gaspillage API + bruit ajouté au benchmark).
//
// Si domain_fitness < SEUIL → la route est SKIPPÉE (placeholder noté
// dans les résultats pour transparence).

// Profil par stratégie : structures où la route excelle / échoue
// (clés alignées avec STRUCTURE_PATTERNS de structural_mapping.js)
const STRATEGY_PROFILE = {
  frugale: {
    strong: ['decision_action', 'risque', 'bornage', 'compression_synthese'],
    weak:   ['causalite', 'hypothese_cachee', 'comparaison'],
    label_domains_forts: 'BTP terrain · runtime rapide · décision opérationnelle',
    label_domains_faibles: 'physique théorique · multi-régimes complexes · analyse causale profonde',
  },
  anti_hallucination: {
    strong: ['hypothese_cachee', 'contradiction', 'auditabilite', 'risque'],
    weak:   ['compression_synthese', 'decision_action'],
    label_domains_forts: 'audit · juridique · validation source · contradiction implicite',
    label_domains_faibles: 'action immédiate terrain · brief synthétique court',
  },
  structurelle: {
    strong: ['propagation', 'temporalite', 'comparaison', 'contradiction', 'causalite'],
    weak:   ['decision_action'],
    label_domains_forts: 'diagnostic systémique · architecture multi-cadres · propagation effets',
    label_domains_faibles: 'action terrain immédiate sans contexte',
  },
  temporal_survival: {
    strong: ['temporalite', 'hypothese_cachee', 'propagation'],
    weak:   ['compression_synthese', 'decision_action'],
    label_domains_forts: 'analyse long terme · vieillissement · stabilité',
    label_domains_faibles: 'urgence immédiate',
  },
  runtime_rapide: {
    strong: ['decision_action', 'compression_synthese', 'bornage'],
    weak:   ['causalite', 'temporalite'],
    label_domains_forts: 'latence minimale · action rapide',
    label_domains_faibles: 'analyse profonde · long terme',
  },
  propagation_forte: {
    strong: ['propagation', 'causalite', 'temporalite'],
    weak:   ['compression_synthese', 'decision_action'],
    label_domains_forts: 'cascade effets · diagnostic systémique',
    label_domains_faibles: 'réponse brève actionnable',
  },
};

/**
 * Calcule domain_fitness [0..1] pour une route donnée vs les structures
 * détectées dans la question.
 * 1.0 = parfait match (toutes structures dans strong, aucune dans weak)
 * 0.5 = neutre (pas de signal fort)
 * <0.3 = à éviter (structures dominantes sont dans weak)
 */
export function computeDomainFitness(strategyName, detectedStructures) {
  const profile = STRATEGY_PROFILE[strategyName];
  if (!profile) return 0.5; // route inconnue : neutre
  if (!detectedStructures || detectedStructures.length === 0) return 0.5;
  const keys = detectedStructures.map(s => s.key || s);
  let strong = 0, weak = 0;
  for (const k of keys) {
    if (profile.strong.includes(k)) strong++;
    if (profile.weak.includes(k)) weak++;
  }
  const total = keys.length;
  // Score : 0.5 base + bonus strong - malus weak
  const score = 0.5 + (strong / total) * 0.5 - (weak / total) * 0.4;
  return Math.max(0, Math.min(1, score));
}

/**
 * Décide si une route doit être SKIPPÉE pour cette question.
 * Seuil : 0.30. Si fitness < 0.30 → skip (économie API + bruit évité).
 */
export function shouldSkipRoute(strategyName, detectedStructures, threshold = 0.30) {
  return computeDomainFitness(strategyName, detectedStructures) < threshold;
}

/**
 * Retourne le profil descriptif d'une route (pour affichage UI).
 */
export function getStrategyProfile(strategyName) {
  return STRATEGY_PROFILE[strategyName] || null;
}

/**
 * Pour un set de structures détectées, classe les routes par fitness desc.
 * Retourne [{strategy, fitness, profile}, ...]
 */
export function rankRoutesByFitness(detectedStructures) {
  return Object.entries(STRATEGY_PROFILE).map(([name, profile]) => ({
    strategy: name,
    fitness: +computeDomainFitness(name, detectedStructures).toFixed(3),
    profile,
  })).sort((a, b) => b.fitness - a.fitness);
}
