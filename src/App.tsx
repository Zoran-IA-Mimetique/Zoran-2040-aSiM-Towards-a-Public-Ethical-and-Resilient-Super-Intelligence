import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { BottomNav, type Tab } from './components/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { AddScreen } from './screens/AddScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const TAB_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  today: { title: "Aujourd'hui", subtitle: 'Vos micro-actions du jour' },
  routines: { title: 'Mes routines', subtitle: 'Activez, modifiez, mettez en pause' },
  add: { title: 'Ajouter', subtitle: 'Une routine ou un import par lot' },
  history: { title: 'Historique', subtitle: 'Prévues · réalisées · ignorées' },
  settings: { title: 'Réglages', subtitle: 'Notifications, thème, données' },
};

/** Applique le thème (clair/sombre/auto) sur l'élément racine. */
function useTheme(theme: 'light' | 'dark' | 'system'): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;
      root.setAttribute('data-theme', resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', resolved === 'dark' ? '#0b1020' : '#6366f1');
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);
}

function Toast({ message }: { message: string | null }): JSX.Element | null {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

function Shell(): JSX.Element {
  const { ready, settings } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [toast, setToast] = useState<string | null>(null);
  useTheme(settings.theme);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const goToday = (msg: string) => {
    showToast(msg);
    setTab('today');
  };

  const meta = TAB_TITLES[tab];

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">🧠 {meta.title}</h1>
          <p className="app__subtitle">{meta.subtitle}</p>
        </div>
      </header>
      <main className="app__main">
        {!ready ? (
          <p className="empty">Chargement…</p>
        ) : tab === 'today' ? (
          <TodayScreen />
        ) : tab === 'routines' ? (
          <RoutinesScreen />
        ) : tab === 'add' ? (
          <AddScreen onDone={goToday} />
        ) : tab === 'history' ? (
          <HistoryScreen />
        ) : (
          <SettingsScreen onToast={showToast} />
        )}
      </main>
      <Toast message={toast} />
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
