import { releasePush, type PushDevice } from '@lilia/api-client';

/** Faux sans clé VAPID : rien à proposer, pas même l'aide iPhone. */
export const pushConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

/**
 * Charge `lib/push.ts` à la demande : `firebase/messaging` reste hors du bundle
 * initial, et n'est téléchargé que par un navigateur qui s'en sert.
 */
export async function loadBrowserPush(): Promise<PushDevice> {
  return (await import('./push')).browserPush();
}

/**
 * Désinscrit ce navigateur avant `signOut(Firebase)`, tant que `token` est
 * encore valable. Borné et sans erreur : ne retarde la déconnexion que de
 * quelques secondes au pire, et ne l'empêche jamais.
 */
export async function releaseBrowserPush(token: string | null): Promise<void> {
  if (!pushConfigured) return;
  try {
    await releasePush(await loadBrowserPush(), token);
  } catch {
    // Chargement du module impossible (hors ligne) : rien de plus à faire.
  }
}
