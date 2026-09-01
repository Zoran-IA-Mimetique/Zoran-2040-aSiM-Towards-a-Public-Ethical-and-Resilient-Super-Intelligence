import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { periodStartKey, type Period } from '../lib/dates';
import { effectiveTime } from '../lib/scheduling';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
};

export function HistoryScreen(): JSX.Element {
  const { routines, logs } = useApp();
  const [period, setPeriod] = useState<Period>('week');

  const titleById = useMemo(
    () => new Map(routines.map((r) => [r.id, r.title])),
    [routines],
  );

  const { rangeLogs, doneCount, ignoredCount, plannedCount } = useMemo(() => {
    const start = periodStartKey(period);
    const inRange = logs.filter((l) => l.date >= start);
    const done = inRange.filter((l) => l.status === 'done').length;
    const ignored = inRange.filter((l) => l.status === 'ignored').length;
    // "prévues" = nombre d'occurrences planifiées sur la période (routines avec
    // heure effective) × nb de jours, estimation simple basée sur l'actif courant.
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const scheduledPerDay = routines.filter((r) => r.active && effectiveTime(r)).length;
    return {
      rangeLogs: [...inRange].sort((a, b) =>
        a.date === b.date ? b.updatedAt - a.updatedAt : b.date.localeCompare(a.date),
      ),
      doneCount: done,
      ignoredCount: ignored,
      plannedCount: scheduledPerDay * days,
    };
  }, [logs, routines, period]);

  return (
    <div>
      <div className="history-tabs" role="tablist">
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            className={`history-tab ${period === p ? 'history-tab--active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__value">{plannedCount}</div>
          <div className="stat__label">Prévues</div>
        </div>
        <div className="stat">
          <div className="stat__value" style={{ color: 'var(--success)' }}>
            {doneCount}
          </div>
          <div className="stat__label">Réalisées</div>
        </div>
        <div className="stat">
          <div className="stat__value" style={{ color: 'var(--danger)' }}>
            {ignoredCount}
          </div>
          <div className="stat__label">Ignorées</div>
        </div>
      </div>

      <section className="section">
        <h2 className="section__title">Journal</h2>
        {rangeLogs.length === 0 ? (
          <p className="empty">Aucune activité sur cette période.</p>
        ) : (
          rangeLogs.map((l) => (
            <div className="card" key={l.id}>
              <div className="row row--between">
                <strong style={{ fontSize: '0.95rem' }}>
                  {titleById.get(l.routineId) ?? 'Routine supprimée'}
                </strong>
                <span className="chip">
                  {l.status === 'done'
                    ? '✅ Faite'
                    : l.status === 'ignored'
                      ? '⛔ Ignorée'
                      : l.status === 'snoozed'
                        ? '⏰ Reportée'
                        : '⏳ En attente'}
                </span>
              </div>
              <p className="hint">{l.date}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
