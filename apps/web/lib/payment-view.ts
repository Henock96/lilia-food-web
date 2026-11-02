import type { PaymentStatusView } from '@lilia/types';

export function paymentView(input: {
  payment: PaymentStatusView | null | undefined;
  allowed: boolean | undefined;
  loading: boolean;
  fetching: boolean;
  failedRead: boolean;
  attemptUnverified: boolean;
}): 'success' | 'pending' | 'error' | 'checking' | 'unavailable' | 'form' {
  if (input.payment?.status === 'SUCCESS') return 'success';
  if (input.payment?.status === 'PENDING') return 'pending';
  if (input.loading || input.fetching) return 'checking';
  if (input.failedRead || input.attemptUnverified || input.payment === undefined) return 'error';
  if (input.allowed !== true) return 'unavailable';
  if (input.payment === null || ['FAILED', 'CANCELLED'].includes(input.payment.status)) return 'form';
  return 'error';
}

/** A lost POST cannot be disproved by a later null/old failed read. */
export interface PaymentAttemptEvidence {
  previousPaymentId: string | null;
  paymentId?: string;
  pending?: PaymentStatusView;
}

export function reconcilePaymentAttempt(
  attempt: PaymentAttemptEvidence | null,
  payment: PaymentStatusView | null | undefined,
): { payment: PaymentStatusView | null | undefined; unresolved: boolean } {
  if (!attempt) return { payment, unresolved: false };
  const matches = !!payment && (attempt.paymentId
    ? payment.paymentId === attempt.paymentId
    : payment.paymentId !== attempt.previousPaymentId);
  if (matches) return { payment, unresolved: false };
  // Without a server operation identifier, absence cannot prove non-creation.
  // Keep manual verification available, never unlock another POST on null.
  return { payment: attempt.pending, unresolved: true };
}
