// app/src/failures_memory.js
// Mission ZORAN_SUPERIORITY_CONVERGENCE_20260516
//
// FAILURES_MEMORY — persiste les défaites par domaine × route × cause.
// Une route qui échoue plusieurs fois sur un domaine est DOWNGRADÉE
// automatiquement dans les benchmarks suivants.
//
// Stockage : localStorage zoran.failures.memory (JSON)
// Structure : { [domain]: { [route]: { wins, losses, causes: {...} } } }

const STORAGE_KEY = 'zoran.failures.memory';
const DOWNGRADE_THRESHOLD = 3; // 3 défaites consécutives sur un domaine → downgrade
// V2 (mission SUPERIORITY_CONVERGENCE_V2) : décroissance temporelle anti-fossilisation
const DECAY_LAMBDA = 0.05; // failure_weight *= exp(-0.05 * age_days)
const MAX_PENALTY = 0.40;  // cap pénalité — protection anti-overfit
const REVALIDATION_DAYS = 7; // après 7j sans run, force revalidation

// Types de défaite (distinction V2)
export const FAILURE_TYPES = {
  domain: 'route hors-domaine',
  style: 'mauvais style cognitif',
  hallucination: 'invention factuelle',
  hors_sujet: 'dérive sujet',
  bruit: 'verbosité méta',
  utility: 'pas actionnable',
};

export function loadMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

export function saveMemory(mem) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch (_) {}
}

/**
 * Enregistre le résultat d'un match : domaine × route × winner-ou-pas + causes.
 */
export function recordOutcome({ domain, route, won, causes = [], failure_type = null }) {
  if (!domain || !route) return;
  const mem = loadMemory();
  if (!mem[domain]) mem[domain] = {};
  if (!mem[domain][route]) mem[domain][route] = {
    wins: 0, losses: 0, causes: {}, recent_losses: 0,
    causes_by_type: {}, last_loss_ts: 0, last_win_ts: 0,
  };
  const now = Date.now();
  if (won) {
    mem[domain][route].wins += 1;
    mem[domain][route].recent_losses = 0;
    mem[domain][route].last_win_ts = now;
  } else {
    mem[domain][route].losses += 1;
    mem[domain][route].recent_losses += 1;
    mem[domain][route].last_loss_ts = now;
    for (const c of causes) {
      mem[domain][route].causes[c] = (mem[domain][route].causes[c] || 0) + 1;
    }
    // V2 : breakdown par type (domain/style/hallucination/hors_sujet/bruit/utility)
    if (failure_type && FAILURE_TYPES[failure_type]) {
      mem[domain][route].causes_by_type[failure_type] =
        (mem[domain][route].causes_by_type[failure_type] || 0) + 1;
    }
  }
  saveMemory(mem);
  return mem;
}

/**
 * V2 : pénalité avec DÉCROISSANCE TEMPORELLE (anti-fossilisation).
 * failure_weight *= exp(-DECAY_LAMBDA * age_days)
 * Une route downgradée peut REDEVENIR FORTE si elle ne re-échoue pas.
 * Cap MAX_PENALTY = 0.40 (anti-overfit : jamais définitivement pénalisée).
 */
export function getDowngradePenalty(domain, route) {
  const mem = loadMemory();
  const entry = mem?.[domain]?.[route];
  if (!entry) return 0;
  const recent = entry.recent_losses || 0;
  if (recent < 1) return 0;
  // Calcul âge en jours depuis dernière défaite
  const lastLossTs = entry.last_loss_ts || Date.now();
  const ageDays = (Date.now() - lastLossTs) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-DECAY_LAMBDA * ageDays);
  const raw = (recent / DOWNGRADE_THRESHOLD) * MAX_PENALTY * decayFactor;
  return Math.min(MAX_PENALTY, raw);
}

/**
 * V2 : revalidation périodique — efface recent_losses si la route n'a
 * pas été retestée depuis REVALIDATION_DAYS. Permet exploration.
 */
export function revalidateIfStale(domain, route) {
  const mem = loadMemory();
  const entry = mem?.[domain]?.[route];
  if (!entry) return false;
  const lastTs = entry.last_loss_ts || 0;
  const ageDays = (Date.now() - lastTs) / (1000 * 60 * 60 * 24);
  if (ageDays > REVALIDATION_DAYS && entry.recent_losses > 0) {
    entry.recent_losses = 0;
    saveMemory(mem);
    return true;
  }
  return false;
}

/**
 * Distinction par type de défaite (V2 mission).
 */
export function getFailureTypeBreakdown(domain, route) {
  const mem = loadMemory();
  const entry = mem?.[domain]?.[route];
  if (!entry) return {};
  return entry.causes_by_type || {};
}

/**
 * Liste les routes downgradées pour un domaine donné.
 */
export function getDowngradedRoutes(domain) {
  const mem = loadMemory();
  const dom = mem[domain] || {};
  return Object.entries(dom)
    .filter(([_, e]) => (e.recent_losses || 0) >= DOWNGRADE_THRESHOLD)
    .map(([route, e]) => ({
      route,
      recent_losses: e.recent_losses,
      total_losses: e.losses,
      top_cause: Object.entries(e.causes || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    }));
}

/**
 * Stats globales par route — pour rapport.
 */
export function globalStats() {
  const mem = loadMemory();
  const stats = {};
  for (const [domain, routes] of Object.entries(mem)) {
    for (const [route, e] of Object.entries(routes)) {
      if (!stats[route]) stats[route] = { wins: 0, losses: 0, domains_active: 0, top_causes: {} };
      stats[route].wins += e.wins || 0;
      stats[route].losses += e.losses || 0;
      stats[route].domains_active += 1;
      for (const [c, n] of Object.entries(e.causes || {})) {
        stats[route].top_causes[c] = (stats[route].top_causes[c] || 0) + n;
      }
    }
  }
  return stats;
}

/**
 * Reset complet de la mémoire (debug / nouveau cycle).
 */
export function resetMemory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
