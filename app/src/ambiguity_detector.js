// app/src/ambiguity_detector.js
// Mission V7 — IDENTITY DISAMBIGUATION GATE
//
// Détecte si une question porte sur une personne nommée, et si oui,
// estime le niveau d'ambiguïté identitaire.
//
// Signaux d'ambiguïté :
//   - nom commun (Jean Martin, Frédéric Dupont) → forte ambiguïté
//   - pas de contexte (profession, organisation, lieu, projet)
//   - figure non-célèbre
//
// Signaux d'identité claire :
//   - célébrité historique consensuelle (Einstein, Napoleon)
//   - contexte explicite ("dans ZORAN", "le philosophe", "designer nantais")
//   - description multi-attribut

// Patterns de question sur personne
const PERSON_QUESTION_RX = /\b(qui est|c['']est qui|quel est (le |la )?parcours? (de |d['']|du )|biographie de|parle.?moi de|peux.?tu me parler de|connais.?tu|connaissez.?vous|qui est ce|d['']où vient|raconte.?moi)\b/i;

// Patterns nom propre (Prénom Nom)
// Détecte : Frédéric Tabary, Jean-Pierre Dupont, Marie Curie, etc.
const PERSON_NAME_RX = /\b([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\-' ][A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\-' ][A-ZÀ-Ÿ][a-zà-ÿ]+)*)/g;

// Figures historiques consensuellement reconnues (whitelist conservatrice)
const FAMOUS_FIGURES = new Set([
  // Science
  'einstein', 'newton', 'darwin', 'curie', 'hawking', 'turing', 'galilée',
  'pasteur', 'lavoisier', 'mendel', 'tesla', 'feynman', 'oppenheimer',
  // Politique / Histoire
  'napoléon', 'napoleon', 'césar', 'jules césar', 'alexandre le grand',
  'lincoln', 'gandhi', 'mandela', 'de gaulle', 'churchill', 'roosevelt',
  'mao', 'staline', 'hitler', 'mussolini',
  // Art
  'mozart', 'beethoven', 'bach', 'chopin', 'vivaldi',
  'picasso', 'monet', 'van gogh', 'rembrandt', 'vermeer', 'dali',
  'léonard de vinci', 'da vinci', 'michel-ange',
  // Littérature / Philosophie
  'shakespeare', 'hugo', 'molière', 'voltaire', 'rousseau', 'sartre',
  'platon', 'aristote', 'socrate', 'kant', 'nietzsche', 'descartes',
  // Cinéma
  'kubrick', 'spielberg', 'hitchcock', 'tarantino',
  // Tech / Business
  'musk', 'gates', 'jobs', 'zuckerberg', 'bezos',
]);

// Prénoms français très communs (signal d'ambiguïté élevée si combiné à nom courant)
const COMMON_FRENCH_FIRSTNAMES = new Set([
  'jean', 'pierre', 'paul', 'jacques', 'michel', 'françois', 'philippe',
  'frédéric', 'frederic', 'thomas', 'david', 'julien', 'sébastien', 'nicolas',
  'olivier', 'patrick', 'pascal', 'laurent', 'christophe', 'stéphane',
  'marie', 'sophie', 'isabelle', 'catherine', 'nathalie', 'martine',
  'sylvie', 'monique', 'françoise', 'anne', 'claire', 'julie', 'sarah',
]);

// Noms de famille français très communs
const COMMON_FRENCH_LASTNAMES = new Set([
  'martin', 'bernard', 'thomas', 'petit', 'robert', 'richard', 'durand',
  'dubois', 'moreau', 'laurent', 'simon', 'michel', 'lefebvre', 'leroy',
  'roux', 'david', 'bertrand', 'morel', 'fournier', 'girard',
  'bonnet', 'dupont', 'lambert', 'fontaine', 'rousseau', 'vincent',
  'muller', 'lefevre', 'faure', 'andre', 'mercier', 'blanc', 'guerin',
  'tabary',  // ajouté empiriquement (nom modérément rare)
]);

