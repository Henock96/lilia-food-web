import { describe, expect, it } from 'vitest';
import { checkoutBlocker } from './checkout-validation';

const ready = {
  guestCartPending: false,
  maintenance: null,
  vendorServesNobody: false,
  isEmpty: false,
  minimumError: null,
  needsAddress: false,
  needsSlot: false,
  phoneValid: true,
  quoteReady: true,
};

describe('checkoutBlocker', () => {
  it('tout est prêt : rien ne bloque', () => {
    expect(checkoutBlocker(ready)).toBeNull();
  });

  it.each([
    ['maintenance', { maintenance: 'Retour à 14 h' }, 'Retour à 14 h'],
    ['vendeur sans mode', { vendorServesNobody: true }, 'Ce vendeur ne prend pas de commande pour le moment.'],
    ['panier vide', { isEmpty: true }, 'Votre panier est vide.'],
    ['minimum', { minimumError: 'Minimum 2 000 FCFA' }, 'Minimum 2 000 FCFA'],
    ['adresse', { needsAddress: true }, 'Sélectionnez une adresse de livraison.'],
    ['créneau', { needsSlot: true }, 'Choisissez un créneau de retrait.'],
    ['téléphone', { phoneValid: false }, 'Renseignez un numéro de contact valide.'],
    ['devis', { quoteReady: false }, 'Vérification du montant de votre commande…'],
  ])('%s', (_label, change, message) => {
    expect(checkoutBlocker({ ...ready, ...change })).toBe(message);
  });

  it('panier invité pas encore versé : on ne commande pas sans ses articles', () => {
    expect(checkoutBlocker({ ...ready, guestCartPending: true })).toBe('Reprise de votre panier…');
  });

  it('dit d’abord ce que le client peut corriger avant le devis qui en dépend', () => {
    expect(checkoutBlocker({ ...ready, needsAddress: true, quoteReady: false })).toBe(
      'Sélectionnez une adresse de livraison.',
    );
  });

  it('bloque exactement quand l’ancienne condition du bouton bloquait', () => {
    for (let bits = 0; bits < 2 ** 8; bits++) {
      const on = (i: number) => (bits & (1 << i)) !== 0;
      const input = {
        guestCartPending: false,
        maintenance: on(0) ? 'x' : null,
        vendorServesNobody: on(1),
        isEmpty: on(2),
        minimumError: on(3) ? 'x' : null,
        needsAddress: on(4),
        needsSlot: on(5),
        phoneValid: on(6),
        quoteReady: on(7),
      };
      const legacy =
        !!input.maintenance || input.vendorServesNobody || input.isEmpty || !input.quoteReady ||
        !input.phoneValid || !!input.minimumError || input.needsAddress || input.needsSlot;
      expect(checkoutBlocker(input) !== null).toBe(legacy);
    }
  });
});
