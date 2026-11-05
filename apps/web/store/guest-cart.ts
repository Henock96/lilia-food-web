'use client';

import { create } from 'zustand';
import {
  addGuestLine,
  readGuestCart,
  setGuestLineQuantity,
  writeGuestCart,
  type GuestCartLine,
} from '@/lib/guest-cart';

type Adoption = 'idle' | 'running' | 'failed';

interface GuestCartState {
  lines: GuestCartLine[];
  adoption: Adoption;
  /** Relit le stockage : au montage, et quand un autre onglet l'a modifié. */
  hydrate: () => void;
  add: (line: GuestCartLine) => 'added' | 'other_vendor' | 'limit';
  /** « Vider et ajouter ». */
  replaceWith: (line: GuestCartLine) => void;
  setQuantity: (id: string, quantite: number) => void;
  setLines: (lines: GuestCartLine[]) => void;
  setAdoption: (adoption: Adoption) => void;
  clear: () => void;
}

export const useGuestCartStore = create<GuestCartState>()((set, get) => {
  const persist = (lines: GuestCartLine[]) => {
    writeGuestCart(lines);
    set({ lines });
  };
  return {
    lines: [],
    adoption: 'idle',
    hydrate: () => set({ lines: readGuestCart() }),
    add: (line) => {
      const result = addGuestLine(get().lines, line);
      if (result.status === 'added') persist(result.lines);
      return result.status;
    },
    replaceWith: (line) => persist([line]),
    setQuantity: (id, quantite) => persist(setGuestLineQuantity(get().lines, id, quantite)),
    setLines: persist,
    setAdoption: (adoption) => set({ adoption }),
    clear: () => {
      persist([]);
      set({ adoption: 'idle' });
    },
  };
});
