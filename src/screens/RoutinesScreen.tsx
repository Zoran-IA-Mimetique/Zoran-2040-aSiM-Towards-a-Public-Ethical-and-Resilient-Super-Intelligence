import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { CATEGORIES, type Routine } from '../types';
import { CategoryBadge } from '../components/CategoryBadge';
import { effectiveTime } from '../lib/scheduling';
import { displayTime, isValidTime } from '../lib/dates';

function RoutineRow({ routine }: { routine: Routine }): JSX.Element {
  const { updateRoutine, removeRoutine, toggleActive } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(routine);

  const save = async () => {
    await updateRoutine({
      ...draft,
      customTime:
        draft.customTime && isValidTime(draft.customTime) ? draft.customTime : undefined,
    });
    setOpen(false);
  };

  return (
    <article className={`card ${routine.active ? '' : 'card--muted'}`}>
      <div className="routine-card__top">
        <h3 className="routine-card__title">{routine.title}</h3>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={routine.active}
          aria-label={routine.active ? 'Mettre en pause' : 'Activer'}
          onClick={() => toggleActive(routine.id)}
        />
      </div>
      {routine.description && <p className="routine-card__desc">{routine.description}</p>}
      <div className="routine-card__meta">
        <CategoryBadge category={routine.category} />
        <span className="chip">🕑 {displayTime(effectiveTime(routine))}</span>
        {routine.customTime && <span className="chip">perso.</span>}
        <button
          type="button"
          className="chip"
          onClick={() => {
            setDraft(routine);
            setOpen((v) => !v);
          }}
        >
          {open ? 'Fermer' : '✏️ Modifier'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label className="field__label" htmlFor={`title-${routine.id}`}>
              Titre
            </label>
            <input
              id={`title-${routine.id}`}
              className="input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`desc-${routine.id}`}>
              Description
            </label>
            <textarea
              id={`desc-${routine.id}`}
              className="textarea"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`cat-${routine.id}`}>
              Catégorie
            </label>
            <select
              id={`cat-${routine.id}`}
              className="select"
              value={draft.category}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as Routine['category'] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor={`sug-${routine.id}`}>
                Heure suggérée
              </label>
              <input
                id={`sug-${routine.id}`}
                type="time"
                className="input"
                value={draft.suggestedTime ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, suggestedTime: e.target.value || undefined })
                }
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor={`cus-${routine.id}`}>
                Heure perso.
              </label>
              <input
                id={`cus-${routine.id}`}
                type="time"
                className="input"
                value={draft.customTime ?? ''}
                onChange={(e) => setDraft({ ...draft, customTime: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="actions" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!draft.title.trim()}
              onClick={save}
            >
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                if (confirm(`Supprimer « ${routine.title} » ?`)) void removeRoutine(routine.id);
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function RoutinesScreen(): JSX.Element {
  const { routines } = useApp();
  const active = routines.filter((r) => r.active);
  const paused = routines.filter((r) => !r.active);

  return (
    <div>
      <section className="section">
        <h2 className="section__title">
          Actives <span className="section__count">{active.length}</span>
        </h2>
        {active.length === 0 ? (
          <p className="empty">Aucune routine active.</p>
        ) : (
          <div className="list-grid">
            {active.map((r) => (
              <RoutineRow key={r.id} routine={r} />
            ))}
          </div>
        )}
      </section>

      {paused.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            En pause <span className="section__count">{paused.length}</span>
          </h2>
          <div className="list-grid">
            {paused.map((r) => (
              <RoutineRow key={r.id} routine={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
