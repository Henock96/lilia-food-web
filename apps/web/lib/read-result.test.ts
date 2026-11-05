import { describe, expect, it } from 'vitest';
import { ApiError } from '@lilia/api-client';
import { readResultFromError } from './read-result';

describe('readResultFromError', () => {
  it('un 404 du serveur : la ressource n’existe pas', () => {
    expect(readResultFromError(new ApiError(404, 'Vendeur introuvable.'))).toEqual({ kind: 'missing' });
  });

  it('reconnaît le 404 sans la classe : l’erreur a pu traverser `use cache`', () => {
    expect(readResultFromError({ status: 404, message: 'Introuvable' })).toEqual({ kind: 'missing' });
  });

  it.each([
    ['500', new ApiError(500, 'Erreur interne')],
    ['503', new ApiError(503, 'Maintenance')],
    ['429', new ApiError(429, 'Trop de requêtes')],
    ['erreur réseau', new TypeError('fetch failed')],
    ['valeur sans statut', 'boom'],
    ['null', null],
  ])('%s : panne, jamais « introuvable »', (_label, error) => {
    expect(readResultFromError(error)).toEqual({ kind: 'unavailable' });
  });
});
