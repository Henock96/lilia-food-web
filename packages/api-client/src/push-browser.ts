import type { PushDevice, PushPermission, RememberedPushToken } from './push-registration';

/**
 * `PushDevice` du navigateur, commun au site client et à l'administration.
 *
 * Firebase reste dans les applications (chacune initialise son `FirebaseApp`) :
 * elles fournissent `fcmToken` et `firebaseSupported`, ce module fournit le
 * reste — service worker, permission, mémoire du jeton.
 */

/** Servi par `public/push-sw.js` de chaque application. */
export const PUSH_SERVICE_WORKER_URL = '/push-sw.js';
const STORAGE_KEY = 'lilia_push_token';

export interface BrowserPushOptions {
  vapidKey: string | undefined;
  firebaseSupported(): Promise<boolean>;
  fcmToken(registration: ServiceWorkerRegistration, vapidKey: string): Promise<string>;
}

export function createBrowserPushDevice(options: BrowserPushOptions): PushDevice {
  const { vapidKey } = options;

  return {
    async supported() {
      if (typeof window === 'undefined' || !vapidKey) return false;
      if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
        return false;
      }
      try {
        return await options.firebaseSupported();
      } catch {
        return false;
      }
    },

    permission: () => Notification.permission as PushPermission,

    requestPermission: async () => (await Notification.requestPermission()) as PushPermission,

    async getToken() {
      if (!vapidKey) throw new Error('Clé VAPID absente.');
      const registration = await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: '/' });
      return options.fcmToken(registration, vapidKey);
    },

    async deleteToken() {
      // Désabonnement direct, sans `deleteToken` de Firebase : celui-ci tente
      // d'enregistrer `/firebase-messaging-sw.js` (absent) quand la page n'a
      // pas encore appelé `getToken`. Sans abonnement, FCM répond
      // « not registered » et le backend purge le jeton au prochain envoi.
      const registration = await navigator.serviceWorker.getRegistration(PUSH_SERVICE_WORKER_URL);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
    },

    remembered() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<RememberedPushToken>;
        return typeof value.uid === 'string' && typeof value.token === 'string'
          ? { uid: value.uid, token: value.token }
          : null;
      } catch {
        return null;
      }
    },

    remember(value) {
      try {
        if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Stockage indisponible (navigation privée) : on ré-enregistrera au
        // prochain chargement, ce qui est sans effet côté serveur (upsert).
      }
    },
  };
}

/**
 * Safari iPhone/iPad hors écran d'accueil : le push web n'y existe que pour un
 * site installé (iOS ≥ 16.4). Sert à expliquer, pas à décider.
 */
export function isIosBrowserTab(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export type PushMessage =
  | { source: 'lilia-push'; title: string; body: string; data: Record<string, string> }
  | { source: 'lilia-push-open'; data: Record<string, string> };

/** Messages envoyés par `push-sw.js` aux onglets ouverts. */
export function readPushMessage(value: unknown): PushMessage | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const data: Record<string, string> = {};
  if (v.data && typeof v.data === 'object') {
    for (const [key, item] of Object.entries(v.data as Record<string, unknown>)) {
      if (typeof item === 'string') data[key] = item;
    }
  }
  if (v.source === 'lilia-push-open') return { source: 'lilia-push-open', data };
  if (v.source === 'lilia-push' && typeof v.title === 'string') {
    return { source: 'lilia-push', title: v.title, body: typeof v.body === 'string' ? v.body : '', data };
  }
  return null;
}
