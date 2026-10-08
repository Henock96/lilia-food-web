import { ApiError } from '@lilia/api-client';
import type { PaymentMode, RefundStatus } from '@lilia/types';

import { isApprovalRequested } from './approvals-view';
import { mfaDemand } from './mfa';

/**
 * R-01 — les quatre issues d'un geste sur un remboursement.
 *
 * - `SUCCESS` : le serveur a fait le geste ;
 * - `APPROVAL_REQUIRED` : au-delà du seuil, RIEN n'a changé — un second
 *   administrateur doit approuver (écran Approbations) ;
 * - `MFA` : le serveur exige la double authentification ; la fenêtre de
 *   réauthentification (ou le message d'inscription) est déclenchée une fois
 *   pour toutes par le `MutationCache` (`lib/query-client.ts`) — l'écran ne
 *   doit pas y superposer une erreur générique ;
 * - `FORBIDDEN` / `ERROR` : refus du serveur, avec SON message.
 *
 * Une demande d'approbation arrive en 2xx : la lire comme un succès ferait
 * croire au client remboursé, comme une erreur ferait relancer le geste.
 */
export type RefundOutcome =
  | { kind: 'SUCCESS'; message?: string }
  | { kind: 'APPROVAL_REQUIRED'; message: string }
  | { kind: 'MFA' }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'ERROR'; message: string };

export const APPROVAL_REQUIRED_MESSAGE =
  'Ce remboursement nécessite l’approbation d’un autre administrateur. ' +
  'Demande envoyée (écran Approbations) : rien ne change d’ici là.';

export function refundResultOutcome(result: unknown): RefundOutcome {
  if (isApprovalRequested(result)) {
    return { kind: 'APPROVAL_REQUIRED', message: APPROVAL_REQUIRED_MESSAGE };
  }
  const message =
    result && typeof result === 'object'
      ? (result as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && message
    ? { kind: 'SUCCESS', message }
    : { kind: 'SUCCESS' };
}

export function refundErrorOutcome(error: unknown): RefundOutcome {
  if (mfaDemand(error)) return { kind: 'MFA' };
  if (error instanceof ApiError) {
    const message = error.message || 'Le serveur a refusé ce geste.';
    return error.status === 403
      ? { kind: 'FORBIDDEN', message }
      : { kind: 'ERROR', message };
  }
  return {
    kind: 'ERROR',
    message:
      'Impossible de joindre le serveur. Vérifiez la file avant de relancer.',
  };
}

/**
 * Proposer « Virer au client » ? Seulement sur une dette en attente, et quand
 * le rail de paiement sait verser (`PAWAPAY`) : en mode manuel, le serveur
 * refuse (400) et la dette se solde à la main puis se clôture.
 * Ce n'est pas un contrôle d'accès — le serveur revérifie tout.
 */
export function canTransferRefund(
  refund: { status: RefundStatus; providerRefundId?: string | null },
  mode: PaymentMode | undefined,
): boolean {
  return (
    refund.status === 'PENDING' && !refund.providerRefundId && mode === 'PAWAPAY'
  );
}

/**
 * Issue d'un remboursement composé (`POST /admin/orders/:id/refunds`) : le
 * remboursement est toujours ENREGISTRÉ ; seule l'exécution varie.
 */
export function composedRefundOutcome(execution: {
  executed: boolean;
  message: string;
  approvalRequired?: boolean;
}): { kind: 'SENT' } | { kind: 'APPROVAL_REQUIRED'; message: string } | { kind: 'QUEUED'; message: string } {
  if (execution.executed) return { kind: 'SENT' };
  if (execution.approvalRequired === true) {
    return { kind: 'APPROVAL_REQUIRED', message: APPROVAL_REQUIRED_MESSAGE };
  }
  return { kind: 'QUEUED', message: execution.message };
}
