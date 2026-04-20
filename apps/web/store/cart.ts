'use client';

import { create } from 'zustand';

interface CartUIState {
  isOpen: boolean;
  itemCount: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setItemCount: (count: number) => void;
}

export const useCartStore = create<CartUIState>()((set) => ({
  isOpen: false,
  itemCount: 0,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setItemCount: (itemCount) => set({ itemCount }),
}));
