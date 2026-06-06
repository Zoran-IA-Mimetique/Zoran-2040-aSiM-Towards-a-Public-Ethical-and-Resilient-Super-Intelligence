import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { partitionToday } from '../lib/scheduling';
import { RoutineCard } from '../components/RoutineCard';
import { permissionState, requestPermission } from '../lib/notifications';
import { useState } from 'react';

export function TodayScreen(): JSX.Element {
  const { routines, logs, today, markAction, toggleActive } = useApp();
  const [perm, setPerm] = useState(permissionState());

  const todayLogs = useMemo(() => logs.filter((l) => l.date === today), [logs, today]);
  const { planned, done, ignored } = useMemo(
    () => partitionToday(routines, todayLogs),
    [routines, todayLogs],
  );

  const askPermission = async () => {
    setPerm(await requestPermission());
  };

  return (
    <div>
      {perm === 'default' && (
        <div className="banner">
          <span>Activer les rappels de routines&nbsp;?</span>
          <button type="button" className="btn btn--primary" onClick={askPermission}>
            Activer
          </button>
        </div>
      )}

      <section className="section">
        <h2 className="section__title">
          À faire aujourd'hui <span className="section__count">{planned.length}</span>
        </h2>
        {planned.length === 0 ? (
          <p className="empty">Rien de prévu. Profitez du moment 🌿</p>
        ) : (
          planned.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              showActions
              onDone={() => markAction(r.id, 'done')}
              onLater={() => markAction(r.id, 'snoozed')}
              onPause={() => toggleActive(r.id)}
            />
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            Réalisées <span className="section__count">{done.length}</span>
          </h2>
          {done.map((r) => (
            <RoutineCard key={r.id} routine={r} statusLabel="✅ Faite" muted />
          ))}
        </section>
      )}

      {ignored.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            Ignorées <span className="section__count">{ignored.length}</span>
          </h2>
          {ignored.map((r) => (
            <RoutineCard key={r.id} routine={r} statusLabel="⛔ Ignorée" muted />
          ))}
        </section>
      )}
    </div>
  );
}
