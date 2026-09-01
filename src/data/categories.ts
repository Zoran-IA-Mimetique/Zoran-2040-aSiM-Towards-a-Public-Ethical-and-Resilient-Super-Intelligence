import type { Category } from '../types';

/** Métadonnées d'affichage par catégorie (couleur + emoji). */
export const CATEGORY_META: Record<Category, { color: string; emoji: string }> = {
  Focus: { color: '#6366f1', emoji: '🎯' },
  Énergie: { color: '#f59e0b', emoji: '⚡' },
  Calme: { color: '#10b981', emoji: '🧘' },
  Créativité: { color: '#ec4899', emoji: '🎨' },
  Sommeil: { color: '#8b5cf6', emoji: '🌙' },
  Apprentissage: { color: '#0ea5e9', emoji: '📚' },
};
