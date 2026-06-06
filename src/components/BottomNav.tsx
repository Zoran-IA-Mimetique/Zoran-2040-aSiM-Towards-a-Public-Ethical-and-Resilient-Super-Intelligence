export type Tab = 'today' | 'routines' | 'add' | 'history' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: "Aujourd'hui", icon: '🗓️' },
  { id: 'routines', label: 'Routines', icon: '📋' },
  { id: 'add', label: 'Ajouter', icon: '➕' },
  { id: 'history', label: 'Historique', icon: '📊' },
  { id: 'settings', label: 'Réglages', icon: '⚙️' },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: Props): JSX.Element {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`nav-item ${active === t.id ? 'nav-item--active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-item__icon" aria-hidden>
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
