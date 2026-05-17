// app/src/rezo_engine.js
// Pivot architectural majeur (2026-05-16) :
//
// ZORAN n'est PLUS un remplaçant de Claude. ZORAN devient un MOTEUR
// D'AUGMENTATION CIBLÉE : on prend la réponse Claude brut, on identifie
// ses faiblesses, on injecte UNIQUEMENT les corrections ZORAN qui
// adressent ces faiblesses, on produit "Claude + ReZo".
//
// Nouveau benchmark : Claude vs Claude+ReZo (pas Claude vs ZORAN).
//
// Architecture :
//   QUESTION
//     ↓
//   Claude brut (réponse initiale)
//     ↓
//   Diagnostic faiblesses (usefulInformationDensity + jargon + structures
//                          manquantes + actionnabilité + auditabilité)
//     ↓
//   Sélection injections ZORAN ciblées (anti-hallu, structurelle, frugale,
//                                       orchestrée) selon faiblesses
//     ↓
//   Appel LLM correctif ciblé avec instructions chirurgicales
//     ↓
//   Claude + ReZo (réponse augmentée)

import { jargonDensity, detectJargonTerms } from './jargon.js';
import { usefulInformationDensity, noiseProfile } from './noise_killer.js';
import { practicalUsefulness } from './jargon.js';
import { terrainAlignment } from './completion.js';
import { detectDomain } from './domain_detection.js';
import { mapStructural } from './structural_mapping.js';
import { callLLM } from './llm.js';
import { runAntiGoodhart } from './anti_goodhart.js';
import { systemicCoherenceScore } from './systemic_coherence.js';
import { runFragilityDetector } from './fragility_detector.js';
import { detectDomainLeak } from './domain_leak.js';
import { seductiveComplexity } from './seductive_complexity.js';
import { identityHalluRisk } from './identity_gate.js';
import { detectLowIntrinsicDepth } from './parsimony_detector.js';
import { detectCTAPresence } from './zoran_cta_engine.js';
import { btpOperationalScore, isBTPQuestion } from './btp_supremacy_engine.js';

// ───────────────────── DIAGNOSTIC FAIBLESSES ─────────────────────

