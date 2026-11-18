import type { AuthCredential } from './auth-session';
import { apiClient } from './client';

/**
 * Notifications push du navigateur (FCM Web Push) — le cœur partagé par le
 * site client et l'administration.
 *
 * ## Pourquoi ce module existe
 *
 * Jusqu'au 17/11/2026, seules les trois applications Flutter enregistraient un
 * jeton FCM. Les administrateurs, qui travaillent depuis l'administration web,
 * n'en avaient **aucun** : les alertes « vendeur à valider » et « incident »
 * partaient et n'atteignaient personne (voir `AdminAlertService` côté backend).
 *
 * ## Ce qu'il fait, et ce qu'il laisse aux applications
 *
 * Il décide **quand** parler au serveur ; le navigateur et Firebase sont
 * derrière `PushDevice`, implémenté par chaque application (`lib/push.ts`).
 * Aucune route backend nouvelle : un jeton web passe par les mêmes
 * `POST /notifications/register-token` et `DELETE /notifications/token` que
 * ceux des téléphones.
 *
 * ## Les trois règles
 *
 * 1. La permission n'est **jamais** demandée hors d'un geste de l'utilisateur
 *    (`enablePush`). `syncPush`, appelé au chargement, ne fait que remettre à
 *    jour un accord déjà donné.
 * 2. Le jeton est mémorisé **avec le compte** qui l'a enregistré : un autre
 *    compte sur le même navigateur le ré-enregistre (le backend le lui
 *    transfère, M18).
 * 3. À la déconnexion, le navigateur est **désabonné localement** même si le
 *    serveur ne répond pas. C'est ce désabonnement, et non l'appel `DELETE`,
 *    qui garantit que le compte suivant ne reçoit pas les notifications du
 *    précédent : le jeton mort est purgé par le backend au premier envoi.
 */

export type PushPermission = 'default' | 'granted' | 'denied';
export type PushState = PushPermission | 'unsupported';

export interface RememberedPushToken {
  uid: string;
  token: string;
}

export interface PushDevice {
  /** Push API, service worker et clé VAPID présents. */
  supported(): Promise<boolean>;
  permission(): PushPermission;
  requestPermission(): Promise<PushPermission>;
  /** Enregistre le service worker et renvoie le jeton FCM de ce navigateur. */
  getToken(): Promise<string>;
  /** Désabonne ce navigateur chez FCM. */
  deleteToken(): Promise<void>;
  remembered(): RememberedPushToken | null;
  remember(value: RememberedPushToken | null): void;
}

export interface PushSession {
  uid: string;
  credential: AuthCredential;
}

/** Délai laissé au serveur à la déconnexion : elle ne doit pas en dépendre. */
const RELEASE_TIMEOUT_MS = 3000;

/**
 * Incrémenté par chaque `releasePush`. Une inscription commencée avant une
 * déconnexion le voit changer et s'arrête : sans quoi un `getToken` lent
 * ré-enregistrerait, après la déconnexion, le jeton du compte parti.
 */
let releases = 0;

export async function pushState(device: PushDevice): Promise<PushState> {
  if (!(await device.supported())) return 'unsupported';
  return device.permission();
}

/**
 * Remet à jour l'enregistrement d'un navigateur déjà autorisé.
 *
 * Renvoie `true` si un enregistrement a été envoyé et accepté.
 */
export async function syncPush(device: PushDevice, session: PushSession): Promise<boolean> {
  const epoch = releases;
  if (!(await device.supported()) || device.permission() !== 'granted') return false;

  const token = await device.getToken();
  if (epoch !== releases) return false;
  const known = device.remembered();
  if (known?.uid === session.uid && known.token === token) return false;

  const result = await apiClient<{ status?: string } | undefined>('/notifications/register-token', {
    method: 'POST',
    token: session.credential,
    body: JSON.stringify({ token }),
  });
  // Le backend répond 200 `user_not_found` au lieu de lever quand le profil
  // n'est pas encore synchronisé : ce n'est pas un enregistrement.
  if (result?.status !== 'success' || epoch !== releases) return false;

  device.remember({ uid: session.uid, token });
  return true;
}

/** Sur geste de l'utilisateur uniquement : peut ouvrir la demande du navigateur. */
export async function enablePush(device: PushDevice, session: PushSession): Promise<PushState> {
  if (!(await device.supported())) return 'unsupported';

  const current = device.permission();
  const permission = current === 'default' ? await device.requestPermission() : current;
  if (permission !== 'granted') return permission;

  await syncPush(device, session);
  // `syncPush` rend `false` aussi quand rien n'était à refaire : c'est la
  // mémoire qui dit si ce compte est réellement inscrit. Sans elle, l'écran
  // afficherait « activées » sans aucun jeton côté serveur.
  if (device.remembered()?.uid !== session.uid) {
    throw new Error('Inscription aux notifications non enregistrée par le serveur.');
  }
  return 'granted';
}

/**
 * À appeler **avant** la déconnexion Firebase, tant que le jeton
 * d'authentification est encore valable. Ne lève jamais.
 */
export async function releasePush(
  device: PushDevice,
  credential: AuthCredential | null,
  timeoutMs = RELEASE_TIMEOUT_MS,
): Promise<void> {
  releases++;
  try {
    const known = device.remembered();
    device.remember(null);

    if (known && credential) {
      await withTimeout(
        apiClient('/notifications/token', {
          method: 'DELETE',
          token: credential,
          body: JSON.stringify({ token: known.token }),
        }),
        timeoutMs,
      ).catch(() => undefined);
    }

    if (known || ((await device.supported()) && device.permission() === 'granted')) {
      await device.deleteToken();
    }
  } catch {
    // Une déconnexion ne doit jamais échouer à cause des notifications.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}
