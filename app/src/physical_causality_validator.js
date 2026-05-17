// app/src/physical_causality_validator.js
// Mission V11 P3 — PHYSICAL CAUSALITY VALIDATOR
//
// Cible : LR-2 (causalité syntaxiquement correcte mais physiquement fausse).
//
// Exemples à bloquer :
//   - "les fissures causent l'argile gonflante"  (effet → cause)
//   - "la condensation explique le tassement du sol"  (échelles incompatibles)
//   - "la ventilation explique le mouvement de fondation"  (impossible mécanique)
//   - "le HEB explique fissures façade entière" sans chemin de charge
//
// Approche : graphe de causalités plausibles encodé en règles physiques.
// Détection de patterns FORBIDDEN par physique du bâtiment.

// ────────── DIRECTIONS CAUSALES PLAUSIBLES ──────────
// Format : effet ← cause (cause peut produire effet)
// Si le texte affirme l'inverse (cause ← effet), c'est une inversion.

const CAUSAL_GRAPH = {
  // RGA & sols
  fissuration: ['rga', 'tassement', 'surcharge', 'humidite_externe', 'gel_degel', 'corrosion', 'sismicite'],
  tassement: ['rga', 'sol_argileux_satur', 'remblai_mal_compact', 'nappe_battante', 'fuite_canalisation', 'surcharge'],
  rga: ['secheresse', 'rehydratation', 'sol_argileux'],   // RGA causé par sécheresse, pas effet

  // Humidité
  humidite: ['infiltration', 'condensation', 'remontee_capillaire', 'fuite', 'ventilation_insuffisante', 'pont_thermique'],
  condensation: ['pont_thermique', 'ventilation_insuffisante', 'isolation_int', 'humidite_air_excessive'],
  remontee_capillaire: ['absence_drainage', 'mur_poreux', 'sol_humide', 'absence_etancheite'],
  moisissure: ['humidite', 'condensation', 'ventilation_insuffisante'],

  // Corrosion
  corrosion: ['humidite', 'carbonatation', 'chlorures', 'oxygene', 'absence_protection'],
  carbonatation: ['co2_air', 'humidite_partielle', 'age_beton'],
  eclat_beton: ['corrosion', 'gel_degel', 'choc'],

  // Thermique
  pont_thermique: ['discontinuite_isolation', 'liaison_dalle', 'absence_rupteur'],
  deperdition: ['absence_isolation', 'pont_thermique', 'ventilation_excessive', 'infiltration_air'],

  // Structurel
  flambement: ['surcharge', 'sous_dimensionnement', 'elancement_excessif'],
  fluage: ['charge_permanente', 'age', 'temperature'],
  deformation_structurelle: ['surcharge', 'fluage', 'fatigue', 'corrosion_armatures'],
};

// ────────── ÉCHELLES SPATIALES INCOMPATIBLES ──────────
// Pathologies à l'échelle micro qui ne peuvent pas causer effets à l'échelle macro
const SCALE_INCOMPATIBLE = [
  { micro: 'condensation', macro: 'tassement' },
  { micro: 'condensation', macro: 'mouvement_fondation' },
  { micro: 'condensation', macro: 'fissures_structurelles_lourdes' },
  { micro: 'ventilation', macro: 'mouvement_fondation' },
  { micro: 'ventilation', macro: 'tassement' },
  { micro: 'salpetre', macro: 'fissures_structurelles' },
  { micro: 'peinture_cloque', macro: 'effondrement' },
];

// ────────── PATTERNS DE CAUSALITÉ AFFIRMÉE DANS TEXTE ──────────
// Détecte "X cause Y", "X explique Y", "X provoque Y", "X entraîne Y", "X amplifie Y"
const CAUSAL_ASSERTION_RX = /\b(\w[\w\s'éèàùâêîôûäëïöü-]{1,40}?)\s+(?:cause|causent|expliqu\w+|provoqu\w+|entra[iî]n\w+|amplifi\w+|aggrav\w+|produi\w+|résult\w+|révèl\w+|conduit (?:à|au))\s+(\w[\w\s'éèàùâêîôûäëïöü-]{1,40})/gi;

