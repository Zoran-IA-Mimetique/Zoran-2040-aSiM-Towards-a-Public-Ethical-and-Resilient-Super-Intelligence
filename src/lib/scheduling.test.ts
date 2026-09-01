import { describe, it, expect } from 'vitest';
import { computeDueRoutines, partitionToday, effectiveTime } from './scheduling';
import { DEFAULT_SETTINGS, type ActionLog, type Routine, type Settings } from '../types';

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    title: over.title ?? 'R',
    description: '',
    category: 'Focus',
    suggestedTime: over.suggestedTime,
    customTime: over.customTime,
    active: over.active ?? true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

// Plage horaire large par défaut pour isoler la logique d'échéance/tri/max.
const settings: Settings = {
  ...DEFAULT_SETTINGS,
  maxActiveNotifications: 3,
  allowedStart: '00:00',
  allowedEnd: '23:59',
};

describe('effectiveTime', () => {
  it('priorise customTime sur suggestedTime', () => {
    expect(effectiveTime(routine({ suggestedTime: '08:00', customTime: '09:30' }))).toBe('09:30');
    expect(effectiveTime(routine({ suggestedTime: '08:00' }))).toBe('08:00');
    expect(effectiveTime(routine({}))).toBeUndefined();
  });
});

describe('computeDueRoutines — cas normal', () => {
  it('renvoie les routines dont l’heure est atteinte', () => {
    const routines = [
      routine({ id: 'a', suggestedTime: '08:00' }),
      routine({ id: 'b', suggestedTime: '14:00' }),
    ];
    const due = computeDueRoutines(routines, [], settings, 10 * 60); // 10:00
    expect(due.map((r) => r.id)).toEqual(['a']);
  });

  it('trie par heure croissante', () => {
    const routines = [
      routine({ id: 'late', suggestedTime: '09:00' }),
      routine({ id: 'early', suggestedTime: '07:00' }),
    ];
    const due = computeDueRoutines(routines, [], settings, 23 * 60);
    expect(due.map((r) => r.id)).toEqual(['early', 'late']);
  });
});

describe('computeDueRoutines — cas limites', () => {
  it('exclut les routines en pause', () => {
    const routines = [routine({ id: 'a', suggestedTime: '08:00', active: false })];
    expect(computeDueRoutines(routines, [], settings, 1200)).toHaveLength(0);
  });

  it('exclut les actions déjà faites ou ignorées', () => {
    const routines = [
      routine({ id: 'done', suggestedTime: '08:00' }),
      routine({ id: 'ignored', suggestedTime: '08:00' }),
      routine({ id: 'pending', suggestedTime: '08:00' }),
    ];
    const logs: ActionLog[] = [
      { id: '1', routineId: 'done', date: 'x', status: 'done', updatedAt: 0 },
      { id: '2', routineId: 'ignored', date: 'x', status: 'ignored', updatedAt: 0 },
    ];
    const due = computeDueRoutines(routines, logs, settings, 1200);
    expect(due.map((r) => r.id)).toEqual(['pending']);
  });

  it('respecte la plage horaire autorisée', () => {
    const s: Settings = { ...settings, allowedStart: '09:00', allowedEnd: '17:00' };
    const routines = [routine({ id: 'early', suggestedTime: '07:00' })];
    expect(computeDueRoutines(routines, [], s, 1200)).toHaveLength(0);
  });

  it('respecte le maximum de notifications', () => {
    const s: Settings = { ...settings, maxActiveNotifications: 2 };
    const routines = [
      routine({ id: 'a', suggestedTime: '06:00' }),
      routine({ id: 'b', suggestedTime: '07:00' }),
      routine({ id: 'c', suggestedTime: '08:00' }),
    ];
    expect(computeDueRoutines(routines, [], s, 1200)).toHaveLength(2);
  });

  it('max = 0 => aucune notification', () => {
    const s: Settings = { ...settings, maxActiveNotifications: 0 };
    const routines = [routine({ id: 'a', suggestedTime: '06:00' })];
    expect(computeDueRoutines(routines, [], s, 1200)).toHaveLength(0);
  });

  it('ignore les routines sans heure', () => {
    const routines = [routine({ id: 'a' })];
    expect(computeDueRoutines(routines, [], settings, 1200)).toHaveLength(0);
  });
});

describe('partitionToday', () => {
  it('répartit planned / done / ignored', () => {
    const routines = [
      routine({ id: 'plan', suggestedTime: '08:00' }),
      routine({ id: 'done', suggestedTime: '09:00' }),
      routine({ id: 'ign', suggestedTime: '10:00' }),
      routine({ id: 'paused', suggestedTime: '11:00', active: false }),
    ];
    const logs: ActionLog[] = [
      { id: '1', routineId: 'done', date: 'd', status: 'done', updatedAt: 0 },
      { id: '2', routineId: 'ign', date: 'd', status: 'ignored', updatedAt: 0 },
    ];
    const { planned, done, ignored } = partitionToday(routines, logs);
    expect(planned.map((r) => r.id)).toEqual(['plan']); // paused exclu
    expect(done.map((r) => r.id)).toEqual(['done']);
    expect(ignored.map((r) => r.id)).toEqual(['ign']);
  });

  it('une action reportée (snoozed) reste planifiée', () => {
    const routines = [routine({ id: 'a', suggestedTime: '08:00' })];
    const logs: ActionLog[] = [
      { id: '1', routineId: 'a', date: 'd', status: 'snoozed', updatedAt: 0 },
    ];
    const { planned } = partitionToday(routines, logs);
    expect(planned.map((r) => r.id)).toEqual(['a']);
  });
});
