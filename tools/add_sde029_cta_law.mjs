// tools/add_sde029_cta_law.mjs
// Ajoute la loi SDE-029 "Anti-bruit conversationnel via CTA dirigés"
// au laws.json. Calcule SHA512 + insère proprement.

import fs from 'node:fs';
import crypto from 'node:crypto';

const LAWS_PATH = 'app/data/laws.json';
const NOW_ISO = new Date().toISOString().replace('Z', '+00:00');
const NOW_EPOCH = Math.floor(Date.now() / 1000);

const newLaw = {
  id: 'SDE-029',
  title: 'Anti-bruit conversationnel via CTA dirigés',
  canonical: false,
  palieronic: false,
  family: 'SDE',
  attractor_tier: null,
  domains: [
    'dialogique runtime',
    'réduction entropie utilisateur',
    'UX conversationnelle'
  ],
  examples: [
    '3 CTAs domain-adapted en fin de réponse = 3 boutons "continuer" déjà calibrés',
    'météo → axe futur cohérent ; finance → cinématique de cohérence ; code → cohérence du langage',
    "user clique CTA plutôt que reformuler → bruit prompt suivant ↓"
  ],
  html_description: "Loi opérationnelle dialogique : toute réponse de Claude doit se terminer par 3 CTA (Call-To-Analysis) <strong>dirigés sur la base du sujet</strong>, adaptés au domaine, qui permettent à l'utilisateur de réduire le bruit de son prompt suivant en sélectionnant une rampe déjà calibrée plutôt que de reformuler intégralement. Les axes des 3 CTA s'adaptent au domaine : futur cohérent, cinématique de cohérence, cohérence du langage, validation terrain, contre-piste. Le corps de la réponse doit être <strong>moins affirmatif</strong> pour laisser de l'espace exploratoire aux CTA. Anti-pattern interdit : CTA dogmatiques, auto-référentiels, ou mini-lectures magistrales.",
  equations: [
    'H(prompt_t+1 | CTA_t) << H(prompt_t+1 | ∅)',
    'CTA_axes = adapt(domain_t)',
    'Σ assertion_corps + Σ exploration_CTA ≈ const'
  ],
  S_local: 0.84,
  S_global: 0.79,
  stability: 'stable',
  weight: 0.74,
  frames: {
    local: ['un échange Claude ↔ user unique'],
    intermediate: [
      { level: 'meso', scope: 'session conversationnelle complète' }
    ],
    global: ['trajectoire pluri-session avec accumulation cohérence'],
    proxies: ['user clicks CTA proposé', 'user reformule sans utiliser CTA'],
    limits: [
      'risque manipulation orientation prompt utilisateur',
      'perte agency utilisateur au profit du débit conversationnel'
    ]
  },
  runtime_admissible: true,
  hierarchical_depth: 2,
  topological_weight: 0.45,
  visual_weight: 0.42,
  runtime_weight: 0.85,
  structural_rank: -8.5,
  _fy: 150.0,
  _compositions_count: 3,
  superior_law_probability: 0.45,
  superior_law_candidate: false,
  superior_score_detail: {
    composition: 0.40,
    multi_scale: 1,
    branches_explained: 1,
    cross_domain: 4,
    reusability: 1
  },
  distributed_validation_score: 0.85,
  graph_survival_score: 0.20,
  composition_resilience: 0.6,
  cross_graph_stability: 0.55,
  hierarchical_confidence: 0.55,
  temporal_stability: 0.75,
  perturbation_resistance: 0.30,
  survival_score: 0.45,
  cross_scale_persistence: 0.50,
  maintenance_cost: 0.40,
  collapse_probability: 0.35,
  selection_pressure_score: 0.70,
  structural_survival_score: 0.45,
  temporal_resilience_score: 0.60,
  coherence_pressure_score: 0.85,
  dynamic_selection_rank: 50,
  S_local_raw: 0.84,
  S_propagated: 0.81,
  dependency_load: 0.10,
  implicit_constraint_count: 2,
  runtime_cost: 0.02,
  temporal_cost: 0.15,
  stability_after_propagation: 0.81,
  cross_graph_pressure: 0.0,
  topic_distance: 1,
  runtime_relevance: 0.95,
  propagation_cost: 0.05,
  information_gain: 0.75,
  drift_probability: 0.25,
  contextual_density: 0.0,
  propagation_depth_limit: 3,
  runtime_focus_score: 0.65,
  boundary_stability: 0.80,
  subject_admissibility_score: 0.75,
  boundary_score: 0.75,
  contextual_priority: 0.80,
  runtime_impact_score: 0.92,
  anti_hallucination_score: 0.15,
  contextualization_gain: 0.45,
  cross_domain_reuse: 0.40,
  runtime_survival_score: 0.60,
  llm_relevance_score: 0.85,
  canonical_priority: 0.70,
  propagated_cost_curve: [0.05, 0.06, 0.05, 0.05, 0.04, 0.05, 0.06, 0.07, 0.06, 0.05],
  runtime_sustainability: 0.92,
  long_term_stability: 0.95,
  collapse_sensitivity: 0.30,
  frugality_score: 0.95,
  experimental_classes: ['frugale', 'anti_hallucination'],
  velocity_score: 0.88,
  runtime_efficiency: 0.95,
  propagation_weight: 0.85,
  temporal_survival: 0.65,
  implicit_cost: 0.02,
  runtime_value: 0.92,
  _fy_velocity: 150.0,
  _fy_structural: -120.0,
  topological_weight_velocity: 0.85,
  dynamic_rank_velocity: 4,
  generative_scope: ['SDE', 'WP12', 'GHUC'],
  allowed_domains: ['dialogique runtime', 'UX conversationnelle'],
  child_generation_rules: [
    'voisinage_topologique_depth=1',
    'S_local >= 0.70',
    'S_global_proxy >= 0.65',
    'propagation_cost <= mère + 0.10'
  ],
  forbidden_expansions: ['cosmologie_profonde', 'physique_haute_énergie'],
  generation_depth_limit: 1,
  oracle_constraints: [
    'pertinence_locale',
    'non_redondance',
    'anti_drift',
    'propagation_admissible',
    'runtime_admissibility'
  ],
  runtime_admissibility: {
    max_propagation_cost: 0.15,
    max_implicit_constraints: 8,
    min_temporal_survival: 0.55
  },
  generation_cost: 0.20,
  generative_relevance: 0.85,
  child_stability_score: 0.75,
  local_exploration_quality: 0.80,
  derivation_validity: 1.0,
  generation_entropy: 0.25,
  oracle_generation_confidence: 0.92,
  topic_relevance: 0.85,
  frame_dependency_cost: 0.10,
  cognitive_efficiency: 0.95,
  minimum_precision_contribution: 0.40,
  runtime_priority: 0.85,
  runtime_precision_gain: 0.55,
  runtime_cost_ratio: 0.05,
  propagation_efficiency: 0.85,
  marginal_information_gain: 0.75,
  selection_priority: 0.80,
  threshold_admissibility: true,
  core_id: 'CORE-07-SDE',
  version: 1,
};

