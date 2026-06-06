import type { Routine } from '../types';
import { logger } from './logger';

const SCOPE = 'notifications';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permissionState(): PermissionState {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    const res = await Notification.requestPermission();
    logger.info(SCOPE, 'Permission notifications', { result: res });
    return res as PermissionState;
  } catch (e) {
    logger.error(SCOPE, 'Echec demande de permission', { error: String(e) });
    return permissionState();
  }
}

/**
 * Affiche la notification locale d'une routine.
 * Utilise le Service Worker (boutons d'action) si disponible, sinon repli sur
 * l'API Notification simple. Les actions FAIT/PLUS TARD/PAUSE sont gérées par
 * le Service Worker (voir public/sw-actions.js, fusionné par Workbox).
 */
export async function showRoutineNotification(routine: Routine): Promise<void> {
  if (permissionState() !== 'granted') {
    logger.warn(SCOPE, 'Notification ignorée : permission non accordée', { id: routine.id });
    return;
  }

  const title = '🧠 Routine Cognitive';
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: routine.title,
    tag: `routine-${routine.id}`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { routineId: routine.id },
    actions: [
      { action: 'done', title: 'FAIT' },
      { action: 'later', title: 'PLUS TARD' },
      { action: 'pause', title: 'PAUSE' },
    ],
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return;
    }
  } catch (e) {
    logger.warn(SCOPE, 'Repli sur Notification simple', { error: String(e) });
  }
  // Repli : pas de boutons d'action mais la notification s'affiche.
  // eslint-disable-next-line no-new
  new Notification(title, { body: routine.title, tag: options.tag, icon: options.icon });
}
