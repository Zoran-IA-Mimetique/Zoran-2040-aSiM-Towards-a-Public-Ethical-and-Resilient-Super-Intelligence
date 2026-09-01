import type { ActionLog, Routine, Settings } from '../types';
import { isValidTime, isWithinAllowedHours, timeToMinutes } from './dates';

/** Heure effective d'une routine : personnalisée > suggérée > undefined. */
export function effectiveTime(r: Routine): string | undefined {
  if (r.customTime && isValidTime(r.customTime)) return r.customTime;
  if (r.suggestedTime && isValidTime(r.suggestedTime)) return r.suggestedTime;
  return undefined;
}

/**
 * Détermine les routines à notifier maintenant (logique pure, sans effet de bord).
 *
 * Critères :
 *  - routine active ;
 *  - heure effective définie et déjà atteinte (<= maintenant) ;
 *  - heure dans la plage autorisée des paramètres ;
 *  - action du jour ni "done" ni "ignored" (sinon plus rien à rappeler) ;
 *  - dans la limite de `maxActiveNotifications` (les plus matinales d'abord).
 *
 * @param nowMinutes minutes écoulées depuis minuit (heure locale courante).
 */
export function computeDueRoutines(
  routines: Routine[],
  todayLogs: ActionLog[],
  settings: Settings,
  nowMinutes: number,
): Routine[] {
  const statusByRoutine = new Map<string, ActionLog['status']>();
  for (const l of todayLogs) statusByRoutine.set(l.routineId, l.status);

  const due = routines
    .filter((r) => r.active)
    .map((r) => ({ r, time: effectiveTime(r) }))
    .filter((x): x is { r: Routine; time: string } => !!x.time)
    .filter(({ r, time }) => {
      const status = statusByRoutine.get(r.id);
      if (status === 'done' || status === 'ignored') return false;
      if (timeToMinutes(time) > nowMinutes) return false;
      if (!isWithinAllowedHours(time, settings.allowedStart, settings.allowedEnd)) return false;
      return true;
    })
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    .map((x) => x.r);

  const max = Math.max(0, settings.maxActiveNotifications);
  return due.slice(0, max);
}

/**
 * Partitionne les routines/logs du jour pour l'écran "Aujourd'hui".
 * - planned : actives, en attente (ni faites ni ignorées) ;
 * - done    : marquées faites aujourd'hui ;
 * - ignored : marquées ignorées aujourd'hui.
 * Les routines en pause n'apparaissent pas dans "planned".
 */
export function partitionToday(
  routines: Routine[],
  todayLogs: ActionLog[],
): { planned: Routine[]; done: Routine[]; ignored: Routine[] } {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const statusByRoutine = new Map<string, ActionLog['status']>();
  for (const l of todayLogs) statusByRoutine.set(l.routineId, l.status);

  const done: Routine[] = [];
  const ignored: Routine[] = [];
  for (const [routineId, status] of statusByRoutine) {
    const r = byId.get(routineId);
    if (!r) continue;
    if (status === 'done') done.push(r);
    else if (status === 'ignored') ignored.push(r);
  }

  const planned = routines.filter((r) => {
    if (!r.active) return false;
    const status = statusByRoutine.get(r.id);
    return status !== 'done' && status !== 'ignored';
  });

  const byTime = (a: Routine, b: Routine) =>
    (timeToMinutes(effectiveTime(a) ?? '99:99') || 9999) -
    (timeToMinutes(effectiveTime(b) ?? '99:99') || 9999);

  return {
    planned: planned.sort(byTime),
    done,
    ignored,
  };
}