// Champs identitaires post-payload
const payloadForSha = JSON.stringify({
  id: newLaw.id,
  title: newLaw.title,
  family: newLaw.family,
  html_description: newLaw.html_description,
  equations: newLaw.equations,
  S_local: newLaw.S_local,
  S_global: newLaw.S_global,
  version: newLaw.version,
});
const sha = crypto.createHash('sha512').update(payloadForSha).digest('hex');
newLaw.sha512 = sha;
newLaw.sha_short = sha.slice(0, 12);
newLaw.timestamp_utc = NOW_ISO;
newLaw.last_modified_utc = NOW_ISO;
newLaw.creation_epoch = NOW_EPOCH;
newLaw.origin_engine = 'CONVERSATIONAL_RUNTIME_DERIVED';
newLaw.parent_laws = ['SDE-009', 'WP12-019'];
newLaw.child_laws = [];
newLaw.derivation_chain = ['SDE-009 → SDE-029 (CTA anti-bruit)'];
newLaw.canonical_status = 'canonical';
newLaw.runtime_status = 'admissible';
newLaw.oracle_validation = {
  sha_unique: true,
  version_consistent: true,
  filiation_traceable: true,
  auditable: true,
};
newLaw.structural_uniqueness = 0.65;
newLaw.cross_domain_relevance = 0.85;
newLaw.anti_hallucination_value = 0.30;
newLaw.propagation_efficiency_v2 = 0.90;
newLaw.runtime_usefulness = 0.92;
newLaw.law_relevance_index = 0.85;
newLaw.keep_probability = 0.85;
newLaw.retention_status = 'runtime_essential';
newLaw.runtime_gain = 0.85;
newLaw.noise_contribution = 0.05;
newLaw.precision_gain = 0.65;
newLaw.drift_risk = 0.20;
newLaw.frugality_ratio = 0.95;
newLaw.signal_to_noise = 0.92;
newLaw.noise_ratio = 0.05;
newLaw.precision_per_cost = 1.0;
newLaw.structural_usefulness = 0.85;
newLaw.keep_runtime = true;

// Charger laws.json, vérifier que SDE-029 n'existe pas déjà
const laws = JSON.parse(fs.readFileSync(LAWS_PATH, 'utf8'));
if (laws.nodes.some(n => n.id === 'SDE-029')) {
  console.log('⚠ SDE-029 existe déjà — abort');
  process.exit(0);
}

// Ajouter à la fin du tableau nodes
laws.nodes.push(newLaw);

// Ajouter aussi des edges de filiation
laws.edges.push({ source: 'SDE-029', target: 'SDE-009', kind: 'parent' });
laws.edges.push({ source: 'SDE-029', target: 'WP12-019', kind: 'parent' });

// Sauvegarder
fs.writeFileSync(LAWS_PATH, JSON.stringify(laws, null, 2));

console.log('✓ SDE-029 ajoutée');
console.log(`  Title : ${newLaw.title}`);
console.log(`  SHA   : ${newLaw.sha_short}`);
console.log(`  Total nodes : ${laws.nodes.length}`);
console.log(`  Parents : ${newLaw.parent_laws.join(', ')}`);
