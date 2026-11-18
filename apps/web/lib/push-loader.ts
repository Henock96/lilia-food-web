import type { PushDevice } from '@lilia/api-client';

/**
 * Faux sans clé VAPID : rien à proposer, pas même l'aide iPhone.
 *
 * Lu directement, et non via `./env` : ce module est importé par des
 * composants présents sur toutes les pages, et `env.ts` lève au chargement
 * sans configuration Firebase complète (tests de rendu, build sans secrets).
 */
export const pushConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

/**
 * Charge `lib/push.ts` à la demande : `firebase/messaging` reste hors du bundle
 * initial, et n'est téléchargé que par un navigateur qui s'en sert.
 */
export async function loadBrowserPush(): Promise<PushDevice> {
  return (await import('./push')).browserPush();
}