const WEAKNESS_CHECKS = {
  noise: {
    threshold: 0.4,                     // useful_info_density < 0.4
    test: (text, _) => usefulInformationDensity(text) < 0.4,
    injection: 'anti_hallucination',
    fix_hint: 'Compresser, supprimer méta-phrases et prudence rituelle.',
  },
  jargon_leak: {
    test: (text, _) => detectJargonTerms(text).length > 0,
    injection: 'silent_law_composer',
    fix_hint: 'Supprimer tout jargon ZORAN, vocabulaire domaine uniquement.',
  },
  missing_actions: {
    test: (text, _) => practicalUsefulness(text) < 0.35 && text.length > 200,
    injection: 'frugale',
    fix_hint: 'Ajouter 3-5 actions concrètes priorisées par urgence.',
  },
  missing_terrain: {
    test: (text, ctx) => {
      // Si la question est sur un domaine métier mais que la réponse manque
      // de vocabulaire technique terrain.
      if (!ctx.domain || ctx.domain.key === 'general') return false;
      return terrainAlignment(text) < 0.20;
    },
    injection: 'orchestrated',
    fix_hint: 'Injecter vocabulaire métier du domaine (BET, IPN, anamnèse, opposabilité…).',
  },
  missing_hierarchy: {
    test: (text, _) => {
      if (!text || text.length < 150) return false;
      return !/\b(d['']?abord|premi[èe]rement|ensuite|enfin|étape\s+\d|priorit|urgent|niveau\s+\d|cas\s+\d)/i.test(text);
    },
    injection: 'structurelle',
    fix_hint: 'Hiérarchiser explicitement : urgent / court terme / long terme.',
  },
  missing_audit: {
    test: (text, ctx) => {
      const structKeys = (ctx.structures || []).map(s => s.key || s);
      if (!structKeys.includes('auditabilite') && !structKeys.includes('hypothese_cachee')) return false;
      return !/\b(vérifi|source|justif|preuv|attest|trace|réf[ée]rence)/i.test(text);
    },
    injection: 'anti_hallucination',
    fix_hint: 'Ajouter mentions explicites : ce qui doit être vérifié, sources nécessaires.',
  },
  hallucination_risk: {
    test: (text, ctx) => {
      // Présence de chiffres précis + question demandant fait factuel
      const hasFactualMarker = /\b(qui est|cite|arrêt|date|cas|précis[ée])\b/i.test(ctx.question || '');
      const hasInventedSpecifics = /\b\d{4}\b/.test(text); // années précises sur question factuelle
      return hasFactualMarker && hasInventedSpecifics;
    },
    injection: 'anti_hallucination',
    fix_hint: 'Si fait incertain : "à vérifier auprès de [expert]" plutôt qu\'inventer.',
  },
  // Mission SYSTEMIC_SELECTION V3 : détecte signaux Goodhart dans Claude brut
  goodhart_risk: {
    test: (text, _) => runAntiGoodhart(text).goodhart_risk >= 0.40,
    injection: 'structurelle',
    fix_hint: 'Nommer ce qui est sacrifié, distinguer proxy/cible réelle, ajouter dimension long terme.',
  },
  // Mission SYSTEMIC_SELECTION V3 : cohérence systémique trop basse
  weak_systemic_coherence: {
    test: (text, _) => text.length > 200 && systemicCoherenceScore(text) < 0.35,
    injection: 'structurelle',
    fix_hint: 'Ajouter marges/résilience, échelles multiples (local+global+long terme), cofacteurs causaux.',
  },
  // Mission V4 : séduisant mais fragile (confiance excessive sans hedges)
  seductive_but_fragile: {
    test: (text, _) => runFragilityDetector(text).detectors.seductive_but_fragile.score >= 0.50,
    injection: 'anti_hallucination',
    fix_hint: 'Calibrer : ajouter "à vérifier", alternatives, hedges. Pas d\'affirmations péremptoires.',
  },
  // Mission V4 : coût futur ignoré (gain immédiat sans long terme)
  future_hidden_cost: {
    test: (text, _) => runFragilityDetector(text).detectors.future_hidden_cost.score >= 0.50,
    injection: 'structurelle',
    fix_hint: 'Nommer dette, amortissement, effet à 5 ans, opportunité perdue.',
  },
  // Mission V4 : verrouillage causal trop précoce
  monocause_early_lock: {
    test: (text, _) => runFragilityDetector(text).detectors.anti_monocause_early_lock.score < 0.35,
    injection: 'structurelle',
    fix_hint: 'Lister 2-3 hypothèses alternatives avant de conclure. Cofacteurs possibles.',
  },
  // Mission V4 : DOMAIN_LEAK — refus de domaine destructeur immersion
  domain_leak: {
    test: (text, ctx) => detectDomainLeak(text, ctx).leak_detected,
    injection: 'orchestrated',
    fix_hint: 'Pas de "désolé hors domaine". Répondre au fond avec le vocabulaire du domaine détecté.',
  },
  // Mission V5 : complexité technique artificielle (vocabulaire savant vide)
  seductive_complexity: {
    test: (text, _) => seductiveComplexity(text).score >= 0.50,
    injection: 'frugale',
    fix_hint: 'Simplifier le vocabulaire, supprimer fillers intellectuels, ajouter actions et chiffres.',
  },
  // Mission V7 : hallucination biographique sur identité ambiguë
  identity_hallu_risk: {
    test: (text, ctx) => identityHalluRisk(ctx.question || '', text).fires,
    injection: 'anti_hallucination',
    fix_hint: 'Remplacer affirmations biographiques par "À vérifier auprès d\'une source web" ou demande de désambiguïsation.',
  },
  // Mission V9 : CTA manquants (risque systémique, validation terrain, contre-hypothèse)
  missing_ctas: {
    test: (text, _) => text.length > 200 && detectCTAPresence(text).coverage < 0.34,
    injection: 'structurelle',
    fix_hint: 'Ajouter les 3 CTA : risque systémique caché / mesures terrain discriminantes / contre-hypothèse plausible.',
  },
  // Mission V9 : réponse BTP shallow (sans expertise opérationnelle)
  shallow_btp_response: {
    test: (text, ctx) => {
      if (!isBTPQuestion(ctx.question || '')) return false;
      const op = btpOperationalScore(text);
      return op.score < 0.30 && text.length > 150;
    },
    injection: 'orchestrated',
    fix_hint: 'BTP : niveau expert BET/judiciaire requis. Ajouter CAUSE_MAP (dominante/cofacteurs/amplificateurs), mesures terrain (sondage/caméra/humidimètre), décennale awareness.',
  },
};

