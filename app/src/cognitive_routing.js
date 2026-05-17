// app/src/cognitive_routing.js
// Mission SUPERIORITY_CONVERGENCE_V2_20260517 — AXE 1
//
// Avant génération, classifie la question selon 4 dimensions :
//   1. Domaine principal (BTP/médecine/juridique/physique/IA/épistémologie/business)
//   2. Nature cognitive dominante (causalité/audit/action/structurel/différentiel/temporel)
//   3. Niveau de risque (faible/métier/sécurité/santé/structurel/critique)
//   4. Niveau de profondeur (court/expert/recherche/multi-cadres/hors-distribution)
//
// Puis sélectionne la ROUTE MINIMALE SUFFISANTE — pas d'activation inutile.

import { detectDomain } from './domain_detection.js';
import { mapStructural } from './structural_mapping.js';

// Patterns nature cognitive
const NATURE_PATTERNS = {
  causalite:      /\b(pourquoi|cause|à cause|en raison|provoqu|entra[iî]n|cons[eé]quence|effet|origin|d[oô]u? à|m[èe]ne à)/i,
  audit:          /\b(audit|preuve|justif|v[eé]rifi|certif|attest|trace|sourc|recommandat|garanti|responsab)/i,
  action:         /\b(comment (faire|proc[eé]der)|que faire|action|étape|procéd|protocol|faut-il|dois-je)/i,
  structurel:     /\b(structur|architectur|systèm|propag|cascad|relation|niveau|hi[ée]rarch|cadre)/i,
  differentiel:   /\b(diff[eé]rence|vs|versus|compar|distinguer|distingu|opposit)/i,
  temporel:       /\b(temps|temporel|long terme|court terme|durée|ancien|évolu|tendance|projection|futur)/i,
  robustesse:     /\b(robust|stabilit|fragilit|résili|persistance|endurance)/i,
  arbitrage:      /\b(arbitr|trade.?off|compromis|choisir entre|priorit|hiérarchis|équilib)/i,
  anti_hallu:     /\b(certain|sûr|fiable|garantir|réellement|véritable|exact|précis)/i,
  compression:    /\b(résum|synthèse|essentiel|principal|en bref|simplif|condens)/i,
};

// Patterns risque
const RISK_PATTERNS = {
  critique:   /\b(critique|vital|effondre|catastroph|décès|mort|grave|urgence vitale|haute tension|explos)/i,
  structurel: /\b(structure|porteur|fondation|charpente|sismique|cassure|rupture|défaillance)/i,
  sante:      /\b(santé|patient|maladie|trait|prescri|diagnostic|symp|biolog|imager|ECG)/i,
  securite:   /\b(sécurit|attaq|breach|exploit|jailbreak|hack|fraud|fuite données|RGPD)/i,
  metier:     /\b(client|projet|chantier|deadline|budget|contrat|livraison|qualité)/i,
};

// Patterns profondeur requise
const DEPTH_PATTERNS = {
  hors_distribution: /\b(martien|chimère|cétacé|fictif|imaginaire|extraterrestre|alien|paradox|impossible)/i,
  recherche: /\b(récent|2024|2025|2026|publi|paper|article|étude|recherche actuelle|état de l'art|frontière)/i,
  multi_cadres: /\b(et\s+\w+\s+et\s+\w+|multi|simultané|à la fois|tout en|ainsi que)/i,
  expert: /\b(DTU|Eurocode|IEC|ISO\s+\d|HAS|arrêt|jurisprudence|protocol|spécif technique|norme)/i,
  court: /\b(bref|rapidement|en\s+2|en\s+3|résum|simple|simple ment)/i,
};

export function detectCognitiveNature(question) {
  const hits = [];
  for (const [nature, rx] of Object.entries(NATURE_PATTERNS)) {
    if (rx.test(question)) hits.push(nature);
  }
  return hits.length ? hits : ['general'];
}

export function detectRiskLevel(question) {
  if (RISK_PATTERNS.critique.test(question)) return 'critique';
  if (RISK_PATTERNS.structurel.test(question)) return 'structurel';
  if (RISK_PATTERNS.sante.test(question)) return 'sante';
  if (RISK_PATTERNS.securite.test(question)) return 'securite';
  if (RISK_PATTERNS.metier.test(question)) return 'metier';
  return 'faible';
}

export function detectDepthRequired(question) {
  if (DEPTH_PATTERNS.hors_distribution.test(question)) return 'hors_distribution';
  if (DEPTH_PATTERNS.recherche.test(question)) return 'recherche';
  if (DEPTH_PATTERNS.multi_cadres.test(question)) return 'multi_cadres';
  if (DEPTH_PATTERNS.expert.test(question)) return 'expert';
  if (DEPTH_PATTERNS.court.test(question)) return 'court';
  return 'expert'; // défaut = expert (mieux que court par défaut)
}

/**
 * Routing sémantique complet : 4 dimensions + route minimale suffisante.
 */
export function semanticRouting(question) {
  const domain = detectDomain(question);
  const structures = mapStructural(question).structures;
  const natures = detectCognitiveNature(question);
  const risk = detectRiskLevel(question);
  const depth = detectDepthRequired(question);

  // Sélection ROUTE MINIMALE SUFFISANTE
  // Règle : injection ZORAN uniquement si justifiée par contexte
  const injections = new Set();

  // Coût erreur élevé (santé, juridique, critique) → anti_hallucination obligatoire
  if (risk === 'sante' || risk === 'critique' || domain.key === 'medicine' || domain.key === 'legal') {
    injections.add('anti_hallucination');
  }

  // Nature audit/anti-hallu/différentiel → anti_hallucination
  if (natures.includes('audit') || natures.includes('anti_hallu') || natures.includes('differentiel')) {
    injections.add('anti_hallucination');
  }

  // Causalité/structurel/temporel + multi-cadres → structurelle
  if ((natures.includes('causalite') || natures.includes('structurel') || natures.includes('temporel'))
      && (structures.length >= 2 || depth === 'multi_cadres')) {
    injections.add('structurelle');
  }

  // Action immédiate, court terme, BTP terrain → frugale
  if (natures.includes('action') || depth === 'court' || (domain.key === 'btp' && risk === 'metier')) {
    injections.add('frugale');
  }

  // OOD ou ambiguïté forte → frugale (compression défensive)
  if (depth === 'hors_distribution' || structures.length === 0) {
    injections.add('frugale');
  }

  // Multi-cadres avec ≥3 structures → orchestrated
  if (structures.length >= 3 || depth === 'multi_cadres') {
    injections.add('orchestrated');
  }

  return {
    domain,
    cognitive_natures: natures,
    risk_level: risk,
    depth_required: depth,
    structures,
    minimal_sufficient_injections: [...injections],
    activation_count: injections.size,
  };
}
