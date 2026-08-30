import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { assertFirebaseEnv } from './env';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy init — safe for SSR/build without env vars.
// La validation est faite ici, au moment où Firebase est réellement requis,
// et non au chargement du module : cela préserve la propriété ci-dessus (le
// build et le rendu serveur n'ont pas besoin des secrets) tout en produisant
// un message exploitable au lieu d'un `auth/invalid-api-key` opaque.
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0]!;
  assertFirebaseEnv();
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