/**
 * Diagnostic complet de la réponse Claude brut.
 * Retourne { weaknesses[], injections_needed[], severity, ... }
 */
export function diagnoseWeaknesses({ text, question }) {
  const domain = detectDomain(question);
  const structMap = mapStructural(question);
  const ctx = { question, domain, structures: structMap.structures };
  const weaknesses = [];
  const injections = new Set();
  for (const [code, check] of Object.entries(WEAKNESS_CHECKS)) {
    if (check.test(text, ctx)) {
      weaknesses.push({ code, fix_hint: check.fix_hint, injection: check.injection });
      injections.add(check.injection);
    }
  }
  return {
    weaknesses,
    injections_needed: [...injections],
    severity: Math.min(1.0, weaknesses.length * 0.18),
    domain,
    structures: structMap.structures,
    noise_profile: noiseProfile(text),
    metrics: {
      useful_information_density: +usefulInformationDensity(text).toFixed(3),
      jargon_density: +jargonDensity(text).toFixed(3),
      practical_usefulness: +practicalUsefulness(text).toFixed(3),
      terrain_alignment: +terrainAlignment(text).toFixed(3),
    },
  };
}

// ───────────────────── INJECTION CIBLÉE ZORAN ─────────────────────

/**
 * Produit "Claude + ReZo" : prend la réponse Claude brut + son diagnostic,
 * appelle LLM correctif ciblé qui applique UNIQUEMENT les corrections
 * nécessaires (pas une réécriture complète).
 *
 * Économie : 1 appel correctif ciblé vs 3+1 appels routes séparées.
 * Qualité : garde la fluidité naturelle de Claude, augmente précisément
 *           où il manque (audit, hiérarchie, terrain, actions).
 */
