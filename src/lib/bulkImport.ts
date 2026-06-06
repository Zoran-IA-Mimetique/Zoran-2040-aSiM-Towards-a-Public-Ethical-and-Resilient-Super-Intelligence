import type { Category, Routine } from '../types';
import { uid } from './dates';

/**
 * Parse un import par lot : une ligne = une routine (le titre).
 * - ignore les lignes vides et les espaces superflus
 * - déduplique les titres identiques (insensible à la casse)
 * Entrée : texte brut collé. Sortie : routines prêtes à persister.
 */
export function parseBulkImport(
  raw: string,
  defaults: { category: Category; suggestedTime?: string } = { category: 'Focus' },
): Routine[] {
  const seen = new Set<string>();
  const now = Date.now();
  const routines: Routine[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const title = line.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    routines.push({
      id: uid(),
      title,
      description: '',
      category: defaults.category,
      suggestedTime: defaults.suggestedTime,
      customTime: undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  return routines;
}
