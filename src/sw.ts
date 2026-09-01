/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Précache des assets de l'app (injecté par Workbox au build).
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  void self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Gestion des actions de notification FAIT / PLUS TARD / PAUSE.
 * On relaie l'action vers les clients ouverts ; si aucun n'est ouvert,
 * on ouvre l'application. Le client applique la mise à jour en IndexedDB.
 */
self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  const routineId = (event.notification.data as { routineId?: string })?.routineId;
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const payload = { type: 'routine-action', action, routineId };

      if (allClients.length > 0) {
        const client = allClients[0];
        client.postMessage(payload);
        if ('focus' in client) await client.focus();
        return;
      }
      // Aucun onglet ouvert : on ouvre l'app (l'action sera rejouée si besoin).
      const opened = await self.clients.openWindow('./');
      if (opened) opened.postMessage(payload);
    })(),
  );
});
