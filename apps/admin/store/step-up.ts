'use client';

import { create } from 'zustand';

/**
 * F3-08 — le serveur a refusé un geste financier faute d'authentification
 * récente (401 `MFA_STEP_UP_REQUIRED`). Une fenêtre globale redemande le mot
 * de passe et le code, puis l'administrateur relance son geste.
 */
interface StepUpState {
  open: boolean;
  request: () => void;
  close: () => void;
}

export const useStepUpStore = create<StepUpState>((set) => ({
  open: false,
  request: () => set({ open: true }),
  close: () => set({ open: false }),
}));
