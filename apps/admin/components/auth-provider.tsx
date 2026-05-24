'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import * as Sentry from '@sentry/nextjs';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';

/**
 * Admin AuthProvider — gestion du token uniquement.
 * Le sync backend est fait directement dans la page connexion,
 * pour éviter une race condition (double sync concurrent).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setToken, setLoading, signOut } = useAuthStore();

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  // Contexte Sentry : suit l'utilisateur du store (login depuis la page connexion,
  // logout depuis la sidebar ou l'expiration de session Firebase).
  useEffect(() => {
    Sentry.setUser(
      user ? { id: user.id, email: user.email, role: user.role } : null,
    );
  }, [user]);

  useEffect(() => {
    // `onIdTokenChanged` fire aussi au refresh auto Firebase (~1h) — sans ça,
    // le cookie expirait et le middleware éjectait l'admin actif (LIL-97).
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (firebaseUser) => {
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
