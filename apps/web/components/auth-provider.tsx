'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { discardLegacyAuth, useAuthStore } from '@/store/auth';
import { getBrowserSession } from '@/lib/auth-session';
import * as Sentry from '@sentry/nextjs';
import { API_URL, sessionFetch, assertCurrentSession, type AuthCredential } from '@lilia/api-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  // Contexte Sentry : suit l'utilisateur du store (login/logout depuis n'importe où).
  useEffect(() => {
    Sentry.setUser(
      user ? { id: user.id, email: user.email, role: user.role } : null,
    );
  }, [user]);

  useEffect(() => {
    try { discardLegacyAuth(window.localStorage); } catch { /* Storage denied. */ }
    const controller = getBrowserSession();
    let mounted = true;
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      if (mounted) void controller.acceptUser(firebaseUser);
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  return <>{children}</>;
}

/**
 * Upload une image vers Cloudinary via le backend.
 * Réutilisable depuis n'importe quelle page (profil, inscription, etc.)
 */
export async function uploadToCloudinary(
  file: File,
  token: AuthCredential,
  folder = 'users',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const res = await sessionFetch(`${API_URL}/upload/image?folder=${folder}`, token, {
    method: 'POST',
    body: form,
  });
  assertCurrentSession(token);

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      assertCurrentSession(token);
      detail = json.message ?? json.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
      assertCurrentSession(token);
    }
    throw new Error(`Upload échoué (${res.status})${detail ? ': ' + detail : ''}`);
  }

  const json = await res.json();
  assertCurrentSession(token);
  const url: string | undefined = json.url ?? json.data?.url;
  if (!url) throw new Error('URL manquante dans la réponse Cloudinary');
  return url;
}
