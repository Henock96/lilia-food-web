'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
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
  const { setUser, setToken, setLoading } = useAuthStore();

  // Hydrate Zustand persist from localStorage (skipHydration: true prevents SSR access)
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setToken(token);
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;

          const user = await syncWithRetry(
            token,
            firebaseUser.email,
            firebaseUser.displayName,
            firebaseUser.photoURL,
          );
          setUser(user);
        } catch {
          // Sync impossible même après ~37s de retries (backend down ?)
          // On garde le token pour que les requêtes authentifiées fonctionnent
          // mais user reste null → l'app affiche l'état "non connecté"
          setUser(null);
        }
      } else {
        setUser(null);
        setToken(null);
        document.cookie = 'firebase-token=; path=/; max-age=0';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setToken, setLoading]);

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
