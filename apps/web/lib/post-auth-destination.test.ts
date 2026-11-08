import { describe, expect, it } from 'vitest';
import { destinationAfterAuth } from './post-auth-destination';

describe('destinationAfterAuth', () => {
  it('visiteur avec un panier, arrivé sans destination : reprend au panier', () => {
    // Le bouton « Connexion » de l'en-tête n'en transmet aucune.
    expect(destinationAfterAuth(null, 2)).toBe('/panier');
    expect(destinationAfterAuth('', 1)).toBe('/panier');
  });

  it('panier vide, sans destination : le catalogue, comme avant', () => {
    expect(destinationAfterAuth(null, 0)).toBe('/restaurants');
  });

  it('une destination explicite prime sur le panier', () => {
    expect(destinationAfterAuth('/commandes', 3)).toBe('/commandes');
    expect(destinationAfterAuth('/panier', 0)).toBe('/panier');
  });

  it('une destination hors du site reste refusée', () => {
    expect(destinationAfterAuth('https://evil.com', 0)).toBe('/restaurants');
    expect(destinationAfterAuth('//evil.com', 2)).toBe('/restaurants');
  });
});
