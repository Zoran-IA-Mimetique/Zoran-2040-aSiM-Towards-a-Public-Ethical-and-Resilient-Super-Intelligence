import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  type ActionLog,
  type ActionStatus,
  type BackupData,
  type Category,
  type Routine,
  type Settings,
} from '../types';
import { isValidTime } from './dates';

// REGLE 9 — SECURITE : toute donnée importée (JSON) est validée avant usage.
// On ne fait jamais confiance au contenu d'un fichier externe.

const VALID_STATUS: ActionStatus[] = ['pending', 'done', 'snoozed', 'ignored'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isCategory(v: unknown): v is Category {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

function sanitizeRoutine(v: unknown): Routine | null {
  if (!isObject(v)) return null;
  if (typeof v.id !== 'string' || typeof v.title !== 'string') return null;
  if (!v.title.trim()) return null;
  const now = Date.now();
  return {
    id: v.id,
    title: String(v.title).slice(0, 200),
    description: typeof v.description === 'string' ? v.description.slice(0, 2000) : '',
    category: isCategory(v.category) ? v.category : 'Focus',
    suggestedTime:
      typeof v.suggestedTime === 'string' && isValidTime(v.suggestedTime)
        ? v.suggestedTime
        : undefined,
    customTime:
      typeof v.customTime === 'string' && isValidTime(v.customTime) ? v.customTime : undefined,
    active: typeof v.active === 'boolean' ? v.active : true,
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : now,
  };
}

function sanitizeLog(v: unknown): ActionLog | null {
  if (!isObject(v)) return null;
  if (typeof v.id !== 'string' || typeof v.routineId !== 'string') return null;
  if (typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null;
  const status = VALID_STATUS.includes(v.status as ActionStatus)
    ? (v.status as ActionStatus)
    : 'pending';
  return {
    id: v.id,
    routineId: v.routineId,
    date: v.date,
    status,
    scheduledTime:
      typeof v.scheduledTime === 'string' && isValidTime(v.scheduledTime)
        ? v.scheduledTime
        : undefined,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now(),
  };
}

function sanitizeSettings(v: unknown): Settings {
  if (!isObject(v)) return { ...DEFAULT_SETTINGS };
  const max = Number(v.maxActiveNotifications);
  return {
    maxActiveNotifications:
      Number.isFinite(max) && max >= 0 && max <= 50
        ? Math.floor(max)
        : DEFAULT_SETTINGS.maxActiveNotifications,
    allowedStart:
      typeof v.allowedStart === 'string' && isValidTime(v.allowedStart)
        ? v.allowedStart
        : DEFAULT_SETTINGS.allowedStart,
    allowedEnd:
      typeof v.allowedEnd === 'string' && isValidTime(v.allowedEnd)
        ? v.allowedEnd
        : DEFAULT_SETTINGS.allowedEnd,
    theme:
      v.theme === 'light' || v.theme === 'dark' || v.theme === 'system'
        ? v.theme
        : DEFAULT_SETTINGS.theme,
  };
}

/** Construit l'objet d'export à partir de l'état courant. */
export function buildBackup(
  routines: Routine[],
  logs: ActionLog[],
  settings: Settings,
): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    logs,
    settings,
  };
}

/** Sérialise un backup en JSON indenté. */
export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2);
}

export interface ParsedBackup {
  ok: boolean;
  error?: string;
  data?: BackupData;
  /** Compteurs d'éléments rejetés pour observabilité. */
  dropped: { routines: number; logs: number };
}

/**
 * Parse et valide un backup JSON importé.
 * Ne lève jamais : renvoie {ok:false, error} en cas d'échec.
 */
export function parseBackup(raw: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: 'JSON invalide', dropped: { routines: 0, logs: 0 } };
  }
  if (!isObject(parsed)) {
    return { ok: false, error: 'Format racine invalide', dropped: { routines: 0, logs: 0 } };
  }

  const rawRoutines = Array.isArray(parsed.routines) ? parsed.routines : [];
  const rawLogs = Array.isArray(parsed.logs) ? parsed.logs : [];

  const routines: Routine[] = [];
  let droppedRoutines = 0;
  for (const r of rawRoutines) {
    const s = sanitizeRoutine(r);
    if (s) routines.push(s);
    else droppedRoutines++;
  }

  const validIds = new Set(routines.map((r) => r.id));
  const logs: ActionLog[] = [];
  let droppedLogs = 0;
  for (const l of rawLogs) {
    const s = sanitizeLog(l);
    // on rejette aussi les logs orphelins (routine inexistante)
    if (s && validIds.has(s.routineId)) logs.push(s);
    else droppedLogs++;
  }

  return {
    ok: true,
    data: {
      version: 1,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      routines,
      logs,
      settings: sanitizeSettings(parsed.settings),
    },
    dropped: { routines: droppedRoutines, logs: droppedLogs },
  };
}
