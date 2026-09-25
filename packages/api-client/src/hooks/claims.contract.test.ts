import { describe, expect, it } from 'vitest';
import { claimsListPath } from './claims';

/** F3-06 — le client lit ses demandes sur `/me/claims`, le staff sur `/claims`. */
describe('claimsListPath', () => {
  it('client : /me/claims, sans filtre d’état', () => {
    expect(claimsListPath('mine', 1, 'all')).toBe('/me/claims?page=1&limit=20');
  });

  it('support et vendeur : /claims, filtre « à traiter »', () => {
    expect(claimsListPath('all', 2, 'open')).toBe('/claims?page=2&limit=20&state=open');
  });
});
