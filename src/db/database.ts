import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SETTINGS,
  type ActionLog,
  type ActionStatus,
  type BackupData,
  type Routine,
  type Settings,
} from '../types';
import { dayKey, uid } from '../lib/dates';
import { logger } from '../lib/logger';
import { PRELOADED_ROUTINES } from '../data/preloaded';

const DB_NAME = 'routine-cognitive';
const DB_VERSION = 1;
const SCOPE = 'db';

interface RoutineDB extends DBSchema {
  routines: {
    key: string;
    value: Routine;
    indexes: { 'by-active': 'true' | 'false' };
  };
  logs: {
    key: string;
    value: ActionLog;
    indexes: { 'by-date': string; 'by-routine': string };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<RoutineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RoutineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RoutineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        logger.info(SCOPE, 'Création/upgrade du schéma IndexedDB', { version: DB_VERSION });
        if (!db.objectStoreNames.contains('routines')) {
          db.createObjectStore('routines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('logs')) {
          const logs = db.createObjectStore('logs', { keyPath: 'id' });
          logs.createIndex('by-date', 'date');
          logs.createIndex('by-routine', 'routineId');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
      blocked() {
        logger.warn(SCOPE, 'Ouverture IndexedDB bloquée par un autre onglet');
      },
    });
  }
  return dbPromise;
}

/** Réinitialise la connexion (utilisé par les tests). */
export function _resetDbForTests(): void {
  dbPromise = null;
}

// --- Routines ---------------------------------------------------------------

export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDB();
  const all = await db.getAll('routines');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putRoutine(routine: Routine): Promise<void> {
  const db = await getDB();
  await db.put('routines', { ...routine, updatedAt: Date.now() });
  logger.info(SCOPE, 'Routine enregistrée', { id: routine.id, title: routine.title });
}

export async function putRoutines(routines: Routine[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('routines', 'readwrite');
  await Promise.all(routines.map((r) => tx.store.put(r)));
  await tx.done;
  logger.info(SCOPE, 'Routines enregistrées en lot', { count: routines.length });
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['routines', 'logs'], 'readwrite');
  await tx.objectStore('routines').delete(id);
  // REGLE 12 — pas de logs orphelins : on nettoie les journaux liés.
  const idx = tx.objectStore('logs').index('by-routine');
  let cursor = await idx.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
  logger.info(SCOPE, 'Routine supprimée (+ logs liés)', { id });
}

// --- Logs -------------------------------------------------------------------

export async function getLogsByDate(date: string): Promise<ActionLog[]> {
  const db = await getDB();
  return db.getAllFromIndex('logs', 'by-date', date);
}

export async function getLogsInRange(startKey: string): Promise<ActionLog[]> {
  const db = await getDB();
  const range = IDBKeyRange.lowerBound(startKey);
  return db.getAllFromIndex('logs', 'by-date', range);
}

export async function getAllLogs(): Promise<ActionLog[]> {
  const db = await getDB();
  return db.getAll('logs');
}

/**
 * Définit le statut d'une action pour (routine, jour).
 * Crée le log s'il n'existe pas, le met à jour sinon (idempotent par jour).
 */
export async function setActionStatus(
  routineId: string,
  status: ActionStatus,
  opts: { date?: string; scheduledTime?: string } = {},
): Promise<ActionLog> {
  const db = await getDB();
  const date = opts.date ?? dayKey();
  const existing = (await db.getAllFromIndex('logs', 'by-routine', routineId)).find(
    (l) => l.date === date,
  );
  const log: ActionLog = existing
    ? { ...existing, status, updatedAt: Date.now() }
    : {
        id: uid(),
        routineId,
        date,
        status,
        scheduledTime: opts.scheduledTime,
        updatedAt: Date.now(),
      };
  await db.put('logs', log);
  logger.info(SCOPE, 'Statut action mis à jour', { routineId, date, status });
  return log;
}

// --- Settings ---------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = (await db.get('meta', 'settings')) as Settings | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('meta', settings, 'settings');
  logger.info(SCOPE, 'Paramètres enregistrés', settings);
}

// --- Seed / Backup ----------------------------------------------------------

/**
 * Précharge les routines au premier lancement uniquement.
 * Idempotent : marque l'opération dans `meta` pour ne pas re-seed.
 */
export async function seedIfFirstRun(): Promise<boolean> {
  const db = await getDB();
  const seeded = await db.get('meta', 'seeded');
  if (seeded) return false;

  const now = Date.now();
  const routines: Routine[] = PRELOADED_ROUTINES.map((p, i) => ({
    id: uid(),
    title: p.title,
    description: p.description,
    category: p.category,
    suggestedTime: p.suggestedTime,
    customTime: undefined,
    active: true,
    createdAt: now + i, // préserve l'ordre du catalogue
    updatedAt: now + i,
  }));

  const tx = db.transaction(['routines', 'meta'], 'readwrite');
  await Promise.all(routines.map((r) => tx.objectStore('routines').put(r)));
  await tx.objectStore('meta').put(true, 'seeded');
  await tx.done;
  logger.info(SCOPE, 'Premier lancement : routines préchargées', { count: routines.length });
  return true;
}

/**
 * Remplace intégralement les données par un backup importé (REGLE 4 — réversible
 * via l'export préalable). Transactionnel : tout ou rien.
 */
export async function restoreBackup(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['routines', 'logs', 'meta'], 'readwrite');
  await tx.objectStore('routines').clear();
  await tx.objectStore('logs').clear();
  await Promise.all(data.routines.map((r) => tx.objectStore('routines').put(r)));
  await Promise.all(data.logs.map((l) => tx.objectStore('logs').put(l)));
  await tx.objectStore('meta').put(data.settings, 'settings');
  await tx.objectStore('meta').put(true, 'seeded');
  await tx.done;
  logger.info(SCOPE, 'Backup restauré', {
    routines: data.routines.length,
    logs: data.logs.length,
  });
}
