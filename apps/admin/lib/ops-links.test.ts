import { describe, expect, it } from 'vitest';
import { ageLabel, opsItemHref } from './ops-links';

const item = { id: 'x1', orderId: 'cmorder1', title: 't', detail: null, since: '' };

describe('cockpit ops (F3-04)', () => {
  it('une carte commande ouvre la commande par la recherche', () => {
    expect(opsItemHref('acceptance_late', item)).toBe('/commandes?q=cmorder1');
    expect(opsItemHref('delivery_failed', item)).toBe('/commandes?q=cmorder1');
    // F3-07 — retrait non confirmé : la commande, pour relancer ou arbitrer.
    expect(opsItemHref('pickup_unconfirmed', item)).toBe('/commandes?q=cmorder1');
  });

  it('les autres files ouvrent l’écran qui porte l’action', () => {
    expect(opsItemHref('refunds_pending', item)).toBe('/remboursements');
    expect(opsItemHref('claims_unanswered', item)).toBe('/reclamations/x1');
    expect(opsItemHref('payouts_failed', item)).toBe('/paiements/reversements');
    expect(opsItemHref('incidents_open', item)).toBe('/incidents/x1');
    expect(opsItemHref('outbox_failed', item)).toBeNull();
  });

  it('audit du 28/10/2026 — les nouvelles files ouvrent le bon écran', () => {
    // `id` d'une commande immobile = `<orderId>@<état>` : on ouvre la commande.
    expect(
      opsItemHref('order_stale', { ...item, id: 'cmorder1@EN_PREPARATION' }),
    ).toBe('/commandes?q=cmorder1');
    expect(opsItemHref('payouts_in_flight', item)).toBe('/paiements/reversements');
    expect(opsItemHref('refunds_in_flight', item)).toBe('/remboursements');
    expect(opsItemHref('claims_stalled', item)).toBe('/reclamations/x1');
  });

  it('ancienneté lisible', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    expect(ageLabel('2026-09-28T11:48:00.000Z', now)).toBe('il y a 12 min');
    expect(ageLabel('2026-09-28T09:00:00.000Z', now)).toBe('il y a 3 h');
    expect(ageLabel('2026-09-25T12:00:00.000Z', now)).toBe('il y a 3 j');
  });
});
