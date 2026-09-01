// Utilitaires de date pur (testables, sans effet de bord).

/** Identifiant unique simple (UUID v4 si dispo, fallback sinon). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Clé de jour locale "YYYY-MM-DD" pour une date donnée (défaut: maintenant). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Vrai si "HH:MM" valide (00:00 → 23:59). */
export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Convertit "HH:MM" en minutes depuis minuit. NaN si invalide. */
export function timeToMinutes(t: string): number {
  if (!isValidTime(t)) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Vrai si `time` ("HH:MM") est dans la plage autorisée [start, end].
 * Gère les plages qui traversent minuit (ex. 22:00 → 06:00).
 */
export function isWithinAllowedHours(time: string, start: string, end: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (Number.isNaN(t) || Number.isNaN(s) || Number.isNaN(e)) return false;
  if (s <= e) return t >= s && t <= e;
  // plage traversant minuit
  return t >= s || t <= e;
}

export type Period = 'day' | 'week' | 'month';

/**
 * Renvoie la clé de jour de début (incluse) d'une période se terminant
 * aujourd'hui (ref). Utilisé pour filtrer l'historique.
 */
export function periodStartKey(period: Period, ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (period === 'day') return dayKey(d);
  if (period === 'week') {
    d.setDate(d.getDate() - 6); // 7 jours glissants, aujourd'hui inclus
    return dayKey(d);
  }
  d.setDate(d.getDate() - 29); // 30 jours glissants
  return dayKey(d);
}

/** Formatte "HH:MM" pour affichage (renvoie '—' si absent/invalide). */
export function displayTime(t?: string): string {
  return t && isValidTime(t) ? t : '—';
}
