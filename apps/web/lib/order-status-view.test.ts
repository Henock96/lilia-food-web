import { describe, expect, it } from 'vitest';

import {
  TIMELINE_STATUSES,
  canClientCancel,
  cancellationNotice,
  readyAtLabel,
  timelinePosition,
} from './order-status-view';

/**
 * Ce que le client voit de sa commande (Phase 3, F3-01).
 *
 * Une commande payée que le vendeur refuse, ou laisse sans réponse, est
 * annulée et REMBOURSÉE automatiquement : le client doit le lire, pas deviner
 * qu'on l'a oublié.
 */
describe('chronologie', () => {
  it('« Acceptée » s’intercale entre le paiement et la préparation', () => {
    expect(TIMELINE_STATUSES).toEqual([
      'EN_ATTENTE',
      'PAYER',
      'ACCEPTEE',
      'EN_PREPARATION',
      'PRET',
      'EN_ROUTE',
      'LIVRER',
    ]);
  });

  it('une commande préparée sans passer par « Acceptée » (acceptation implicite) coche quand même l’étape', () => {
    expect(timelinePosition('EN_PREPARATION')).toBeGreaterThan(timelinePosition('ACCEPTEE'));
  });

  it('un statut hors chronologie n’y a pas de position', () => {
    expect(timelinePosition('ANNULER')).toBe(-1);
    expect(timelinePosition('ECHEC_LIVRAISON')).toBe(-1);
  });
});

describe('readyAtLabel', () => {
  it('heure de fin annoncée, à l’heure de Brazzaville', () => {
    expect(readyAtLabel('2026-09-24T11:40:00.000Z')).toBe('Prête vers 12:40');
  });

  it('rien sans heure annoncée', () => {
    expect(readyAtLabel(null)).toBeNull();
    expect(readyAtLabel(undefined)).toBeNull();
    expect(readyAtLabel('pas une date')).toBeNull();
  });
});

describe('cancellationNotice', () => {
  it('jamais payée : simple annulation, aucun remboursement annoncé', () => {
    expect(cancellationNotice({ paidAt: null })).toEqual({
      title: 'Commande annulée',
      detail: 'Cette commande a été annulée. Aucun montant n’a été débité.',
    });
  });

  it('payée puis refusée par le vendeur : le motif, et le remboursement', () => {
    const notice = cancellationNotice({
      paidAt: '2026-09-24T11:00:00.000Z',
      vendorRejectionReason: 'OUT_OF_STOCK',
      restaurant: { nom: 'Chez Awa' },
    });
    expect(notice.title).toBe('Chez Awa n’a pas pu prendre votre commande');
    expect(notice.detail).toContain('rupture de stock');
    expect(notice.detail).toContain('remboursement');
  });

  it('payée puis restée sans réponse : remboursement annoncé', () => {
    const notice = cancellationNotice({ paidAt: '2026-09-24T11:00:00.000Z' });
    expect(notice.detail).toContain('remboursement');
  });
});

describe('canClientCancel', () => {
  it('le serveur fait foi quand il publie ses gestes', () => {
    expect(canClientCancel({ status: 'EN_ATTENTE', allowedActions: [] })).toBe(false);
    expect(canClientCancel({ status: 'EN_ATTENTE', allowedActions: ['CANCEL'] })).toBe(true);
  });

  it('serveur antérieur : seulement avant paiement', () => {
    expect(canClientCancel({ status: 'EN_ATTENTE' })).toBe(true);
    expect(canClientCancel({ status: 'PAYER' })).toBe(false);
  });
});
