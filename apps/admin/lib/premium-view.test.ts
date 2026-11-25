import { describe, expect, it } from 'vitest';
import { subscriptionPaymentPollMs } from '@lilia/api-client';

import {
  blockedReasonLabel,
  durationLabel,
  failureLabel,
  isStalePending,
  paymentStatusLabel,
  paymentTone,
} from './premium-view';

describe('premium-view', () => {
  it('nomme les durées proposées par le serveur', () => {
    expect(durationLabel(1)).toBe('1 mois');
    expect(durationLabel(3)).toBe('3 mois');
    expect(durationLabel(12)).toBe('12 mois (1 an)');
  });

  it('explique un blocage serveur, et rien sinon', () => {
    expect(blockedReasonLabel('VENDOR_NOT_APPROVED')).toMatch(/validée/);
    expect(blockedReasonLabel('ONLINE_PAYMENT_UNAVAILABLE')).toMatch(/indisponible/);
    expect(blockedReasonLabel(null)).toBeNull();
  });

  it('état d’un paiement : pas de « Premium activé » sans mois ouverts', () => {
    expect(paymentStatusLabel({ status: 'SUCCESS', grantedAt: '2026-11-25T10:00:00Z' })).toBe(
      'Payé — Premium activé',
    );
    expect(paymentStatusLabel({ status: 'SUCCESS', grantedAt: null })).toBe('Payé');
    expect(paymentStatusLabel({ status: 'PENDING', grantedAt: null })).toMatch(/téléphone/);
    expect(paymentTone({ status: 'FAILED' })).toBe('failed');
  });

  it('motif d’échec lisible, code inconnu conservé', () => {
    expect(failureLabel('INSUFFICIENT_BALANCE')).toBe('Solde insuffisant.');
    expect(failureLabel('TRANSACTION_TIMEOUT')).toMatch(/à temps/);
    // Clôture par délai : le paiement peut encore aboutir — pas d'invitation
    // à repayer sans mise en garde.
    expect(failureLabel('RECONCILIATION_TIMEOUT')).toMatch(/ne payez pas une seconde fois/);
    expect(failureLabel('XYZ')).toContain('XYZ');
    expect(failureLabel(null)).toBeNull();
  });

  it('suivi : 3 s, puis 5 s, puis 30 s tant que le serveur n’a pas tranché', () => {
    const t0 = Date.parse('2026-11-25T10:00:00Z');
    const p = { status: 'PENDING' as const, createdAt: '2026-11-25T10:00:00Z' };
    expect(subscriptionPaymentPollMs(p, t0 + 10_000)).toBe(3_000);
    expect(subscriptionPaymentPollMs(p, t0 + 90_000)).toBe(5_000);
    expect(subscriptionPaymentPollMs(p, t0 + 200_000)).toBe(30_000);
    expect(isStalePending(p, t0 + 200_000)).toBe(true);
    expect(subscriptionPaymentPollMs({ ...p, status: 'SUCCESS' }, t0)).toBe(false);
    expect(subscriptionPaymentPollMs({ ...p, createdAt: 'illisible' }, t0)).toBe(false);
  });
});
