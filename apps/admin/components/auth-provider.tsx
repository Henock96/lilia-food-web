'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';

/**
 * Admin AuthProvider — gestion du token uniquement.
 * Le sync backend est fait directement dans la page connexion,
 * pour éviter une race condition (double sync concurrent).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setToken, setLoading, signOut } = useAuthStore();

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setToken(token);
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
        } catch {
          // token refresh impossible
        }
      } else {
        // Firebase session terminée (déconnexion ou expiration)
        signOut();
        document.cookie = 'firebase-token=; path=/; max-age=0';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setToken, setLoading, signOut]);

  return <>{children}</>;
}
