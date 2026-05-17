// app/src/conclusion_wrapper.js
// Mission V11.1 — wrapper "CONCLUSION:" forcé en sortie LLM
//
// Condition production V11 imposée par validation user partielle :
// soit parser sémantique des conclusions implicites,
// soit wrapper forcé "CONCLUSION : ..." en sortie.
//
// Cette implémentation = wrapper forcé. Post-traite toute réponse expert
// pour garantir 3 sections terminales explicites :
//   **Conclusion** : [verdict]
//   **Limites**   : [incertitudes]
//   **Contre-hypothèse** : [alternative à tester]
//
// Si déjà présentes → no-op.
// Si absentes → extraction depuis le corps + ajout structuré.

// ────────── DÉTECTION SECTIONS EXISTANTES ──────────
const EXISTING_CONCLUSION_RX = /\*?\*?\s*(conclusion|verdict|bilan|synthèse)\s*\*?\*?\s*[:\-—]/i;
const EXISTING_LIMITS_RX = /\*?\*?\s*(limit|incertitudes?|à vérifier|réserves?)\s*\*?\*?\s*[:\-—]/i;
const EXISTING_CONTRE_RX = /\*?\*?\s*(contre.?hypothèse|alternative|réfutation|et si)\s*\*?\*?\s*[:\-—]/i;
const EXISTING_ACTION_RX = /\*?\*?\s*(actions?|prochaines? étapes?|à faire|recommandations?)\s*\*?\*?\s*[:\-—]/i;

// ────────── EXTRACTION DES CANDIDATES ──────────
// Phrases qui ressemblent à des conclusions implicites
const IMPLICIT_CONCLUSION_RX = /([^.!?]*\b(engagement|probable|confirmé|certain|nécessite|impose|engage|implique|décennale|article 1792|atteinte|impropre|verdict|décision|verdict final|à retenir)\b[^.!?]*[.!?])/i;

// Phrases qui ressemblent à des limites implicites
const IMPLICIT_LIMITS_RX = /([^.!?]*\b(à confirmer|à vérifier|sous réserve|nécessite|hypothèse à valider|incertitude|reste à|limite\w*|sans données)\b[^.!?]*[.!?])/i;

// Phrases qui ressemblent à des contre-hypothèses
const IMPLICIT_CONTRE_RX = /([^.!?]*\b(et si|à l['']inverse|alternative|sinon|à écarter|à infirmer|peut.?être (que )?(la cause|en réalité))\b[^.!?]*[.!?])/i;

// Phrases qui ressemblent à des actions
const IMPLICIT_ACTION_RX = /([^.!?]*\b(étape \d|action immédiate|sous \d+\s*(j|h|jour|mois|semaine)|mandat|mise en demeure|déclar\w+|saisir|étaiement|sondage|carottage|expertise)\b[^.!?]*[.!?])/i;

function extractFirstMatch(text, rx) {
  const m = text.match(rx);
  return m ? m[1].trim() : null;
}

/**
 * Vérifie si les 3 sections terminales sont DÉJÀ présentes explicitement.
 */
export function hasExplicitConclusionBlock(text) {
  if (!text) return { has_all: false, missing: ['conclusion', 'limits', 'contre', 'action'] };
  // Fenêtre terminale : max(dernier tiers, 400 derniers chars)
  const tierStart = Math.floor(text.length * 0.66);
  const fixedStart = Math.max(0, text.length - 400);
  const sliceStart = Math.min(tierStart, fixedStart);
  const terminal = text.slice(sliceStart);
  const hasConclusion = EXISTING_CONCLUSION_RX.test(terminal);
  const hasLimits = EXISTING_LIMITS_RX.test(terminal);
  const hasContre = EXISTING_CONTRE_RX.test(terminal);
  const hasAction = EXISTING_ACTION_RX.test(terminal);
  const missing = [];
  if (!hasConclusion) missing.push('conclusion');
  if (!hasLimits) missing.push('limits');
  if (!hasContre) missing.push('contre');
  if (!hasAction) missing.push('action');
  return {
    has_all: missing.length === 0,
    has_conclusion: hasConclusion,
    has_limits: hasLimits,
    has_contre: hasContre,
    has_action: hasAction,
    missing,
  };
}

/**
 * Wrapper principal : garantit les 3 sections terminales.
 *
 * Stratégie :
 * 1. Si tout présent → no-op
 * 2. Si conclusion manquante → extraire phrase la plus "décisive" du texte
 * 3. Si limites manquantes → extraire phrase d'incertitude, ou placeholder
 * 4. Si contre-hypothèse manquante → extraire ou placeholder
 *
 * Le résultat ajoute un BLOC FINAL structuré, sans modifier le corps.
 */
export function wrapConclusion(text, options = {}) {
  if (!text || text.length < 50) return text;

  const check = hasExplicitConclusionBlock(text);
  if (check.has_all) return text; // no-op

  // Extraire candidates dans tout le texte (pas seulement terminal)
  const conclusionCandidate = check.has_conclusion ? null : extractFirstMatch(text, IMPLICIT_CONCLUSION_RX);
  const limitsCandidate = check.has_limits ? null : extractFirstMatch(text, IMPLICIT_LIMITS_RX);
  const contreCandidate = check.has_contre ? null : extractFirstMatch(text, IMPLICIT_CONTRE_RX);
  const actionCandidate = check.has_action ? null : extractFirstMatch(text, IMPLICIT_ACTION_RX);

  // Construire le bloc final
  const finalBlock = [];
  finalBlock.push(''); // ligne vide séparatrice
  finalBlock.push('---');

  if (!check.has_conclusion) {
    finalBlock.push(`**Conclusion** : ${conclusionCandidate || 'analyse à compléter après instrumentation discriminante.'}`);
  }

  if (!check.has_action) {
    finalBlock.push(`**Action immédiate** : ${actionCandidate || 'mandat BET indépendant pour confirmation diagnostic.'}`);
  }

  if (!check.has_limits) {
    finalBlock.push(`**Limites** : ${limitsCandidate || 'diagnostic à distance, sans validation terrain réelle.'}`);
  }

  if (!check.has_contre) {
    finalBlock.push(`**Contre-hypothèse** : ${contreCandidate || 'à formuler par expertise contradictoire indépendante.'}`);
  }

  return text.trimEnd() + '\n' + finalBlock.join('\n');
}

/**
 * Métrique : combien de réponses nécessitent le wrapper ?
 * (utile pour dashboard de monitoring)
 */
export function conclusionWrapStats(text) {
  const check = hasExplicitConclusionBlock(text);
  return {
    needs_wrap: !check.has_all,
    sections_present: 3 - check.missing.length,
    sections_missing: check.missing,
  };
}
