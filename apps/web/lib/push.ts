'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { createBrowserPushDevice, type PushDevice } from '@lilia/api-client';
import { app } from './firebase';
import { clientEnv } from './env';

let device: PushDevice | undefined;

/** Notifications push de ce navigateur — voir `@lilia/api-client` push-registration. */
export function browserPush(): PushDevice {
  device ??= createBrowserPushDevice({
    vapidKey: clientEnv.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    firebaseSupported: isSupported,
    fcmToken: (serviceWorkerRegistration, vapidKey) =>
      getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration }),
  });
  return device;
}
