// Domaine métier de Routine Cognitive.
// Toutes les données sont locales (IndexedDB). Aucun backend, aucune auth.

/** Catégories cognitives supportées (REGLE 11 — documentées, fermées). */
export const CATEGORIES = [
  'Focus',
  'Énergie',
  'Calme',
  'Créativité',
  'Sommeil',
  'Apprentissage',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Une routine = une micro-action récurrente.
 * - suggestedTime : heure suggérée par défaut (préchargée), format "HH:MM".
 * - customTime    : heure personnalisée par l'utilisateur, prioritaire si présente.
 * - active        : true = active, false = en pause (n'est plus planifiée/notifiée).
 */
export interface Routine {
  id: string;
  title: string;
  description: string;
  category: Category;
  suggestedTime?: string;
  customTime?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** État d'une action pour une journée donnée. */
export type ActionStatus = 'pending' | 'done' | 'snoozed' | 'ignored';

/**
 * Journal d'exécution : une entrée par (routine, jour).
 * `date` au format ISO "YYYY-MM-DD" (jour local).
 */
export interface ActionLog {
  id: string;
  routineId: string;
  date: string;
  status: ActionStatus;
  scheduledTime?: string;
  updatedAt: number;
}

export interface Settings {
  /** Nombre maximal de notifications actives simultanées. */
  maxActiveNotifications: number;
  /** Plage horaire autorisée pour les notifications (format "HH:MM"). */
  allowedStart: string;
  allowedEnd: string;
  /** Thème de l'interface. */
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: Settings = {
  maxActiveNotifications: 3,
  allowedStart: '08:00',
  allowedEnd: '22:00',
  theme: 'system',
};

/** Forme du fichier d'export/import JSON (REGLE 11 — contrat documenté). */
export interface BackupData {
  version: 1;
  exportedAt: string;
  routines: Routine[];
  logs: ActionLog[];
  settings: Settings;
}
