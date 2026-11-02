'use client';

import { create } from 'zustand';
import { INITIAL_SESSION, type SessionState } from '@/lib/auth-session-controller';

// Display-only projection. No token or persisted, unverified profile.
export const useAuthStore = create<SessionState>()(() => ({ ...INITIAL_SESSION }));

export function discardLegacyAuth(storage: Pick<Storage, 'removeItem'>): void {
  try { storage.removeItem('lilia-auth'); } catch { /* Storage can be denied. */ }
}
