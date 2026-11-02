'use client';

import { ApiError } from '@lilia/api-client';

/** A failed read is never presented as a missing order or a new order status. */
export function OrderSyncNotice({ hasOrder, error, paused, fetching, onRetry }: {
  hasOrder: boolean;
  error: unknown;
  paused: boolean;
  fetching: boolean;
  onRetry(): void;
}) {
  const unavailable = error instanceof ApiError && [401, 403, 404].includes(error.status);
  const message = error instanceof ApiError && error.status === 404
    ? 'Commande introuvable.'
    : unavailable
      ? 'Cette commande n’est pas accessible. Vérifiez votre connexion au compte.'
      : paused
        ? 'Connexion interrompue. Le suivi reprendra au retour du réseau.'
        : 'Impossible d’actualiser la commande pour le moment.';
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm text-amber-900">
      <p>{message}</p>
      {hasOrder && !unavailable && <p className="mt-1">Le dernier état connu est affiché ; il peut avoir changé.</p>}
      {!unavailable && (
        <button type="button" onClick={onRetry} disabled={fetching}
          className="mt-2 min-h-11 underline font-semibold disabled:opacity-50">
          {fetching ? 'Actualisation…' : 'Réessayer le suivi'}
        </button>
      )}
    </div>
  );
}
