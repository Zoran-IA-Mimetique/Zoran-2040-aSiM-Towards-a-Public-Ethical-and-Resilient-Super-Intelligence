import { describe, it, expect } from 'vitest';
import { buildBackup, serializeBackup, parseBackup } from './backup';
import { DEFAULT_SETTINGS, type ActionLog, type Routine } from '../types';

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: over.id ?? 'r1',
    title: over.title ?? 'Titre',
    description: '',
    category: 'Focus',
    suggestedTime: '08:00',
    customTime: undefined,
    active: true,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe('backup — aller/retour (cas normal)', () => {
  it('export puis import préserve les données', () => {
    const routines = [routine({ id: 'a' }), routine({ id: 'b', title: 'B' })];
    const logs: ActionLog[] = [
      { id: 'l1', routineId: 'a', date: '2026-06-06', status: 'done', updatedAt: 1 },
    ];
    const json = serializeBackup(buildBackup(routines, logs, DEFAULT_SETTINGS));
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.data!.routines).toHaveLength(2);
    expect(parsed.data!.logs).toHaveLength(1);
    expect(parsed.data!.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('backup — cas erreur', () => {
  it('JSON invalide => ok:false', () => {
    const parsed = parseBackup('{not json');
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe('JSON invalide');
  });

  it('racine non-objet => ok:false', () => {
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup('42').ok).toBe(false);
  });
});

describe('backup — validation / sécurité (REGLE 9)', () => {
  it('rejette les routines malformées et compte les rejets', () => {
    const json = JSON.stringify({
      routines: [
        { id: 'ok', title: 'Bon' },
        { id: 'no-title' },
        'pas-un-objet',
        { title: 'sans-id' },
      ],
      logs: [],
    });
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.data!.routines).toHaveLength(1);
    expect(parsed.dropped.routines).toBe(3);
  });

  it('rejette les logs orphelins (routine inexistante)', () => {
    const json = JSON.stringify({
      routines: [{ id: 'a', title: 'A' }],
      logs: [
        { id: 'l1', routineId: 'a', date: '2026-06-06', status: 'done' },
        { id: 'l2', routineId: 'ghost', date: '2026-06-06', status: 'done' },
      ],
    });
    const parsed = parseBackup(json);
    expect(parsed.data!.logs).toHaveLength(1);
    expect(parsed.dropped.logs).toBe(1);
  });

  it('normalise une catégorie inconnue vers Focus', () => {
    const json = JSON.stringify({
      routines: [{ id: 'a', title: 'A', category: 'Inexistante' }],
      logs: [],
    });
    const parsed = parseBackup(json);
    expect(parsed.data!.routines[0].category).toBe('Focus');
  });

  it('borne maxActiveNotifications et corrige heures invalides', () => {
    const json = JSON.stringify({
      routines: [],
      logs: [],
      settings: { maxActiveNotifications: 999, allowedStart: '99:99', theme: 'pixel' },
    });
    const parsed = parseBackup(json);
    expect(parsed.data!.settings.maxActiveNotifications).toBe(DEFAULT_SETTINGS.maxActiveNotifications);
    expect(parsed.data!.settings.allowedStart).toBe(DEFAULT_SETTINGS.allowedStart);
    expect(parsed.data!.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });
});
