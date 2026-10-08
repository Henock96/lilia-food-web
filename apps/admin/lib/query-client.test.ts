import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@lilia/api-client';

import { useStepUpStore } from '@/store/step-up';
import { makeQueryClient } from './query-client';

/**
 * R-01 — vérification du step-up MFA existant (F3-08), pas d'évolution.
 *
 * Un geste financier refusé en 401 `MFA_STEP_UP_REQUIRED` doit ouvrir la
 * fenêtre de réauthentification, quelle que soit la page — c'est ce qui
 * permet à l'écran Remboursements de ne PAS afficher d'erreur générique
 * (`refundErrorOutcome` → `MFA`). Le branchement vivait dans le
 * `MutationCache` sans aucun test.
 */
describe('MutationCache — demandes de double authentification', () => {
  afterEach(() => useStepUpStore.getState().close());

  async function failWith(error: unknown) {
    const client = makeQueryClient();
    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () => Promise.reject(error),
      })
      .execute(undefined)
      .catch(() => undefined);
  }

  it('401 MFA_STEP_UP_REQUIRED : la fenêtre de réauthentification s’ouvre', async () => {
    await failWith(
      new ApiError(401, 'Confirmez votre identité', 'MFA_STEP_UP_REQUIRED'),
    );
    expect(useStepUpStore.getState().open).toBe(true);
  });

  it('403 MFA_REQUIRED (admin non enrôlé) : pas de fenêtre — aucune boucle de réauthentification', async () => {
    // Réauthentifier un compte sans second facteur ne lèverait jamais le
    // refus : le serveur exige l'inscription. Ouvrir la fenêtre ici ferait
    // tourner l'administrateur en rond.
    await failWith(new ApiError(403, 'Activez la double authentification', 'MFA_REQUIRED'));
    expect(useStepUpStore.getState().open).toBe(false);
  });

  it('une autre erreur (409, 5xx) n’ouvre rien', async () => {
    await failWith(new ApiError(409, 'Déjà clos'));
    await failWith(new ApiError(500, 'Erreur'));
    expect(useStepUpStore.getState().open).toBe(false);
  });
});
