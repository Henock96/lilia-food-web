'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@lilia/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      signOut: () => set({ user: null, token: null }),
    }),
    {
      name: 'lilia-auth',
      partialize: (state) => ({ user: state.user }),
      skipHydration: true,
    },
  ),
);
