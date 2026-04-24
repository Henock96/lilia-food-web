'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@lilia/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  firebaseDisplayName: string | null;
  firebasePhotoUrl: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setFirebaseProfile: (name: string | null, photoUrl: string | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      firebaseDisplayName: null,
      firebasePhotoUrl: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setFirebaseProfile: (firebaseDisplayName, firebasePhotoUrl) =>
        set({ firebaseDisplayName, firebasePhotoUrl }),
      signOut: () => set({ user: null, token: null, firebaseDisplayName: null, firebasePhotoUrl: null }),
    }),
    {
      name: 'lilia-auth',
      partialize: (state) => ({ user: state.user }),
      skipHydration: true,
    },
  ),
);
