import { describe, expect, it } from 'vitest';
import type { PaymentStatusView } from '@lilia/types';
import { paymentView, reconcilePaymentAttempt } from './payment-view';
const base = { payment: null, allowed: true, loading: false, fetching: false, failedRead: false, attemptUnverified: false };
const payment = (status: PaymentStatusView['status']): PaymentStatusView => ({ paymentId: 'p', orderId: 'o', status, amount: 1150, currency: 'XAF', provider: 'PAWAPAY', createdAt: '2026-11-03T12:00:00Z' });
describe('payment action is fail closed', () => {
  it.each([undefined, false])('requires an explicit server permission: %s', (allowed) => expect(paymentView({ ...base, allowed })).toBe('unavailable'));
  it('allows only confirmed absence with permission', () => expect(paymentView(base)).toBe('form'));
  it('does not confuse missing data with null', () => expect(paymentView({ ...base, payment: undefined })).toBe('error'));
  it('blocks stale absence while refetching', () => expect(paymentView({ ...base, fetching: true })).toBe('checking'));
  it('blocks an errored read even with a cached absence', () => expect(paymentView({ ...base, failedRead: true })).toBe('error'));
  it('blocks a POST with an unverified outcome', () => expect(paymentView({ ...base, attemptUnverified: true })).toBe('error'));
  it('retains pending evidence on errors without allowing another payment', () => expect(paymentView({ ...base, payment: payment('PENDING'), failedRead: true, allowed: false })).toBe('pending'));
  it('recognizes only server success as confirmed', () => expect(paymentView({ ...base, payment: payment('SUCCESS'), allowed: false })).toBe('success'));
  it.each(['FAILED', 'CANCELLED'] as const)('permits retry of %s only with permission and successful read', (status) => {
    expect(paymentView({ ...base, payment: payment(status) })).toBe('form');
    expect(paymentView({ ...base, payment: payment(status), failedRead: true })).toBe('error');
    expect(paymentView({ ...base, payment: payment(status), allowed: false })).toBe('unavailable');
  });
});

describe('POST evidence reconciliation', () => {
  it('retains the known pending payment through null and unrelated failure', () => {
    const pending = payment('PENDING');
    const attempt = { previousPaymentId: 'old', paymentId: 'p', pending };
    for (const read of [null, undefined, { ...payment('FAILED'), paymentId: 'old' }]) {
      const result = reconcilePaymentAttempt(attempt, read);
      expect(result).toEqual({ payment: pending, unresolved: true });
      expect(paymentView({ ...base, payment: result.payment, attemptUnverified: result.unresolved })).toBe('pending');
    }
    expect(reconcilePaymentAttempt(attempt, payment('FAILED')).unresolved).toBe(false);
  });
  it('keeps an unknown POST verification-only until a new payment is observed', () => {
    const attempt = { previousPaymentId: 'old' };
    for (const read of [null, { ...payment('FAILED'), paymentId: 'old' }]) {
      const result = reconcilePaymentAttempt(attempt, read);
      expect(paymentView({ ...base, payment: result.payment, attemptUnverified: result.unresolved })).toBe('error');
    }
    expect(reconcilePaymentAttempt(attempt, payment('PENDING')).unresolved).toBe(false);
    expect(reconcilePaymentAttempt(attempt, payment('FAILED')).unresolved).toBe(false);
  });
});

it('keeps a POST identifier without inventing pending timestamps through successive reads', () => {
  const attempt = { previousPaymentId: null, paymentId: 'p' };
  const pending = payment('PENDING');
  expect(reconcilePaymentAttempt(attempt, pending)).toEqual({ payment: pending, unresolved: false });
  for (const read of [null, { ...payment('FAILED'), paymentId: 'different' }, undefined]) {
    const result = reconcilePaymentAttempt(attempt, read);
    expect(result).toEqual({ payment: undefined, unresolved: true });
    expect(paymentView({ ...base, payment: result.payment, attemptUnverified: result.unresolved })).toBe('error');
  }
  expect(reconcilePaymentAttempt(attempt, payment('FAILED')).unresolved).toBe(false);
});
