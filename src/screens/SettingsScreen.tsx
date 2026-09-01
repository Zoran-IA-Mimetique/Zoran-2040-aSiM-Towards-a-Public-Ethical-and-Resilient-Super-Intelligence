import { useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { parseBackup } from '../lib/backup';
import { dayKey } from '../lib/dates';

interface Props {
  onToast: (message: string) => void;
}

export function SettingsScreen({ onToast }: Props): JSX.Element {
  const { settings, updateSettings, exportJSON, importBackup, routines, logs } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(settings);

  const persist = (patch: Partial<typeof settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    void updateSettings(next);
  };

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `routine-cognitive-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Export JSON téléchargé ✅');
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      onToast(`Import refusé : ${parsed.error}`);
      e.target.value = '';
      return;
    }
    if (
      !confirm(
        `Importer remplacera vos données actuelles (${routines.length} routines, ${logs.length} entrées).\nContinuer ?`,
      )
    ) {
      e.target.value = '';
      return;
    }
    try {
      await importBackup(parsed);
      setLocal({ ...settings, ...parsed.data!.settings });
      onToast(
        `Import OK (${parsed.data!.routines.length} routines, rejetés: ${parsed.dropped.routines + parsed.dropped.logs})`,
      );
    } catch (err) {
      onToast(`Erreur import : ${String(err)}`);
    }
    e.target.value = '';
  };

  return (
    <div>
      <section className="section">
        <h2 className="section__title">Notifications</h2>
        <div className="card">
          <div className="field">
            <label className="field__label" htmlFor="max-notif">
              Nombre maximal de notifications actives : <strong>{local.maxActiveNotifications}</strong>
            </label>
            <input
              id="max-notif"
              type="range"
              min={0}
              max={10}
              step={1}
              value={local.maxActiveNotifications}
              onChange={(e) => persist({ maxActiveNotifications: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="start">
                Début autorisé
              </label>
              <input
                id="start"
                type="time"
                className="input"
                value={local.allowedStart}
                onChange={(e) => persist({ allowedStart: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="end">
                Fin autorisée
              </label>
              <input
                id="end"
                type="time"
                className="input"
                value={local.allowedEnd}
                onChange={(e) => persist({ allowedEnd: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Apparence</h2>
        <div className="card">
          <div className="history-tabs" role="tablist" style={{ marginBottom: 0 }}>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={local.theme === t}
                className={`history-tab ${local.theme === t ? 'history-tab--active' : ''}`}
                onClick={() => persist({ theme: t })}
              >
                {t === 'light' ? '☀️ Clair' : t === 'dark' ? '🌙 Sombre' : '🖥️ Auto'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Données (local uniquement)</h2>
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            Vos données ne quittent jamais l'appareil. Sauvegardez-les via l'export JSON.
          </p>
          <div className="actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button type="button" className="btn btn--ghost" onClick={doExport}>
              ⬇️ Export JSON
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => fileRef.current?.click()}
            >
              ⬆️ Import JSON
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={onImportFile}
          />
        </div>
      </section>

      <p className="hint" style={{ textAlign: 'center' }}>
        Routine Cognitive · MVP v1 · {routines.length} routines · sans backend
      </p>
    </div>
  );
}
