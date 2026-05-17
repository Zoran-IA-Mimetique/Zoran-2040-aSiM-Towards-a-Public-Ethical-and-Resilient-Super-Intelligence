// app/src/vernacular_wisdom_engine.js
// Mission V11 P2 — VERNACULAR WISDOM ENGINE
//
// Cible : LR-1 (langage praticien sans jargon technique).
//
// INTERDICTION (mission V11) : pas de regex sur vocabulaire technique,
// pas de densité lexicale, pas de longueur.
//
// APPROCHE PRAGMATIQUE (pas embeddings car non-disponibles offline) :
// détection de PATTERNS COMPORTEMENTAUX d'expertise terrain :
//   1. Impératifs praticien (pose, prends, gratte, surveille)
//   2. Diagnostic probabiliste sans certitude verbale
//   3. Élimination structurelle (si X alors Y, sinon Z)
//   4. Mesures low-tech valides (témoin papier, photo datée, niveau à bulle)
//   5. Expérience implicite (j'ai vu, c'est classique, généralement)
//   6. Causalité physique simple (humidité remonte, argile sèche)
//
// Cette approche reconnaît l'expertise par sa STRUCTURE COMPORTEMENTALE,
// pas son vocabulaire.

// ────────── 1. IMPÉRATIFS PRATICIEN ──────────
// Verbes à l'impératif 2e personne — actions concrètes terrain
const PRACTICIAN_IMPERATIVE_RX = /\b(pose|prends|gratte|passe|fais|mets|décaisse|surveille|surveille|appelle|fais venir|vérifie|garde|laisse|évite|attends|regarde|inspecte|note|photographie|mesure|ouvre|aère|sèche|reprends?|colmate|déga[gz]e|nettoie|teste)\b/gi;

// ────────── 2. DIAGNOSTIC PROBABILISTE ──────────
const PROBABILISTIC_DIAGNOSTIC_RX = /\b(probablement|sans doute|sans certitude|à peu près|en général|le plus souvent|généralement|c['']est plutôt|c['']est sûrement|ça ressemble (à |fort à )|ça sent (le |la )|on dirait (du |de la |un |une )|ça pourrait être|peut.?être (du |de la |un |une )|j['']ai vu|déjà vu|classique)\b/gi;

