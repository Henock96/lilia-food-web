'use client';

import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { getBrowserSession, sessionIsReady, useAuthSession } from '@/lib/auth-session';

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const state = useAuthSession();
  if (sessionIsReady(state)) return children;
  if (state.isLoading) return <p role="status" className="p-8 text-center">Vérification de votre session…</p>;
  return (
    <div className="p-8 text-center" role="status">
      <p>{state.error ?? 'Connectez-vous pour accéder à votre espace personnel.'}</p>
      {state.phase === 'error' ? (
        <button className="mt-4 underline" onClick={() => void getBrowserSession().acceptUser(auth.currentUser)}>
          Réessayer
        </button>
      ) : <Link href="/connexion" className="mt-4 inline-block underline">Se connecter</Link>}
    </div>
  );
}
