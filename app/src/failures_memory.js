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
export function recordOutcome({ domain, route, won, causes = [] }) {
  if (!domain || !route) return;
  const mem = loadMemory();
  if (!mem[domain]) mem[domain] = {};
  if (!mem[domain][route]) mem[domain][route] = { wins: 0, losses: 0, causes: {}, recent_losses: 0 };
  if (won) {
    mem[domain][route].wins += 1;
    mem[domain][route].recent_losses = 0; // reset compteur consécutif
  } else {
    mem[domain][route].losses += 1;
    mem[domain][route].recent_losses += 1;
    for (const c of causes) {
      mem[domain][route].causes[c] = (mem[domain][route].causes[c] || 0) + 1;
    }
  }
  saveMemory(mem);
  return mem;
}

/**
 * Renvoie une pénalité [0..1] à appliquer au domain_fitness d'une route
 * sur un domaine. Plus la route a perdu consécutivement, plus la pénalité est haute.
 * Atteint DOWNGRADE_THRESHOLD défaites consécutives → pénalité 0.50 (skip probable).
 */
export function getDowngradePenalty(domain, route) {
  const mem = loadMemory();
  const entry = mem?.[domain]?.[route];
  if (!entry) return 0;
  const recent = entry.recent_losses || 0;
  if (recent < 1) return 0;
  return Math.min(0.50, (recent / DOWNGRADE_THRESHOLD) * 0.50);
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
