import { describe, expect, it } from 'vitest';
import {
  isServiceModeError,
  noServiceMode,
  resolveServiceMode,
  serviceModesOf,
} from './service-modes';

/**
 * Lot 1 — mêmes cas que `lilia-app/test/models/service_modes_test.dart`
 * (hors règle HOME_COOK, propre à l'application mobile).
 */
describe('service-modes', () => {
  const deliveryOnly = serviceModesOf({ supportsDelivery: true, supportsPickup: false });
  const pickupOnly = serviceModesOf({ supportsDelivery: false, supportsPickup: true });
  const both = serviceModesOf({ supportsDelivery: true, supportsPickup: true });
  const none = serviceModesOf({ supportsDelivery: false, supportsPickup: false });

  it('livraison seulement : un retrait choisi retombe sur la livraison', () => {
    expect(resolveServiceMode(true, deliveryOnly)).toBe(true);
    expect(resolveServiceMode(false, deliveryOnly)).toBe(true);
  });

  it('retrait seulement : la livraison par défaut retombe sur le retrait', () => {
    expect(resolveServiceMode(true, pickupOnly)).toBe(false);
    expect(resolveServiceMode(false, pickupOnly)).toBe(false);
  });

  it('les deux : le choix du client est gardé', () => {
    expect(resolveServiceMode(true, both)).toBe(true);
    expect(resolveServiceMode(false, both)).toBe(false);
  });

  it('aucun mode : signalé, le choix est rendu tel quel (le serveur refusera)', () => {
    expect(noServiceMode(none)).toBe(true);
    expect(noServiceMode(both)).toBe(false);
    expect(resolveServiceMode(true, none)).toBe(true);
  });

  it('vendeur pas encore chargé : rien n’est imposé', () => {
    expect(resolveServiceMode(false, null)).toBe(false);
    expect(noServiceMode(null)).toBe(false);
  });

  it('champs absents (réponse ancienne) : les deux modes', () => {
    expect(serviceModesOf({})).toEqual({ delivery: true, pickup: true });
  });

  it('reconnaît les deux codes de refus du checkout', () => {
    expect(isServiceModeError('DELIVERY_UNAVAILABLE')).toBe(true);
    expect(isServiceModeError('PICKUP_UNAVAILABLE')).toBe(true);
    expect(isServiceModeError('OUT_OF_STOCK')).toBe(false);
    expect(isServiceModeError(undefined)).toBe(false);
  });
});
