// ZORAN_CTA_CLICKABLE_RUNTIME_V13 — Métriques UX d'usage CTA.
//
// Trace localement (sessionStorage, pas de réseau) :
//   - open_rate : nombre d'ouvertures par type de CTA
//   - dwell_time : durée moyenne d'ouverture avant fermeture
//   - close_rate : ratio fermeture sans "Poser cette question"
//   - false_click : ouvertures < 800ms = probable mauvais clic
//   - by_type : décomposition par type
//
// API : trackOpen(cta) → handle ; handle.close({ asked: boolean })
// Lecture : getMetrics() retourne snapshot pour debug/console.

const STORAGE_KEY = 'zoran_cta_metrics_v13';
const FAST_CLOSE_MS = 800;

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? { ...defaultState(), ...parsed } : defaultState();
  } catch (e) {
    return defaultState();
  }
}

function defaultState() {
  return {
    opens: 0,
    closes_no_ask: 0,
    closes_asked: 0,
    fast_closes: 0,
    total_dwell_ms: 0,
    by_type: {},
  };
}

function save(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* sessionStorage indisponible (SSR, mode strict) — silent */
  }
}

function bumpType(state, type, field, delta = 1) {
  if (!state.by_type[type]) {
    state.by_type[type] = { opens: 0, asked: 0, dwell_ms: 0 };
  }
  state.by_type[type][field] = (state.by_type[type][field] || 0) + delta;
}

export function trackOpen(cta) {
  const type = (cta && cta.type) || 'unknown';
  const startedAt = Date.now();
  const state = load();
  state.opens++;
  bumpType(state, type, 'opens', 1);
  save(state);

  return {
    close({ asked }) {
      const dwell = Date.now() - startedAt;
      const s = load();
      s.total_dwell_ms += dwell;
      bumpType(s, type, 'dwell_ms', dwell);
      if (asked) {
        s.closes_asked++;
        bumpType(s, type, 'asked', 1);
      } else {
        s.closes_no_ask++;
      }
      if (dwell < FAST_CLOSE_MS) s.fast_closes++;
      save(s);
    },
  };
}

export function getMetrics() {
  const s = load();
  const avg_dwell = s.opens > 0 ? Math.round(s.total_dwell_ms / s.opens) : 0;
  const ask_rate = s.opens > 0 ? +(s.closes_asked / s.opens).toFixed(3) : 0;
  const fast_close_rate = s.opens > 0 ? +(s.fast_closes / s.opens).toFixed(3) : 0;
  return {
    ...s,
    avg_dwell_ms: avg_dwell,
    ask_rate,
    fast_close_rate,
  };
}

export function resetMetrics() {
  save(defaultState());
}

// Expose en debug global (console : window.ctaMetrics())
if (typeof window !== 'undefined') {
  window.ctaMetrics = getMetrics;
}
