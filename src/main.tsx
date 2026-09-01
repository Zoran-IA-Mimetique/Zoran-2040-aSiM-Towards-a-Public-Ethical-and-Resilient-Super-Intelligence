import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { logger } from './lib/logger';
import './styles.css';

// Enregistrement du Service Worker (PWA). autoUpdate via vite-plugin-pwa.
registerSW({
  immediate: true,
  onRegisteredSW(url) {
    logger.info('pwa', 'Service Worker enregistré', { url });
  },
  onRegisterError(error) {
    logger.error('pwa', 'Echec enregistrement Service Worker', { error: String(error) });
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
