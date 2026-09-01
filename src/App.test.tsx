import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { App } from './App';
import * as db from './db/database';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  db._resetDbForTests();
});

describe('App — flux utilisateur (intégration)', () => {
  it('précharge les routines et les affiche dans Aujourd’hui', async () => {
    render(<App />);
    // Les 15 routines préchargées doivent apparaître.
    await waitFor(() => {
      expect(screen.getByText('Eau froide visage')).toBeInTheDocument();
    });
    expect(screen.getByText('Mot du jour')).toBeInTheDocument();
  });

  it('marquer FAIT déplace la routine vers Réalisées', async () => {
    const user = userEvent.setup();
    render(<App />);
    const card = await screen.findByText('Eau froide visage');
    const article = card.closest('article')!;
    await user.click(within(article).getByRole('button', { name: 'FAIT' }));

    await waitFor(() => {
      expect(screen.getByText('Réalisées')).toBeInTheDocument();
    });
    // Le badge "Faite" est désormais présent.
    expect(screen.getByText('✅ Faite')).toBeInTheDocument();
  });

  it('navigue vers Mes routines via la barre inférieure', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Eau froide visage');
    await user.click(screen.getByRole('button', { name: /Routines/ }));
    await waitFor(() => {
      expect(screen.getByText('Actives')).toBeInTheDocument();
    });
  });
});
