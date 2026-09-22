import { describe, expect, it } from 'vitest';

import { nextOrderStatus } from './order-transitions';

/**
 * Ce que le back-office a le droit de proposer sur une commande.
 *
 * ## Pourquoi ce fichier existe
 *
 * Le serveur porte **une** vérité — `ORDER_TRANSITION_MATRIX`
 * (`order-state.machine.ts`) plus deux gardes de cohérence terrain dans
 * `OrderLifecycleService.assertStatusMatchesGround`. Ce back-office en portait
 * une copie, `NEXT_STATUS`, gardée par un seul `canAdvanceStatus` qui ne
 * traitait que `EN_ATTENTE`. Relevé par l'audit du 22/09/2026 :
 *
 * ```
 * PRET     → EN_ROUTE   RESTAURATEUR   403
 * EN_ROUTE → LIVRER     RESTAURATEUR   403
 * ```
 *
 * Le cas ADMIN mérite d'être déplié, parce qu'il est le plus trompeur :
 * `assertStatusMatchesGround` exige une `Delivery` en `EN_TRANSIT` pour
 * accepter `EN_ROUTE`. Or le seul chemin vers `EN_TRANSIT` —
 * `PATCH /deliveries/:id/pickup` — **bascule déjà la commande en `EN_ROUTE`**.
 * Le bouton « En route » était donc inatteignable par construction : 403 pour
 * le vendeur, 400 pour l'admin.
 *
 * ## Écrit à la main, jamais dérivé
 *
 * Chaque attente ci-dessous est transcrite depuis la matrice serveur. Un test
 * qui dériverait ses attentes de `nextOrderStatus` vérifierait seulement que la
 * fonction sait se lire elle-même — le défaut exact qui avait laissé passer
 * B-1 côté backend, où la spec « exhaustive » dérivait de la matrice.
 */
describe('nextOrderStatus', () => {
  describe('EN_ATTENTE — confirmation manuelle du virement', () => {
    it('propose PAYER à l’ADMIN', () => {
      expect(
        nextOrderStatus({ current: 'EN_ATTENTE', role: 'ADMIN', isDelivery: true }),
      ).toBe('PAYER');
    });

    it('ne propose rien au RESTAURATEUR', () => {
      expect(
        nextOrderStatus({
          current: 'EN_ATTENTE',
          role: 'RESTAURATEUR',
          isDelivery: true,
        }),
      ).toBeNull();
    });
  });

  describe('préparation', () => {
    it('PAYER → EN_PREPARATION pour le vendeur', () => {
      expect(
        nextOrderStatus({ current: 'PAYER', role: 'RESTAURATEUR', isDelivery: true }),
      ).toBe('EN_PREPARATION');
    });

    it('EN_PREPARATION → PRET pour le vendeur', () => {
      expect(
        nextOrderStatus({
          current: 'EN_PREPARATION',
          role: 'RESTAURATEUR',
          isDelivery: true,
        }),
      ).toBe('PRET');
    });
  });

  describe('PRET', () => {
    it('ne propose JAMAIS EN_ROUTE — inatteignable par construction', () => {
      for (const role of ['ADMIN', 'RESTAURATEUR'] as const) {
        expect(
          nextOrderStatus({ current: 'PRET', role, isDelivery: true }),
        ).not.toBe('EN_ROUTE');
      }
    });

    it('propose LIVRER sur un retrait au comptoir', () => {
      expect(
        nextOrderStatus({ current: 'PRET', role: 'RESTAURATEUR', isDelivery: false }),
      ).toBe('LIVRER');
    });

    it('ne propose pas LIVRER sur une commande à livrer', () => {
      // Seul le livreur constate une livraison. Le raccourci comptoir
      // clôturerait la commande et créditerait les points de fidélité alors que
      // le client n'a rien reçu.
      expect(
        nextOrderStatus({ current: 'PRET', role: 'RESTAURATEUR', isDelivery: true }),
      ).toBeNull();
    });
  });

  describe('EN_ROUTE', () => {
    it('ne propose rien au vendeur : il n’a plus la main', () => {
      expect(
        nextOrderStatus({ current: 'EN_ROUTE', role: 'RESTAURATEUR', isDelivery: true }),
      ).toBeNull();
    });
  });

  describe('états terminaux', () => {
    it.each(['LIVRER', 'ANNULER'] as const)('%s ne propose plus rien', (current) => {
      for (const role of ['ADMIN', 'RESTAURATEUR'] as const) {
        expect(nextOrderStatus({ current, role, isDelivery: true })).toBeNull();
      }
    });
  });

  describe('robustesse', () => {
    it('ne propose rien sans rôle connu', () => {
      // `role` vient du profil chargé : il peut être `undefined` le temps du
      // premier rendu. Proposer par défaut serait proposer au hasard.
      expect(
        nextOrderStatus({ current: 'PAYER', role: undefined, isDelivery: true }),
      ).toBeNull();
    });

    it('ne propose rien à un rôle étranger au back-office', () => {
      for (const role of ['CLIENT', 'LIVREUR'] as const) {
        expect(
          nextOrderStatus({ current: 'PAYER', role, isDelivery: true }),
        ).toBeNull();
      }
    });
  });
});
