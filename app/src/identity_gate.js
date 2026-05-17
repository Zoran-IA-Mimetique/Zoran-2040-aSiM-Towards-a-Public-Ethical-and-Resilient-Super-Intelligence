// app/src/identity_gate.js
// Mission V7 — IDENTITY DISAMBIGUATION GATE
//
// Couche AVANT toute génération biographique.
// Si identité ambiguë → bloque la génération, retourne demande de clarification.
//
// Cette couche est PRIORITAIRE sur le fast-path V6 :
//   - Une question simple "Qui est Frédéric Tabary ?" déclencherait V6 fast-path
//   - Mais V7 intercepte AVANT : ambiguïté identitaire = pas de réponse,
//     uniquement une demande de précision.
//
// Lois ZORAN prioritaires (mission lettre) :
//   WP12-028 Bornage affirmations
//   WP12-009 Anti-hallucination
//   WP11-009 Rigueur épistémique
//   DVE-020  Anti-fabrication
//   WP12-031 Scope explicite
//   SDE-019  Self-doubt obligatoire

import { detectIdentityAmbiguity } from './ambiguity_detector.js';

/**
 * Construit le message de clarification adapté.
 * Pas d'invention : juste questions de précision possibles.
 */
function buildDisambiguationPrompt(detection) {
  const names = detection.names.map(n => n.full);
  const namesList = names.length > 1
    ? `les noms "${names.join('", "')}"`
    : `le nom "${names[0]}"`;
  return [
    `Plusieurs personnes peuvent correspondre à ${namesList}.`,
    `Pour répondre sans risque de confusion, peux-tu préciser le contexte :`,
    ``,
    `- domaine d'activité (design, IA, recherche, sport, entreprise, autre) ?`,
    `- localisation (ville, pays, région) ?`,
    `- époque (XIXe, contemporain, années 2000…) ?`,
    `- contexte spécifique (projet, organisation, événement) ?`,
    ``,
    `_(Cette demande est automatique : le système refuse d'inventer une biographie sans contexte suffisant.)_`,
  ].join('\n');
}

/**
 * Gate principal d'identité.
 *
 * @param {string} question
 * @returns { passes_gate, detection, response_if_blocked, reason }
 */
export function identityGate(question) {
  const detection = detectIdentityAmbiguity(question);

  // Pas une question d'identité → laisse passer
  if (!detection.is_identity_question) {
    return {
      passes_gate: true,
      detection,
      reason: 'not_identity_question',
    };
  }

  // Question d'identité sans nom détecté (rare) → laisse passer avec warning
  if (!detection.names || detection.names.length === 0) {
    return {
      passes_gate: true,
      detection,
      reason: 'identity_question_no_name_extracted',
    };
  }

  // Identité ambiguë → BLOQUE
  if (detection.mandatory_disambiguation) {
    return {
      passes_gate: false,
      detection,
      response_if_blocked: buildDisambiguationPrompt(detection),
      reason: 'ambiguous_identity',
      lois_applied: ['WP12-028', 'WP12-009', 'WP11-009', 'DVE-020', 'WP12-031', 'SDE-019'],
    };
  }

  // Identité confiance moyenne → laisse passer avec injection hedges obligatoire
  if (detection.identity_confidence < 0.70) {
    return {
      passes_gate: true,
      detection,
      reason: 'identity_low_confidence_with_hedges',
      hedges_required: true,
      injection_hint: 'Préfixer toute affirmation par "Si vous parlez de [contexte] :" ou "À vérifier auprès d\'une source web : il s\'agirait de…"',
    };
  }

  // Identité confiance haute (figure célèbre ou contexte fort) → laisse passer
  return {
    passes_gate: true,
    detection,
    reason: 'identity_high_confidence',
  };
}

/**
 * Détecte si une réponse contient des affirmations biographiques non supportées.
 * Utilisé en post-hoc pour calculer `unsupported_bio_claims`.
 */
const BIO_CLAIM_RX = /\b(est (un|une|le|la) (designer|architecte|écrivain|réalisateur|peintre|musicien|compositeur|sportif|président|ministre|chercheur|professeur|fondateur|ingénieur|inventeur|développeur|spécialiste|expert|philosophe|physicien|mathématicien|économiste)|né le \d|né en \d{4}|décédé (en|le) \d|a fondé|travaille (à|chez|pour)|directeur (de|du)|professeur (à|de|à l[''])|enseigne (à|au|chez)|a publié|a écrit|auteur (de|du))\b/gi;

const SOURCE_DISCLAIMER_RX = /\b(à vérifier|à confirmer|selon (le contexte|différentes sources|wikipédia)|sous réserve|peut désigner plusieurs personnes|je ne peux pas confirmer|sans source|sans certitude|nécessite vérification|si (vous parlez|il s['']agit) de)\b/i;

export function countUnsupportedBioClaims(responseText) {
  if (!responseText) return { count: 0, claims: [], disclaimer_present: false };
  const claims = responseText.match(BIO_CLAIM_RX) || [];
  const disclaimer = SOURCE_DISCLAIMER_RX.test(responseText);
  return {
    count: claims.length,
    claims: claims.slice(0, 5),
    disclaimer_present: disclaimer,
    // Si claims présents SANS disclaimer → risque élevé
    risk_score: disclaimer ? +Math.min(0.5, claims.length * 0.10).toFixed(2)
                           : +Math.min(1.0, claims.length * 0.20).toFixed(2),
  };
}

/**
 * Métrique identity_hallu_risk pour une réponse donnée à une question identité.
 * Combine ambiguity_score + unsupported_bio_claims.
 */
export function identityHalluRisk(question, responseText) {
  const detection = detectIdentityAmbiguity(question);
  if (!detection.is_identity_question) {
    return { score: 0, reason: 'not_identity_question' };
  }
  const claims = countUnsupportedBioClaims(responseText);
  // Si AUCUN bio claim → score quasi nul (système a correctement esquivé)
  // Si claims présents → l'ambiguïté de la question AMPLIFIE le risque
  const base = claims.risk_score;
  const amplification = 1 + 0.5 * detection.ambiguity_score;
  const score = +Math.min(1, base * amplification).toFixed(3);
  return {
    score,
    ambiguity_score: detection.ambiguity_score,
    unsupported_bio_claims: claims.count,
    disclaimer_present: claims.disclaimer_present,
    fires: score >= 0.40,
    hint: score >= 0.40
      ? `Réponse biographique sur identité ambiguë sans disclaimer suffisant (${claims.count} claims, ambiguity ${detection.ambiguity_score})`
      : '',
  };
}
