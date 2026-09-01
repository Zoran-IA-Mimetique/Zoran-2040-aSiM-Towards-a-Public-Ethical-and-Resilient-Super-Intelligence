import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import * as db from './database';
import { dayKey } from '../lib/dates';
import { buildBackup } from '../lib/backup';
import { DEFAULT_SETTINGS, type Routine } from '../types';

function routine(over: Partial<Routine> = {}): Routine {
  const now = Date.now();
  return {
    id: over.id ?? 'r' + Math.random().toString(36).slice(2),
    title: over.title ?? 'Routine',
    description: '',
    category: 'Focus',
    suggestedTime: '08:00',
    customTime: undefined,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

beforeEach(() => {
  // Base fraîche pour chaque test (isolation).
  globalThis.indexedDB = new IDBFactory();
  db._resetDbForTests();
});

describe('database — seed (premier lancement)', () => {
  it('précharge les routines une seule fois (idempotent)', async () => {
    const first = await db.seedIfFirstRun();
    expect(first).toBe(true);
    const routines = await db.getAllRoutines();
    expect(routines.length).toBe(15);

    const second = await db.seedIfFirstRun();
    expect(second).toBe(false);
    expect((await db.getAllRoutines()).length).toBe(15);
  });
});

describe('database — CRUD routines', () => {
  it('ajoute, met à jour et supprime une routine', async () => {
    const r = routine({ id: 'x', title: 'Test' });
    await db.putRoutine(r);
    expect((await db.getAllRoutines()).map((x) => x.id)).toContain('x');

    await db.putRoutine({ ...r, title: 'Modifié' });
    const all = await db.getAllRoutines();
    expect(all.find((x) => x.id === 'x')?.title).toBe('Modifié');

    await db.deleteRoutine('x');
    expect((await db.getAllRoutines()).find((x) => x.id === 'x')).toBeUndefined();
  });

  it('supprimer une routine supprime ses logs (pas d’orphelins)', async () => {
    const r = routine({ id: 'y' });
    await db.putRoutine(r);
    await db.setActionStatus('y', 'done');
    expect((await db.getAllLogs()).length).toBe(1);
    await db.deleteRoutine('y');
    expect((await db.getAllLogs()).length).toBe(0);
  });
});

describe('database — logs (statut d’action)', () => {
  it('crée puis met à jour le statut du jour (idempotent par jour)', async () => {
    const r = routine({ id: 'z' });
    await db.putRoutine(r);
    const today = dayKey();

    await db.setActionStatus('z', 'snoozed', { date: today });
    await db.setActionStatus('z', 'done', { date: today });

    const logs = await db.getLogsByDate(today);
    expect(logs).toHaveLength(1); // pas de doublon
    expect(logs[0].status).toBe('done');
  });

  it('getLogsInRange filtre par clé de date', async () => {
    const r = routine({ id: 'w' });
    await db.putRoutine(r);
    await db.setActionStatus('w', 'done', { date: '2026-06-06' });
    await db.setActionStatus('w', 'ignored', { date: '2026-05-01' });
    const recent = await db.getLogsInRange('2026-06-01');
    expect(recent).toHaveLength(1);
    expect(recent[0].date).toBe('2026-06-06');
  });
});

describe('database — settings & restore', () => {
  it('lit les valeurs par défaut puis persiste', async () => {
    expect(await db.getSettings()).toEqual(DEFAULT_SETTINGS);
    await db.putSettings({ ...DEFAULT_SETTINGS, maxActiveNotifications: 5 });
    expect((await db.getSettings()).maxActiveNotifications).toBe(5);
  });

  it('restaure intégralement un backup (remplacement total)', async () => {
    await db.putRoutine(routine({ id: 'old' }));
    const backup = buildBackup(
      [routine({ id: 'new', title: 'Nouvelle' })],
      [{ id: 'l', routineId: 'new', date: '2026-06-06', status: 'done', updatedAt: 0 }],
      { ...DEFAULT_SETTINGS, maxActiveNotifications: 7 },
    );
    await db.restoreBackup(backup);

    const routines = await db.getAllRoutines();
    expect(routines.map((r) => r.id)).toEqual(['new']);
    expect((await db.getAllLogs())).toHaveLength(1);
    expect((await db.getSettings()).maxActiveNotifications).toBe(7);
    // seeded marqué => pas de re-seed
    expect(await db.seedIfFirstRun()).toBe(false);
  });
});