export async function generateClaudePlusRezo({ question, claudeAnswer, diagnosis }) {
  if (!diagnosis || diagnosis.weaknesses.length === 0) {
    // Pas d'augmentation nécessaire — Claude brut déjà optimal
    return {
      ok: true,
      finalAnswer: claudeAnswer,
      injections_applied: [],
      rationale: 'Claude brut déjà optimal (aucune faiblesse détectée)',
      noop: true,
    };
  }

  const domLabel = diagnosis.domain?.label || 'généraliste';
  const domVocab = diagnosis.domain?.vocab_hint || 'vocabulaire courant';
  const fixList = diagnosis.weaknesses.map((w, i) =>
    `${i+1}. [${w.code}] ${w.fix_hint}`
  ).join('\n');

  const system = [
    `Tu es un EXPERT du domaine "${domLabel}". Tu vas AUGMENTER la réponse Claude brut ci-dessous en appliquant UNIQUEMENT les corrections nécessaires identifiées.`,
    '',
    `Vocabulaire imposé : ${domVocab}`,
    '',
    '═══ FAIBLESSES IDENTIFIÉES (à corriger précisément) ═══',
    fixList,
    '',
    '═══ RÈGLES STRICTES ═══',
    '1. GARDE la fluidité naturelle de Claude brut.',
    '2. AJOUTE/CORRIGE seulement ce qui est listé ci-dessus.',
    '3. SUPPRIME : jargon ZORAN, méta-phrases, prudence rituelle.',
    '4. STRUCTURE : urgences d\'abord, contexte ensuite, limites en clôture.',
    '5. 4-7 phrases denses. Vocabulaire DU DOMAINE uniquement.',
    '6. TERMINE complètement la réponse.',
    '7. Pas de méta-discours ("voici la version améliorée…").',
    '',
    // Mission RANKING_BIAS_CORRECTION : CTAs conditionnels
    // Question simple → 0 CTA. Question complexe → 3 CTAs.
    ...(detectLowIntrinsicDepth(question).low_intrinsic
      ? [
        '═══ MODE MINIMAL (question à faible profondeur intrinsèque) ═══',
        'AUCUN CTA. AUCUNE digression hors-scope.',
        'Réponse 2-5 phrases : correction ciblée des faiblesses + résultat.',
        '',
      ]
      : [
        '═══ LOI SDE-029 — 3 CTA OBLIGATOIRES EN FIN ═══',
        'TERMINE finalAnswer OBLIGATOIREMENT par 3 CTA dans CE FORMAT exact :',
        '',
        '---',
        '**CTA cohérents** :',
        `1. *(futur cohérent — adapté à ${domLabel})* — formulation tentative`,
        '2. *(validation — signe observable)* — mesure/observation discriminante',
        '3. *(contre-piste — alternative)* — hypothèse cohérente restant ouverte',
        '',
        'CTAs : 1-2 phrases max, tentatifs ("on pourrait…"), spécifiques au sujet.',
        '',
      ]),
    'Réponds STRICTEMENT en JSON :',
    '{"finalAnswer":"<réponse augmentée AVEC les 3 CTA en fin>","rationale":"<1 phrase>"}',
    'Pas d\'autre prose autour du JSON, pas de markdown.',
  ].join('\n');

  const user = [
    `QUESTION : ${question}`,
    '',
    `RÉPONSE CLAUDE BRUT À AUGMENTER :`,
    claudeAnswer,
    '',
    `Applique les corrections listées dans le system prompt. Produis le JSON.`,
  ].join('\n');

  const r = await callLLM({ system, user, maxTokens: 1500 });
  if (!r.ok) return r;
  try {
    const match = r.text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, reason: 'no_json', raw: r.text };
    const json = JSON.parse(match[0]);
    return {
      ok: true,
      finalAnswer: json.finalAnswer,
      rationale: json.rationale || '',
      injections_applied: diagnosis.injections_needed,
      weaknesses_addressed: diagnosis.weaknesses.map(w => w.code),
      model: r.model,
      usage: r.usage,
    };
  } catch (e) {
    return { ok: false, reason: 'json_parse_error', error: e.message, raw: r.text };
  }
}

// ───────────────────── MATRICE D'ACTIVATION ─────────────────────

/**
 * Pour un domaine + structures + ambiguïté, dit QUELLES injections
 * ZORAN sont à activer. Cette matrice peut grandir empiriquement
 * via failures_memory.
 */
export function activationMatrix({ domain, structures, ambiguity = 0.5 }) {
  const recommendations = [];
  const domKey = domain?.key || 'general';
  const structKeys = (structures || []).map(s => s.key || s);

  // Médecine + juridique : anti-hallu prioritaire (coût erreur élevé)
  if (domKey === 'medicine' || domKey === 'legal') {
    recommendations.push({ injection: 'anti_hallucination', reason: 'domaine à fort coût d\'erreur — auditabilité critique' });
  }
  // BTP + structures propagation : structurelle pour causes racines
  if (domKey === 'btp' && structKeys.includes('propagation')) {
    recommendations.push({ injection: 'structurelle', reason: 'BTP + cascade structurelle → cause racine' });
  }
  // OOD ou questions très ambiguës : frugale pour éviter dérive
  if (ambiguity > 0.7 || structKeys.length === 0) {
    recommendations.push({ injection: 'frugale', reason: 'ambiguïté/OOD → compression défensive' });
  }
  // Multi-cadres : orchestré (combine angles)
  if (structKeys.length >= 3) {
    recommendations.push({ injection: 'orchestrated', reason: 'multi-cadres → orchestration silencieuse' });
  }
  // Hallucination traps (Tabary, arrêt fictif…) : anti-hallu obligatoire
  if (structKeys.includes('hypothese_cachee') || structKeys.includes('auditabilite')) {
    recommendations.push({ injection: 'anti_hallucination', reason: 'hypothèses cachées / besoin auditabilité' });
  }
  // Dédup
  const seen = new Set();
  return recommendations.filter(r => {
    if (seen.has(r.injection)) return false;
    seen.add(r.injection);
    return true;
  });
}
