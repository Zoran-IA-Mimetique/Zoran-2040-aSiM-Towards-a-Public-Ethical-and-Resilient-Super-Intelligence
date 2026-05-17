// app/src/user_profile.js
// Mission ZORAN_ADAPTIVE_TRANSPARENCY_20260517
//
// "La qualité d'une IA dépend du profil cognitif de l'utilisateur."
//
// 4 profils marchés identifiés :
//   - expert_ai : connaît IA, veut vitesse + densité + minimalité
//   - expert_novice_ai : compétent métier, novice IA → transparence + auto-doute visible
//     (LE MARCHÉ MASSIF 2026-2030)
//   - critical_decision : tribunal/expertise → audit complet déployable
//   - researcher : profondeur maximale + graphe lois + tous CTA

const STORAGE_KEY = 'zoran.user_profile';

export const PROFILES = {
  expert_ai: {
    id: 'expert_ai',
    label: 'Expert IA',
    icon: '⚡',
    description: 'Vitesse + densité minimale. Pas de pédagogie. Juste la réponse.',
    config: {
      // Comportement LLM
      response_mode: 'minimal',          // forcer MINIMAL_RESPONSE_MODE même si question complexe
      max_inline_ctas: 0,                // pas de CTAs inline dans le corps
      max_terminal_ctas: 0,              // pas de bloc CTA terminal
      show_self_doubt: false,            // pas d'explicitation des hésitations
      // Affichage UI
      open_sections: ['responses'],      // seulement le texte
      ranking_weights: { parsimony: 0.70, grade: 0.30 },
      show_metrics_panel: false,         // panneaux métriques cachés par défaut
      show_law_used: false,              // pas affichage lois ZORAN
    },
  },

  expert_novice_ai: {
    id: 'expert_novice_ai',
    label: 'Expert métier · novice IA',
    icon: '🎓',
    description: 'Compétent technique mais débutant IA. Veut voir le raisonnement, les hésitations, la traçabilité.',
    config: {
      response_mode: 'transparent',
      max_inline_ctas: 3,
      max_terminal_ctas: 3,
      show_self_doubt: true,             // l'IA EXPRIME ses doutes ouvertement
      open_sections: ['responses', 'parsimony', 'systemic'],
      ranking_weights: { parsimony: 0.30, transparency: 0.50, grade: 0.20 },
      show_metrics_panel: true,
      show_law_used: true,
    },
  },

  critical_decision: {
    id: 'critical_decision',
    label: 'Décision critique',
    icon: '⚖',
    description: 'Tribunal, expertise judiciaire, audit. Tout doit être déployable et opposable.',
    config: {
      response_mode: 'audit_full',
      max_inline_ctas: 5,
      max_terminal_ctas: 3,
      show_self_doubt: true,
      open_sections: ['responses', 'parsimony', 'systemic', 'fragility', 'concrete', 'argumented'],
      ranking_weights: { parsimony: 0.15, transparency: 0.30, grade: 0.30, audit: 0.25 },
      show_metrics_panel: true,
      show_law_used: true,
    },
  },

  researcher: {
    id: 'researcher',
    label: 'Chercheur',
    icon: '🔬',
    description: 'Profondeur maximale, tous les CTA, graphe des lois, exploration libre.',
    config: {
      response_mode: 'verbose',
      max_inline_ctas: 6,
      max_terminal_ctas: 3,
      show_self_doubt: true,
      open_sections: ['responses', 'parsimony', 'systemic', 'fragility', 'concrete', 'argumented', 'reforms'],
      ranking_weights: { parsimony: 0.15, transparency: 0.35, grade: 0.30, divergence: 0.20 },
      show_metrics_panel: true,
      show_law_used: true,
    },
  },
};

// Profil par défaut : EXPERT MÉTIER NOVICE IA (marché massif identifié)
const DEFAULT_PROFILE = 'expert_novice_ai';

export function getProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PROFILES[stored]) return PROFILES[stored];
  } catch (_) {}
  return PROFILES[DEFAULT_PROFILE];
}

export function setProfile(profileId) {
  if (!PROFILES[profileId]) return false;
  try {
    localStorage.setItem(STORAGE_KEY, profileId);
    // Notifier l'app pour re-render (custom event)
    window.dispatchEvent(new CustomEvent('zoran:profile-changed', { detail: { profileId } }));
    return true;
  } catch (_) { return false; }
}

export function getProfileConfig() {
  return getProfile().config;
}

// Helper : construire l'UI selector
export function renderProfileSelector(currentId) {
  const current = currentId || getProfile().id;
  return `<select id="zoran-profile-select" class="zoran-profile-select" title="Profil utilisateur — adapte transparence + détail">
    ${Object.values(PROFILES).map(p => `
      <option value="${p.id}" ${p.id === current ? 'selected' : ''} title="${p.description}">
        ${p.icon} ${p.label}
      </option>
    `).join('')}
  </select>`;
}