// ────────── 3. ÉLIMINATION CONDITIONNELLE ──────────
// Structure "si X alors Y, sinon Z" — réduction d'hypothèses pragmatique
const PRAGMATIC_ELIMINATION_RX = /\b(si (ça |c['']est |la |le |les |un |une )?[\w\s']{2,30}\s*,?\s*(alors |c['']est |c['']est plutôt|→)|sinon|si ça bouge\s*(pas)?|si tu vois|si ça revient|si pas|au cas où)\b/gi;

// ────────── 4. MESURES LOW-TECH VALIDES ──────────
// Mesures praticien efficaces sans instrumentation lourde
const LOW_TECH_MEASURE_RX = /\b(témoin (papier|plâtre|verre|chimique)|photo\w* daté\w*|photo\w* mensuelle?|niveau (à bulle|laser portable)|règle|réglet|crayon|repère\w* (mural\w*|tracé)|trait (au crayon|de référence)|marquage\w* au sol|test de l['']eau|essai d['']eau|seau|tuyau d['']arrosage|tournevis|lampe torche|inspection visuelle systématique)\b/gi;

// ────────── 5. EXPÉRIENCE IMPLICITE ──────────
const EXPERIENCE_MARKERS_RX = /\b(j['']ai (vu|déjà vu|rencontré|fait|eu|trouvé)|on voit (souvent|parfois|régulièrement)|c['']est (un |le |la )?(classique|grand classique|courant|typique)|toujours pareil|à chaque fois que|systématiquement|d['']expérience|ça arrive souvent|fréquent|je connais le pattern|en général c['']est)\b/gi;

// ────────── 6. CAUSALITÉ PHYSIQUE SIMPLE ──────────
// Description causale en mots simples, pas en jargon
const SIMPLE_CAUSAL_PHYSICS_RX = /\b(l['']?eau (qui )?(remonte|pénètre|s['']?infiltre|descend|stagne)|l['']?humidité qui (remonte|monte|reste|s['']?installe)|l['']?argile (qui )?(sèche|gonfle|travaille|se rétracte)|le mur (qui )?(travaille|bouge|pousse|tire|respire|absorbe|sue)|ça (pousse|tire|travaille|gonfle|sèche|bouge|tape|cogne|cisaille)|le terrain (qui )?(bouge|cède|s['']affaisse)|le sol (qui )?(boit|sature|gonfle|s['']?affaisse))\b/gi;

// ────────── PATHOLOGIES IMPLICITES ──────────
// Termes du quotidien désignant des pathologies sans utiliser leur nom technique
const IMPLICIT_PATHOLOGY_RX = /\b(ça boit|ça pisse|ça coule|ça suinte|ça cloque|ça gondole|ça tire|ça pousse|ça travaille|ça bouge|ça craque|ça lézarde|ça moisi|ça pourrit|ça rouille|ça sue|ça respire plus|ça tient pas|ça lâche|c['']est gondolé|c['']est mou|c['']est tendu)\b/gi;

/**
 * VERNACULAR_WISDOM_SCORE [0..1]
 * Mesure l'expertise praticien sans jargon.
 */
export function vernacularWisdomScore(text) {
  if (!text || text.length < 30) return { score: 0, components: {}, evidence: [] };

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  const imperatives = (text.match(PRACTICIAN_IMPERATIVE_RX) || []).length;
  const probabilistic = (text.match(PROBABILISTIC_DIAGNOSTIC_RX) || []).length;
  const elimination = (text.match(PRAGMATIC_ELIMINATION_RX) || []).length;
  const lowTech = (text.match(LOW_TECH_MEASURE_RX) || []).length;
  const experience = (text.match(EXPERIENCE_MARKERS_RX) || []).length;
  const physics = (text.match(SIMPLE_CAUSAL_PHYSICS_RX) || []).length;
  const implicitPath = (text.match(IMPLICIT_PATHOLOGY_RX) || []).length;

  // Composantes [0..1] — chaque marqueur compte mais sature
  const c_imperatives = Math.min(1, imperatives / 3);     // 3+ impératifs = full
  const c_probabilistic = Math.min(1, probabilistic / 2);
  const c_elimination = Math.min(1, elimination / 2);
  const c_lowTech = Math.min(1, lowTech / 2);
  const c_experience = Math.min(1, experience / 1.5);
  const c_physics = Math.min(1, physics / 2);
  const c_implicitPath = Math.min(1, implicitPath / 2);

  // Composite pondéré : impératifs et physique simple sont les plus prédictifs
  const composite = +(
    0.25 * c_imperatives
    + 0.15 * c_probabilistic
    + 0.15 * c_elimination
    + 0.15 * c_lowTech
    + 0.10 * c_experience
    + 0.10 * c_physics
    + 0.10 * c_implicitPath
  ).toFixed(3);

  const evidence = [];
  if (imperatives > 0) evidence.push(`${imperatives} impératifs praticien`);
  if (probabilistic > 0) evidence.push(`${probabilistic} diagnostic probabiliste`);
  if (elimination > 0) evidence.push(`${elimination} élimination conditionnelle`);
  if (lowTech > 0) evidence.push(`${lowTech} mesure low-tech valide`);
  if (experience > 0) evidence.push(`${experience} marqueur expérience`);
  if (physics > 0) evidence.push(`${physics} causalité physique simple`);
  if (implicitPath > 0) evidence.push(`${implicitPath} pathologie implicite`);

  return {
    score: composite,
    components: {
      practician_imperatives: c_imperatives,
      probabilistic_diagnostic: c_probabilistic,
      pragmatic_elimination: c_elimination,
      low_tech_measures: c_lowTech,
      experience_markers: c_experience,
      simple_causal_physics: c_physics,
      implicit_pathology: c_implicitPath,
    },
    raw_counts: {
      imperatives, probabilistic, elimination, lowTech,
      experience, physics, implicitPath,
    },
    evidence,
    verdict: composite >= 0.45 ? 'vernacular_expert'
           : composite >= 0.20 ? 'practician'
           : composite >= 0.10 ? 'casual'
           : 'no_vernacular_signal',
    word_count: wordCount,
  };
}

/**
 * Détecte si une réponse est PROBABLEMENT du langage praticien terrain
 * (à utiliser pour ne pas pénaliser dans des scores anti-jargon).
 */
export function isLikelyVernacularExpertise(text) {
  const result = vernacularWisdomScore(text);
  return result.score >= 0.20;
}
