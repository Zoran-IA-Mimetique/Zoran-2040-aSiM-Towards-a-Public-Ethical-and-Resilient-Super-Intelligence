// REGLE 5 — OBSERVABILITE.
// Journal applicatif minimal : timestamp, niveau, scope, message, contexte.
// Permet de répondre à : Que s'est-il passé ? Quand ? Pourquoi ? Où ?
// Les logs sont gardés en mémoire (anneau borné) et reflétés dans la console.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string; // ISO timestamp
  level: LogLevel;
  scope: string; // Où ?
  message: string; // Que s'est-il passé ?
  context?: unknown; // Pourquoi / détails
}

const MAX_ENTRIES = 500;
const ring: LogEntry[] = [];
type Listener = (entry: LogEntry) => void;
const listeners = new Set<Listener>();

function emit(level: LogLevel, scope: string, message: string, context?: unknown): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    context,
  };
  ring.push(entry);
  if (ring.length > MAX_ENTRIES) ring.shift();

  const line = `[${entry.ts}] [${level.toUpperCase()}] (${scope}) ${message}`;
  // eslint-disable-next-line no-console
  const sink = console[level === 'debug' ? 'log' : level];
  if (context !== undefined) sink(line, context);
  else sink(line);

  listeners.forEach((l) => {
    try {
      l(entry);
    } catch {
      /* un listener défaillant ne doit pas casser le logging */
    }
  });
}

export const logger = {
  debug: (scope: string, message: string, context?: unknown) =>
    emit('debug', scope, message, context),
  info: (scope: string, message: string, context?: unknown) =>
    emit('info', scope, message, context),
  warn: (scope: string, message: string, context?: unknown) =>
    emit('warn', scope, message, context),
  error: (scope: string, message: string, context?: unknown) =>
    emit('error', scope, message, context),
  /** Renvoie une copie des entrées courantes (pour debug UI / export). */
  history: (): LogEntry[] => [...ring],
  subscribe: (l: Listener): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  clear: (): void => {
    ring.length = 0;
  },
};
