import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationScheduler } from './scheduler';
import { DEFAULT_SETTINGS, type Routine } from '../types';

function routine(id: string, time: string): Routine {
  return {
    id,
    title: id,
    description: '',
    category: 'Focus',
    suggestedTime: time,
    customTime: undefined,
    active: true,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('NotificationScheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('notifie une routine due au premier tick (cas normal)', async () => {
    const notify = vi.fn();
    const scheduler = new NotificationScheduler({
      load: async () => ({
        routines: [routine('a', '08:00')],
        logs: [],
        settings: DEFAULT_SETTINGS,
      }),
      notify,
      now: () => new Date(2026, 5, 6, 10, 0, 0),
    });
    await scheduler.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(scheduler.heartbeat().notificationsSent).toBe(1);
  });

  it('ne notifie pas deux fois la même routine le même jour (anti-doublon)', async () => {
    const notify = vi.fn();
    const scheduler = new NotificationScheduler({
      load: async () => ({
        routines: [routine('a', '08:00')],
        logs: [],
        settings: DEFAULT_SETTINGS,
      }),
      notify,
      now: () => new Date(2026, 5, 6, 10, 0, 0),
    });
    await scheduler.tick();
    await scheduler.tick();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('capture les erreurs de chargement dans le heartbeat (cas erreur)', async () => {
    const scheduler = new NotificationScheduler({
      load: async () => {
        throw new Error('DB indisponible');
      },
      notify: vi.fn(),
      now: () => new Date(2026, 5, 6, 10, 0, 0),
    });
    await scheduler.tick();
    expect(scheduler.heartbeat().lastError).toBe('DB indisponible');
  });

  it('watchdog redémarre le heartbeat figé (REGLE 6)', async () => {
    // `load` ne se résout jamais => le tick reste bloqué (freeze simulé) et
    // lastTickAt n'est jamais rafraîchi : le watchdog doit détecter le gel.
    const scheduler = new NotificationScheduler({
      load: () => new Promise(() => {}),
      notify: vi.fn(),
      tickMs: 1000,
      watchdogMs: 5000,
    });
    scheduler.start();
    expect(scheduler.heartbeat().restarts).toBe(0);
    // À t=10s, elapsed (10s) > watchdogMs (5s) => redémarrage contrôlé.
    await vi.advanceTimersByTimeAsync(11_000);
    expect(scheduler.heartbeat().restarts).toBeGreaterThan(0);
    scheduler.stop();
  });
});
