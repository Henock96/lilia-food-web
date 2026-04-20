'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@lilia/api-client';
import type { User } from '@lilia/types';

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
