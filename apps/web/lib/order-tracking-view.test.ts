import { createElement } from 'react';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@lilia/api-client';
import { OrderSyncNotice } from '../components/orders/order-sync-notice';
import { timelineSteps } from './pickup-view';

afterEach(() => vi.unstubAllGlobals());
function notice(hasOrder: boolean, error: unknown, paused = false) {
  vi.stubGlobal('React', React);
  return renderToStaticMarkup(createElement(OrderSyncNotice, { hasOrder, error, paused, fetching: false, onRetry: () => {} }));
}
describe('visible tracking recovery', () => {
  it('distinguishes a failed request from a real 404', () => {
    const failed = notice(false, new Error('network'));
    expect(failed).toContain('Impossible d’actualiser');
    expect(failed).toContain('Réessayer le suivi');
    expect(failed).not.toContain('introuvable');
    expect(notice(false, new ApiError(404, 'missing'))).toContain('Commande introuvable');
  });
  it('marks cached status as potentially stale and exposes offline recovery', () => {
    expect(notice(true, new Error('network'))).toContain('dernier état connu');
    expect(notice(false, null, true)).toContain('retour du réseau');
  });
});
describe('timeline is presentation, never a payment permission', () => {
  it.each([true, false])('shows acceptance before payment in ACCEPT_FIRST, delivery=%s', (delivery) => {
    const steps = timelineSteps(delivery, 'ACCEPT_FIRST');
    expect(steps.slice(0, 3).map(s => s.status)).toEqual(['DEMANDE_ENVOYEE', 'EN_ATTENTE', 'PAYER']);
    expect(steps[1].label).toContain('paiement attendu');
    expect(steps.map(s => s.status)).not.toContain('ACCEPTEE');
    expect(steps.some(s => s.status === 'EN_ROUTE')).toBe(delivery);
    expect(steps.at(-1)?.label).toBe(delivery ? 'Livré' : 'Récupérée');
  });
  it('preserves the historical paid-then-accepted timeline', () => {
    const statuses = timelineSteps(true, 'PAY_FIRST').map(s => s.status);
    expect(statuses.indexOf('ACCEPTEE')).toBeGreaterThan(statuses.indexOf('PAYER'));
    expect(timelineSteps(true)).toEqual(timelineSteps(true, 'PAY_FIRST'));
  });
});
