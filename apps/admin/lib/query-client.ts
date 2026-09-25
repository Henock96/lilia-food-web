import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mfaDemand } from './mfa';
import { useStepUpStore } from '@/store/step-up';

/**
 * F3-08 — un geste refusé pour une raison d'authentification forte appelle
 * une seule réponse, quelle que soit la page : réauthentification
 * (`MFA_STEP_UP_REQUIRED`), ou inscription à la double authentification
 * (`MFA_REQUIRED`). Branché une fois ici plutôt que sur chaque mutation.
 */
function onMutationError(error: unknown) {
  const demand = mfaDemand(error);
  if (demand === 'STEP_UP') useStepUpStore.getState().request();
  if (demand === 'ENROLL') {
    toast.error(
      'Ce geste exige la double authentification. Activez-la depuis « Mon profil ».',
    );
  }
}

export function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({ onError: onMutationError }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
