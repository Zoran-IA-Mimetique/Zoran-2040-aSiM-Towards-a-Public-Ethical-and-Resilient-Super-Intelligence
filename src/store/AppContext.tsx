import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SETTINGS,
  type ActionLog,
  type ActionStatus,
  type Routine,
  type Settings,
} from '../types';
import * as db from '../db/database';
import { dayKey, uid } from '../lib/dates';
import { logger } from '../lib/logger';
import { NotificationScheduler } from '../lib/scheduler';
import { permissionState, showRoutineNotification } from '../lib/notifications';
import { buildBackup, serializeBackup, type ParsedBackup } from '../lib/backup';

const SCOPE = 'store';

export interface NewRoutineInput {
  title: string;
  description?: string;
  category: Routine['category'];
  suggestedTime?: string;
}

interface AppState {
  ready: boolean;
  routines: Routine[];
  logs: ActionLog[];
  settings: Settings;
  today: string;
  // actions
  addRoutine: (input: NewRoutineInput) => Promise<Routine>;
  addRoutines: (routines: Routine[]) => Promise<void>;
  updateRoutine: (routine: Routine) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  markAction: (routineId: string, status: ActionStatus) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  exportJSON: () => string;
  importBackup: (parsed: ParsedBackup) => Promise<void>;
  reload: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [today, setToday] = useState(dayKey());
  const schedulerRef = useRef<NotificationScheduler | null>(null);

  const reload = useCallback(async () => {
    const [r, l, s] = await Promise.all([
      db.getAllRoutines(),
      db.getAllLogs(),
      db.getSettings(),
    ]);
    setRoutines(r);
    setLogs(l);
    setSettings(s);
  }, []);

  // Initialisation : seed + chargement + démarrage planificateur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await db.seedIfFirstRun();
        await reload();
        if (cancelled) return;
        setReady(true);
        logger.info(SCOPE, 'Application initialisée');
      } catch (e) {
        logger.error(SCOPE, 'Echec initialisation', { error: String(e) });
        setReady(true); // on rend l'UI quand même
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Planificateur de notifications (démarré une fois prêt).
  useEffect(() => {
    if (!ready) return;
    if (schedulerRef.current) return;
    const scheduler = new NotificationScheduler({
      load: async () => ({
        routines: await db.getAllRoutines(),
        logs: await db.getLogsByDate(dayKey()),
        settings: await db.getSettings(),
      }),
      notify: (routine) => {
        if (permissionState() === 'granted') return showRoutineNotification(routine);
      },
    });
    scheduler.start();
    schedulerRef.current = scheduler;
    return () => {
      scheduler.stop();
      schedulerRef.current = null;
    };
  }, [ready]);

  // Bascule de jour : met à jour la clé "today" à minuit (vérif chaque minute).
  useEffect(() => {
    const id = setInterval(() => {
      const k = dayKey();
      setToday((prev) => (prev !== k ? k : prev));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Réception des actions issues du Service Worker (boutons de notification).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'routine-action') return;
      const { action, routineId } = data as { action: string; routineId: string };
      logger.info(SCOPE, 'Action reçue du Service Worker', { action, routineId });
      if (action === 'done') void markAction(routineId, 'done');
      else if (action === 'later') void markAction(routineId, 'snoozed');
      else if (action === 'pause') void toggleActive(routineId);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routines]);

  const addRoutine = useCallback(async (input: NewRoutineInput): Promise<Routine> => {
    const now = Date.now();
    const routine: Routine = {
      id: uid(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      category: input.category,
      suggestedTime: input.suggestedTime,
      customTime: undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.putRoutine(routine);
    setRoutines((prev) => [...prev, routine]);
    return routine;
  }, []);

  const addRoutines = useCallback(async (newRoutines: Routine[]) => {
    if (newRoutines.length === 0) return;
    await db.putRoutines(newRoutines);
    setRoutines((prev) => [...prev, ...newRoutines]);
  }, []);

  const updateRoutine = useCallback(async (routine: Routine) => {
    const updated = { ...routine, updatedAt: Date.now() };
    await db.putRoutine(updated);
    setRoutines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const removeRoutine = useCallback(async (id: string) => {
    await db.deleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setLogs((prev) => prev.filter((l) => l.routineId !== id));
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    let next: Routine | undefined;
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        next = { ...r, active: !r.active, updatedAt: Date.now() };
        return next;
      }),
    );
    if (next) await db.putRoutine(next);
  }, []);

  const markAction = useCallback(async (routineId: string, status: ActionStatus) => {
    const log = await db.setActionStatus(routineId, status);
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id || (l.routineId === routineId && l.date === log.date));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = log;
        return copy;
      }
      return [...prev, log];
    });
  }, []);

  const updateSettings = useCallback(async (next: Settings) => {
    await db.putSettings(next);
    setSettings(next);
  }, []);

  const exportJSON = useCallback(() => {
    return serializeBackup(buildBackup(routines, logs, settings));
  }, [routines, logs, settings]);

  const importBackup = useCallback(
    async (parsed: ParsedBackup) => {
      if (!parsed.ok || !parsed.data) throw new Error(parsed.error ?? 'Backup invalide');
      await db.restoreBackup(parsed.data);
      await reload();
      logger.info(SCOPE, 'Backup importé via UI', parsed.dropped);
    },
    [reload],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      routines,
      logs,
      settings,
      today,
      addRoutine,
      addRoutines,
      updateRoutine,
      removeRoutine,
      toggleActive,
      markAction,
      updateSettings,
      exportJSON,
      importBackup,
      reload,
    }),
    [
      ready,
      routines,
      logs,
      settings,
      today,
      addRoutine,
      addRoutines,
      updateRoutine,
      removeRoutine,
      toggleActive,
      markAction,
      updateSettings,
      exportJSON,
      importBackup,
      reload,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return ctx;
}