// Marqueurs de contexte fort — séparés pour gérer accents FR (philosophe / philosophes
// / professeure / chercheuse) sans \b final qui échoue après lettres accentuées.
// Accepte "le philosophe" ET ", philosophe" (apposition).
const PROFESSION_RX = /(?:\b(le|la|les)\s+|,\s*)(philosoph\w*|physicien\w*|mathématicien\w*|designer\w*|architect\w*|écrivain\w*|réalisateur\w*|peintre\w*|musicien\w*|compositeur\w*|sportif\w*|président\w*|ministre\w*|chercheu\w*|professeu\w*|professoral\w*|fondateu\w*|ingénieu\w*|inventeu\w*|développeu\w*|spécialiste\w*|expert\w*|directeu\w*|auteur\w*|réalisateur\w*)/i;
const CONTEXT_PHRASE_RX = /\b(dans (ZORAN|le projet|cette? (étude|recherche|article|paper|publication)|notre (équipe|étude))|spécialiste (de|du|en)|expert (de|du|en)|prix Nobel|président (de|du|des)|fondateu\w* (de|du|des)|nantais|parisien|lyonnais|américain|français|allemand|anglais|du XX|XIX|XVIII|du \d{4}|né en \d{4}|décédé en \d{4})/i;

// Marqueur "ce/cette + nom" → contexte interne implicite
const INTERNAL_REFERENCE_RX = /\b(notre|le projet|ce (système|module|outil|design|article)|cette (étude|recherche)|précédemment|comme évoqué|déjà mentionné)\b/i;

/**
 * Détecte si une question est une question d'identité personne.
 */
export function isPersonIdentityQuestion(question) {
  if (!question) return false;
  return PERSON_QUESTION_RX.test(question);
}

// Titres à ignorer en tant que "prénom"
const TITLE_TOKENS = new Set([
  'dr', 'pr', 'm', 'mme', 'mlle', 'me', 'mtre', 'mgr', 'sr', 'st',
  'monsieur', 'madame', 'mademoiselle', 'maître', 'docteur', 'professeur',
]);

/**
 * Extrait les noms propres potentiels (Prénom Nom).
 * Retourne array de { first, last, full }.
 * Filtre les titres (Dr, M., Mme, Pr, Maître) qui ne sont pas des prénoms.
 */
export function extractPersonNames(question) {
  if (!question) return [];
  const matches = [];
  const seen = new Set();
  let m;
  PERSON_NAME_RX.lastIndex = 0;
  while ((m = PERSON_NAME_RX.exec(question)) !== null) {
    const full = m[0];
    const key = full.toLowerCase();
    if (seen.has(key)) continue;
    // Filtre titres : si "first" est un titre, ce n'est pas un nom de personne
    const firstNormalized = m[1].toLowerCase().replace(/\.$/, '');
    if (TITLE_TOKENS.has(firstNormalized)) continue;
    seen.add(key);
    matches.push({ first: m[1], last: m[2], full });
  }
  return matches;
}

/**
 * Détecte si un nom (full) correspond à une figure célèbre consensuelle.
 */
export function isFamousFigure(fullName) {
  if (!fullName) return false;
  const lower = fullName.toLowerCase();
  // Match exact dans whitelist
  if (FAMOUS_FIGURES.has(lower)) return true;
  // Match sur nom seul (ex: "Einstein" sans "Albert")
  const parts = lower.split(/\s+/);
  for (const part of parts) {
    if (FAMOUS_FIGURES.has(part)) return true;
  }
  return false;
}

/**
 * Estime le niveau d'ambiguïté du nom (homonym_density indirect).
 * Plus le prénom ET le nom sont communs, plus l'ambiguïté est haute.
 */
