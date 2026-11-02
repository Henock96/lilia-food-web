'use client';

import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { apiClient, ApiError, type AuthCredential } from '@lilia/api-client';
import type { User } from '@lilia/types';
import { toast } from 'sonner';
import { auth } from './firebase';
import { AuthSessionController, type Identity, type SessionState } from './auth-session-controller';
import { reconcileSessionCookie } from './session';
import { retireQueryClient } from './query-client';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

let browserSession: AuthSessionController | undefined;

export function getBrowserSession(): AuthSessionController {
  if (typeof window === 'undefined') throw new Error('Session navigateur uniquement.');
  browserSession ??= new AuthSessionController({
    currentUser: () => auth.currentUser,
    signOut: () => signOut(auth),
    cookie: reconcileSessionCookie,
    publish: (state) => useAuthStore.setState(state),
    resetPrivateState: () => {
      retireQueryClient();
      useCartStore.setState({ isOpen: false, itemCount: 0 });
      toast.dismiss();
    },
    syncProfile,
  });
  return browserSession;
}

async function syncProfile(user: Identity, token: string, signal: AbortSignal, details?: Record<string, string>): Promise<User> {
  const delays = [0, 2000, 5000, 10000, 20000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await abortableDelay(delays[attempt], signal);
    signal.throwIfAborted();
    try {
      const result = await apiClient<{ user: User } | User>('/users/sync', {
        method: 'POST', token, signal,
        body: JSON.stringify({ email: user.email, nom: user.displayName, imageUrl: user.photoURL, ...details }),
      });
      signal.throwIfAborted();
      return 'user' in result ? result.user : result;
    } catch (error) {
      signal.throwIfAborted();
      if (attempt === delays.length - 1 || (error instanceof ApiError && error.status < 500)) throw error;
    }
  }
  throw new Error('Synchronisation indisponible.');
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function useAuthSession() {
  const state = useAuthStore();
  const session = typeof window === 'undefined' ? undefined : getBrowserSession();
  return {
    ...state,
    token: (session?.getCredential() ?? null) as AuthCredential | null,
    isLoading: ['loading', 'authenticating', 'syncing'].includes(state.phase),
    setUser: (user: User) => session?.updateProfile(user, state),
    logout: () => session?.logout() ?? Promise.resolve(false),
  };
}

/** Protect local state, notifications and navigation, including after unmount. */
export function useSessionGuard(): () => boolean {
  const { uid, generation } = useAuthStore();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return () => mounted.current && getBrowserSession().isCurrent({ uid, generation });
}

export function useAuthenticationGuard(): (ticket: number, user?: Identity) => boolean {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return (ticket, user) => mounted.current && getBrowserSession().authenticationCurrent(ticket, user);
}

export function sessionIsReady(state: SessionState): boolean {
  return state.phase === 'ready' && state.user !== null && state.uid !== null;
}
