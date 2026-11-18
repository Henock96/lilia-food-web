'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { createBrowserPushDevice, type PushDevice } from '@lilia/api-client';
import { getFirebaseApp } from './firebase';

// Référencée statiquement : Next ne remplace pas un accès dynamique.
// Absente, les notifications push sont masquées.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;

let device: PushDevice | undefined;

/** Notifications push de ce navigateur — voir `@lilia/api-client` push-registration. */
export function browserPush(): PushDevice {
  device ??= createBrowserPushDevice({
    vapidKey: VAPID_KEY,
    firebaseSupported: isSupported,
    fcmToken: (serviceWorkerRegistration, vapidKey) =>
      getToken(getMessaging(getFirebaseApp()), { vapidKey, serviceWorkerRegistration }),
  });
  return device;
}
