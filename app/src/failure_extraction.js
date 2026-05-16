// app/src/failure_extraction.js
// Mission ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516
//
// FAILURE_EXTRACTION_ENGINE — pour chaque réponse perdante, extrait la
// CAUSE structurelle de défaite (trop abstrait, hors-domaine, bruit
// excessif, jargon, manque actionnable, hiérarchisation, compression).
// Permet de comprendre POURQUOI une route échoue, pas juste qu'elle échoue.

import { jargonDensity, userDistance, practicalUsefulness, detectJargonTerms } from './jargon.js';
import { terrainAlignment } from './completion.js';

/**
 * Diagnostique une réponse perdante.
 * Retourne un objet { causes: [...], severity, suggested_surgery }.
 * Une réponse peut avoir PLUSIEURS causes simultanées.
 */
export function extractFailureCauses({ text, question, scores = {}, domain_fitness = null }) {
  const causes = [];

  // 1. Trop abstrait : jargon haut + terrain bas
  const jd = scores.jargon_density ?? jargonDensity(text);
  const ta = scores.terrain_alignment ?? terrainAlignment(text);
  if (jd > 0.08 && ta < 0.20) {
    causes.push({
      code: 'too_abstract',
      label: 'Trop abstrait — jargon élevé, vocabulaire terrain absent',
      surgery: 'Réécrire avec termes métier du domaine, supprimer tout jargon ZORAN.',
    });
  }

  // 2. Hors domaine : domain_fitness faible
  if (domain_fitness !== null && domain_fitness < 0.30) {
    causes.push({
      code: 'out_of_domain',
      label: `Route hors domaine (fitness ${domain_fitness}) — structures dominantes ne matchent pas profil`,
      surgery: 'Skipper cette route ou la rerouter vers une plus adaptée.',
    });
  }

  // 3. Bruit excessif : jargon haut OU longueur excessive sans info
  const wordCount = text ? text.split(/\s+/).length : 0;
  const noise = scores.noise ?? (jd > 0.10 || wordCount > 200 ? 0.50 : 0.15);
  if (noise > 0.50) {
    causes.push({
      code: 'excessive_noise',
      label: 'Bruit excessif — verbosité inutile, redondance, digression',
      surgery: 'Compresser à 4-6 phrases denses, supprimer répétitions et digressions.',
    });
  }

  // 4. Jargon ZORAN détecté
  const jargonTerms = detectJargonTerms(text);
  if (jargonTerms.length > 0) {
    causes.push({
      code: 'zoran_jargon_leak',
      label: `Jargon ZORAN détecté (${jargonTerms.length}) : ${jargonTerms.slice(0, 5).join(', ')}`,
      surgery: 'Réécrire en vocabulaire du domaine uniquement, masquer toute trace ZORAN.',
    });
  }

  // 5. Manque actionnable : peu de verbes d'action
  const pu = scores.practical_usefulness ?? practicalUsefulness(text);
  if (pu < 0.30 && text && text.length > 100) {
    causes.push({
      code: 'missing_action',
      label: `Manque actions concrètes (usefulness ${pu.toFixed(2)})`,
      surgery: 'Ajouter 3-5 actions immédiates priorisées (étapes opérationnelles).',
    });
  }

  // 6. Mauvaise hiérarchisation : pas d'ordre clair (pas de "d'abord/ensuite/enfin")
  const HIER_RX = /\b(d'?abord|premi[èe]rement|ensuite|puis|enfin|finalement|étape\s+\d|priorit[ée]|urgent|impératif)/i;
  if (text && text.length > 150 && !HIER_RX.test(text)) {
    causes.push({
      code: 'bad_hierarchy',
      label: 'Pas de hiérarchisation explicite (étapes/urgences non priorisées)',
      surgery: 'Structurer avec "1. Urgent : … 2. À court terme : … 3. Long terme : …"',
    });
  }

  // 7. Mauvaise compression : longueur excessive pour peu d'info
  if (wordCount > 250 && pu < 0.50) {
    causes.push({
      code: 'bad_compression',
      label: `Verbosité non compensée par valeur (${wordCount} mots, usefulness ${pu.toFixed(2)})`,
      surgery: 'Compresser à 100-150 mots en gardant l\'essentiel actionnable.',
    });
  }

  // 8. Hallucination probable : présence de chiffres précis non sourcés sur sujets factuels
  const hallu = scores.hallucination ?? 0;
  if (hallu > 0.50) {
    causes.push({
      code: 'high_hallucination_risk',
      label: `Risque hallucination élevé (${hallu.toFixed(2)})`,
      surgery: 'Si fait incertain : remplacer par "à vérifier auprès de [expert]" plutôt qu\'inventer.',
    });
  }

  // 9. Réponse vide ou tronquée
  if (!text || text.length < 50) {
    causes.push({
      code: 'empty_or_truncated',
      label: 'Réponse vide ou prématurément tronquée',
      surgery: 'Rerelancer avec maxTokens augmenté et prompt anti-troncature.',
    });
  }

  // Sévérité globale : nombre de causes × 0.2 (cap 1.0)
  const severity = Math.min(1.0, causes.length * 0.20);

  return {
    causes,
    severity: +severity.toFixed(2),
    count: causes.length,
    suggested_surgery: causes.length > 0
      ? causes.map(c => c.surgery).join(' ')
      : null,
  };
}

/**
 * Pour un set de résultats benchmark, agrège les patterns de défaite
 * par route. Permet d'identifier les défauts structurels d'une stratégie.
 */
export function aggregateFailurePatterns(results) {
  const byRoute = {};
  for (const r of results) {
    const winner = r.winner;
    // Pour chaque NON-winner, analyse les défauts
    for (const [route, scores] of Object.entries(r.per_route || {})) {
      if (route === winner) continue;
      const text = scores.text || '';
      if (!text) continue;
      const failure = extractFailureCauses({
        text,
        question: r.prompt,
        scores,
        domain_fitness: scores.domain_fitness,
      });
      if (!byRoute[route]) byRoute[route] = {};
      for (const c of failure.causes) {
        byRoute[route][c.code] = (byRoute[route][c.code] || 0) + 1;
      }
    }
  }
  return byRoute;
}