export function estimateNameCommonness({ first, last }) {
  if (!first || !last) return 0.5;
  const firstCommon = COMMON_FRENCH_FIRSTNAMES.has(first.toLowerCase()) ? 1 : 0;
  const lastCommon = COMMON_FRENCH_LASTNAMES.has(last.toLowerCase()) ? 1 : 0;
  // Les 2 communs = très ambigu, l'un OU l'autre = modéré
  if (firstCommon && lastCommon) return 0.90;
  if (firstCommon || lastCommon) return 0.55;
  return 0.20;
}

/**
 * Détecte un contexte fort dans la question.
 */
export function hasContextualAnchor(question) {
  if (!question) return { has_anchor: false, evidence: [] };
  const profMatch = question.match(PROFESSION_RX);
  const ctxMatch = question.match(CONTEXT_PHRASE_RX);
  const internalMatch = question.match(INTERNAL_REFERENCE_RX);
  const evidence = [];
  if (profMatch) evidence.push(`profession: "${profMatch[0]}"`);
  if (ctxMatch) evidence.push(`contexte explicite: "${ctxMatch[0]}"`);
  if (internalMatch) evidence.push(`référence interne: "${internalMatch[0]}"`);
  return {
    has_anchor: Boolean(profMatch || ctxMatch || internalMatch),
    evidence,
  };
}

/**
 * Détecteur principal d'ambiguïté identitaire.
 *
 * @param {string} question
 * @returns { is_identity_question, names[], identity_confidence, ambiguity_score, evidence, recommendation }
 */
export function detectIdentityAmbiguity(question) {
  if (!question) {
    return { is_identity_question: false };
  }
  const isQuestion = isPersonIdentityQuestion(question);
  const names = extractPersonNames(question);

  if (!isQuestion && names.length === 0) {
    return { is_identity_question: false, names: [], identity_confidence: 1.0, ambiguity_score: 0 };
  }

  const contextual = hasContextualAnchor(question);
  const namesAnalysis = names.map(n => ({
    ...n,
    is_famous: isFamousFigure(n.full),
    commonness: estimateNameCommonness(n),
  }));

  // identity_confidence — calcul par nom puis MIN (la plus faible confiance pilote)
  let minConfidence = 1.0;
  const evidence = [];
  for (const n of namesAnalysis) {
    let conf;
    if (n.is_famous && contextual.has_anchor) {
      conf = 0.95;
      evidence.push(`"${n.full}" — figure célèbre + contexte fort → conf 0.95`);
    } else if (n.is_famous) {
      conf = 0.85;
      evidence.push(`"${n.full}" — figure célèbre → conf 0.85`);
    } else if (contextual.has_anchor) {
      // Nom non-célèbre mais contexte fort (ex: "Frédéric Tabary dans ZORAN")
      conf = 0.70;
      evidence.push(`"${n.full}" — non-célèbre mais contexte fort → conf 0.70`);
    } else {
      // Nom non-célèbre sans contexte → ambiguïté pilotée par commonness
      conf = Math.max(0.10, 0.50 - n.commonness * 0.40);
      evidence.push(`"${n.full}" — non-célèbre sans contexte (commonness ${n.commonness}) → conf ${conf.toFixed(2)}`);
    }
    if (conf < minConfidence) minConfidence = conf;
  }

  const ambiguity_score = +(1 - minConfidence).toFixed(3);
  const identity_confidence = +minConfidence.toFixed(3);

  // Décision MANDATORY_DISAMBIGUATION
  const THRESHOLD = 0.50;
  const mandatory_disambiguation = isQuestion
                                && names.length > 0
                                && identity_confidence < THRESHOLD;

  return {
    is_identity_question: isQuestion,
    names: namesAnalysis,
    contextual_anchor: contextual,
    identity_confidence,
    ambiguity_score,
    mandatory_disambiguation,
    threshold: THRESHOLD,
    evidence,
    recommendation: mandatory_disambiguation
      ? 'DISAMBIGUATE_BEFORE_ANSWER'
      : identity_confidence < 0.70
      ? 'ANSWER_WITH_EXPLICIT_HEDGES'
      : 'ANSWER_DIRECTLY',
  };
}
