import type { ActionLog, Routine, Settings } from '../types';
import { computeDueRoutines } from './scheduling';
import { dayKey } from './dates';
import { logger } from './logger';

const SCOPE = 'scheduler';

/** Dépendances injectables (facilite les tests et le découplage du DOM). */
export interface SchedulerDeps {
  /** Source de données fraîches à chaque tick. */
  load: () => Promise<{ routines: Routine[]; logs: ActionLog[]; settings: Settings }>;
  /** Affiche une notification pour une routine due. */
  notify: (routine: Routine) => Promise<void> | void;
  /** Horloge injectable (défaut: Date.now). */
  now?: () => Date;
  /** Intervalle du heartbeat en ms (défaut 60s). */
  tickMs?: number;
  /** Seuil watchdog : sans heartbeat depuis N ms => redémarrage (défaut 3 ticks). */
  watchdogMs?: number;
}

interface Heartbeat {
  lastTickAt: number;
  ticks: number;
  notificationsSent: number;
  restarts: number;
  lastError?: string;
}

/**
 * Planificateur de notifications locales avec heartbeat + watchdog (REGLE 6).
 *
 * - heartbeat : un tick périodique évalue les routines dues et notifie.
 * - watchdog  : surveille la fraîcheur du heartbeat ; en cas de gel (timeout,
 *   freeze) il journalise et redémarre le timer de manière contrôlée.
 * - anti-doublon : une notification par (routine, jour) au maximum.
 */
export class NotificationScheduler {
  private readonly deps: Required<SchedulerDeps>;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private notifiedToday = new Set<string>();
  private currentDay = '';
  private ticking = false;
  private hb: Heartbeat = {
    lastTickAt: 0,
    ticks: 0,
    notificationsSent: 0,
    restarts: 0,
  };

  constructor(deps: SchedulerDeps) {
    this.deps = {
      now: () => new Date(),
      tickMs: 60_000,
      watchdogMs: 180_000,
      ...deps,
    };
  }

  start(): void {
    if (this.tickTimer) return;
    logger.info(SCOPE, 'Démarrage du planificateur', {
      tickMs: this.deps.tickMs,
      watchdogMs: this.deps.watchdogMs,
    });
    this.hb.lastTickAt = this.deps.now().getTime();
    void this.tick();
    this.tickTimer = setInterval(() => void this.tick(), this.deps.tickMs);
    this.watchdogTimer = setInterval(() => this.checkWatchdog(), this.deps.watchdogMs);
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.tickTimer = null;
    this.watchdogTimer = null;
    logger.info(SCOPE, 'Arrêt du planificateur', this.heartbeat());
  }

  /** Snapshot d'observabilité (REGLE 5/6). */
  heartbeat(): Heartbeat {
    return { ...this.hb };
  }

  /** Un cycle d'évaluation. Public pour permettre un déclenchement manuel/test. */
  async tick(): Promise<void> {
    if (this.ticking) return; // évite la réentrance
    this.ticking = true;
    try {
      const nowDate = this.deps.now();
      const today = dayKey(nowDate);
      if (today !== this.currentDay) {
        this.currentDay = today;
        this.notifiedToday.clear();
        logger.info(SCOPE, 'Nouveau jour — reset anti-doublon', { day: today });
      }

      const { routines, logs, settings } = await this.deps.load();
      const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
      const due = computeDueRoutines(routines, logs, settings, nowMinutes);

      for (const r of due) {
        if (this.notifiedToday.has(r.id)) continue;
        await this.deps.notify(r);
        this.notifiedToday.add(r.id);
        this.hb.notificationsSent++;
        logger.info(SCOPE, 'Notification émise', { id: r.id, title: r.title });
      }

      this.hb.ticks++;
      this.hb.lastTickAt = nowDate.getTime();
      this.hb.lastError = undefined;
    } catch (err) {
      this.hb.lastError = err instanceof Error ? err.message : String(err);
      logger.error(SCOPE, 'Echec du tick', { error: this.hb.lastError });
    } finally {
      this.ticking = false;
    }
  }

  private checkWatchdog(): void {
    const elapsed = this.deps.now().getTime() - this.hb.lastTickAt;
    if (elapsed > this.deps.watchdogMs) {
      this.hb.restarts++;
      logger.warn(SCOPE, 'Watchdog : heartbeat figé, redémarrage contrôlé', {
        elapsedMs: elapsed,
        restarts: this.hb.restarts,
      });
      // redémarrage contrôlé du timer de tick
      if (this.tickTimer) clearInterval(this.tickTimer);
      this.hb.lastTickAt = this.deps.now().getTime();
      void this.tick();
      this.tickTimer = setInterval(() => void this.tick(), this.deps.tickMs);
    }
  }
}
