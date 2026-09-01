import type { Routine } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { ActionButtons } from './ActionButtons';
import { effectiveTime } from '../lib/scheduling';
import { displayTime } from '../lib/dates';

interface Props {
  routine: Routine;
  /** Affiche le trio d'actions (écran Aujourd'hui). */
  showActions?: boolean;
  onDone?: () => void;
  onLater?: () => void;
  onPause?: () => void;
  /** Badge d'état terminal (réalisée / ignorée). */
  statusLabel?: string;
  muted?: boolean;
}

export function RoutineCard({
  routine,
  showActions,
  onDone,
  onLater,
  onPause,
  statusLabel,
  muted,
}: Props): JSX.Element {
  const time = effectiveTime(routine);
  return (
    <article className={`card routine-card ${muted ? 'card--muted' : ''}`}>
      <div className="routine-card__top">
        <h3 className="routine-card__title">{routine.title}</h3>
        {statusLabel && <span className="chip">{statusLabel}</span>}
      </div>
      {routine.description && <p className="routine-card__desc">{routine.description}</p>}
      <div className="routine-card__meta">
        <CategoryBadge category={routine.category} />
        <span className="chip">🕑 {displayTime(time)}</span>
        {!routine.active && <span className="chip">⏸️ En pause</span>}
      </div>
      {showActions && onDone && onLater && onPause && (
        <ActionButtons onDone={onDone} onLater={onLater} onPause={onPause} />
      )}
    </article>
  );
}
