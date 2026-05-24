'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import * as Sentry from '@sentry/nextjs';
import { apiClient, API_URL } from '@lilia/api-client';
import type { User } from '@lilia/types';

/**
 * Retry avec backoff exponentiel.
 * Delais : 0s → 2s → 5s → 10s → 20s (total ≈ 37s)
 * Suffisant pour réveiller un backend Render free-tier (~30s cold start).
 */
async function syncWithRetry(
  token: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
): Promise<User> {
  const delays = [0, 2000, 5000, 10000, 20000];
  let lastError: unknown;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    try {
      const syncRes = await apiClient<{ user: User } | User>('/users/sync', {
        method: 'POST',
        token,
        body: JSON.stringify({ email, nom: displayName, imageUrl: photoURL }),
      });
      return ('user' in syncRes ? syncRes.user : syncRes) as User;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setToken, setLoading, setFirebaseProfile } = useAuthStore();

  // Hydrate Zustand persist from localStorage (skipHydration: true prevents SSR access)
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  // Contexte Sentry : suit l'utilisateur du store (login/logout depuis n'importe où).
  useEffect(() => {
    Sentry.setUser(
      user ? { id: user.id, email: user.email, role: user.role } : null,
    );
  }, [user]);

  useEffect(() => {
    // `onIdTokenChanged` fire à la connexion, déconnexion ET à chaque refresh
    // automatique du token Firebase (~1h). `onAuthStateChanged` ne fire pas au
    // refresh → le cookie expirait après 1h et le middleware redirigeait vers
    // /connexion alors que la session Firebase était encore valide (LIL-97).
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setToken(token);
          setFirebaseProfile(firebaseUser.displayName, firebaseUser.photoURL);
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;

          // Sync backend uniquement quand on n'a pas encore de user en store
          // (évite un POST /users/sync à chaque refresh de token).
          if (!useAuthStore.getState().user) {
            const user = await syncWithRetry(
              token,
              firebaseUser.email,
              firebaseUser.displayName,
              firebaseUser.photoURL,
            );
            setUser(user);
          }
        } catch {
          // Sync impossible — ne pas effacer user (peut être dans localStorage)
        }
      } else {
        setUser(null);
        setToken(null);
        setFirebaseProfile(null, null);
        document.cookie = 'firebase-token=; path=/; max-age=0';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setToken, setLoading, setFirebaseProfile]);

  return <>{children}</>;
}

/**
 * Upload une image vers Cloudinary via le backend.
 * Réutilisable depuis n'importe quelle page (profil, inscription, etc.)
 */
export async function uploadToCloudinary(
  file: File,
  token: string,
  folder = 'users',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/upload/image?folder=${folder}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      detail = json.message ?? json.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Upload échoué (${res.status})${detail ? ': ' + detail : ''}`);
  }

  const json = await res.json();
  const url: string | undefined = json.url ?? json.data?.url;
  if (!url) throw new Error('URL manquante dans la réponse Cloudinary');
  return url;
}