// Patterns simplifiés pour identifier les concepts dans une phrase
const CONCEPT_MAPPERS = {
  rga: /\b(RGA|argile gonflante|retrait.gonflement|sécheresse argile)\b/i,
  fissuration: /\b(fissur\w*|lézard\w*|craquel\w*)\b/i,
  tassement: /\b(tassement|affaissement|enfoncement)\b/i,
  humidite: /\b(humidit\w*|remontée capillaire|infiltration)\b/i,
  condensation: /\b(condensation|buée|condense)\b/i,
  corrosion: /\b(corrosion|rouille|oxyd\w*)\b/i,
  ventilation: /\b(ventilation|VMC|aération|renouvellement air)\b/i,
  pont_thermique: /\b(pont thermique|discontinuité isolation)\b/i,
  mouvement_fondation: /\b(mouvement (de )?fondation|tassement|affaissement)\b/i,
  carbonatation: /\b(carbonatation)\b/i,
  surcharge: /\b(surcharge|charge excessive|surdimensionn\w*)\b/i,
  secheresse: /\b(sécheresse|canicule|déshydratation sol)\b/i,
  salpetre: /\b(salpêtre|efflorescence saline)\b/i,
  ipn: /\b(IPN|HEA|HEB|poutre métallique)\b/i,
};

function identifyConcept(phrase) {
  if (!phrase) return null;
  for (const [name, rx] of Object.entries(CONCEPT_MAPPERS)) {
    if (rx.test(phrase)) return name;
  }
  return null;
}

/**
 * Valide la causalité physique d'une réponse.
 * Détecte :
 *   - inversions causales (effet → cause au lieu de cause → effet)
 *   - échelles incompatibles
 *   - causalité absente dans le graphe (non plausible)
 */
export function validatePhysicalCausality(text) {
  if (!text || text.length < 50) {
    return { score: 1.0, violations: [], reason: 'insufficient_text' };
  }

  const violations = [];
  const valid_causalities = [];

  // Extract toutes assertions causales
  const assertions = [...text.matchAll(CAUSAL_ASSERTION_RX)];

  for (const m of assertions) {
    const causeRaw = m[1].trim();
    const effectRaw = (m[2] || '').trim();
    const causeConcept = identifyConcept(causeRaw);
    const effectConcept = identifyConcept(effectRaw);

    if (!causeConcept || !effectConcept) continue;
    if (causeConcept === effectConcept) continue;  // tautologie

    // Test 1 : direction causale plausible ?
    const validCauses = CAUSAL_GRAPH[effectConcept] || [];
    const inverseValidCauses = CAUSAL_GRAPH[causeConcept] || [];

    if (validCauses.includes(causeConcept)) {
      // Causalité correcte dans le sens prétendu
      valid_causalities.push({ cause: causeConcept, effect: effectConcept });
    } else if (inverseValidCauses.includes(effectConcept)) {
      // INVERSION détectée : le texte dit "A cause B" mais en réalité B cause A
      violations.push({
        type: 'causal_inversion',
        text: m[0],
        claim: `"${causeConcept}" → "${effectConcept}"`,
        correct: `"${effectConcept}" → "${causeConcept}"`,
        severity: 'high',
      });
    } else {
      // Test 2 : échelle incompatible ?
      const scaleViolation = SCALE_INCOMPATIBLE.find(
        s => s.micro === causeConcept && s.macro === effectConcept
      );
      if (scaleViolation) {
        violations.push({
          type: 'scale_incompatible',
          text: m[0],
          claim: `"${causeConcept}" → "${effectConcept}"`,
          reason: `échelle ${scaleViolation.micro} ne peut pas causer ${scaleViolation.macro}`,
          severity: 'high',
        });
      } else {
        // Causalité absente du graphe : douteuse mais pas catégoriquement fausse
        violations.push({
          type: 'unverified_causality',
          text: m[0],
          claim: `"${causeConcept}" → "${effectConcept}"`,
          reason: 'lien causal non répertorié dans le graphe physique',
          severity: 'low',
        });
      }
    }
  }

  // Score : 1.0 si aucune violation, baisse selon sévérité
  const highSeverity = violations.filter(v => v.severity === 'high').length;
  const lowSeverity = violations.filter(v => v.severity === 'low').length;
  const penalty = Math.min(1, highSeverity * 0.35 + lowSeverity * 0.10);
  const score = +Math.max(0, 1 - penalty).toFixed(3);

  return {
    score,
    violations,
    valid_causalities,
    n_assertions_analyzed: assertions.length,
    n_high_severity: highSeverity,
    n_low_severity: lowSeverity,
    verdict: highSeverity >= 1 ? 'PHYSICALLY_INCONSISTENT'
           : lowSeverity >= 3 ? 'WEAKLY_GROUNDED'
           : 'PHYSICALLY_PLAUSIBLE',
  };
}
