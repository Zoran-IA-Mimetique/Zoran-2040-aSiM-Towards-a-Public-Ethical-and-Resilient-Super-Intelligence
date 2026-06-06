import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { CATEGORIES, type Category } from '../types';
import { CATEGORY_META } from '../data/categories';
import { parseBulkImport } from '../lib/bulkImport';
import { isValidTime } from '../lib/dates';

interface Props {
  onDone: (message: string) => void;
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}): JSX.Element {
  return (
    <div className="category-grid">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          className="category-option"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
        >
          <span aria-hidden style={{ fontSize: '1.3rem' }}>
            {CATEGORY_META[c].emoji}
          </span>
          {c}
        </button>
      ))}
    </div>
  );
}

function SingleForm({ onDone }: Props): JSX.Element {
  const { addRoutine } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Focus');
  const [time, setTime] = useState('');

  const canSubmit = title.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await addRoutine({
      title,
      description,
      category,
      suggestedTime: time && isValidTime(time) ? time : undefined,
    });
    setTitle('');
    setDescription('');
    setCategory('Focus');
    setTime('');
    onDone('Routine ajoutée ✅');
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label className="field__label" htmlFor="add-title">
          Titre *
        </label>
        <input
          id="add-title"
          className="input"
          value={title}
          maxLength={200}
          placeholder="Ex. Boire un verre d'eau"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="add-desc">
          Description
        </label>
        <textarea
          id="add-desc"
          className="textarea"
          value={description}
          maxLength={2000}
          placeholder="Pourquoi cette micro-action ?"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <span className="field__label">Catégorie</span>
        <CategoryPicker value={category} onChange={setCategory} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="add-time">
          Heure suggérée
        </label>
        <input
          id="add-time"
          type="time"
          className="input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn--primary btn--block" disabled={!canSubmit}>
        Ajouter la routine
      </button>
    </form>
  );
}

function BulkForm({ onDone }: Props): JSX.Element {
  const { addRoutines } = useApp();
  const [raw, setRaw] = useState('');
  const [category, setCategory] = useState<Category>('Focus');

  const preview = parseBulkImport(raw, { category });

  const submit = async () => {
    if (preview.length === 0) return;
    await addRoutines(preview);
    setRaw('');
    onDone(`${preview.length} routine(s) importée(s) ✅`);
  };

  return (
    <div>
      <p className="hint">Une ligne = une routine. Les doublons et lignes vides sont ignorés.</p>
      <div className="field">
        <label className="field__label" htmlFor="bulk-text">
          Coller les routines
        </label>
        <textarea
          id="bulk-text"
          className="textarea"
          style={{ minHeight: 160 }}
          value={raw}
          placeholder={'Eau froide visage\nMot du jour\n3 minutes de silence'}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>
      <div className="field">
        <span className="field__label">Catégorie appliquée</span>
        <CategoryPicker value={category} onChange={setCategory} />
      </div>
      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={preview.length === 0}
        onClick={submit}
      >
        Importer {preview.length > 0 ? `(${preview.length})` : ''}
      </button>
    </div>
  );
}

export function AddScreen({ onDone }: Props): JSX.Element {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  return (
    <div>
      <div className="history-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'single'}
          className={`history-tab ${mode === 'single' ? 'history-tab--active' : ''}`}
          onClick={() => setMode('single')}
        >
          Une routine
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'bulk'}
          className={`history-tab ${mode === 'bulk' ? 'history-tab--active' : ''}`}
          onClick={() => setMode('bulk')}
        >
          Import par lot
        </button>
      </div>
      {mode === 'single' ? <SingleForm onDone={onDone} /> : <BulkForm onDone={onDone} />}
    </div>
  );
}
