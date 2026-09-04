import { describe, expect, it } from 'vitest';

import { MAX_PAGE_SIZE } from '../client';
import { ownerCatalogQueryOptions } from './products';

/**
 * Contrat de lecture du catalogue gestionnaire.
 *
 * Le back-office produits est resté vide pendant des semaines pour une seule
 * raison : il demandait `limit=200`, au-delà de la borne du serveur (100). La
 * réponse était un 400 sur **chaque** vendeur, et le `?? []` du hook la rendait
 * indiscernable d'un catalogue vide.
 *
 * Aucun test ne pouvait l'attraper : l'URL vivait dans une closure de
 * `useQuery`. Ces trois tests exercent la requête elle-même.
 */
describe('ownerCatalogQueryOptions', () => {
  function spy(pages: Array<{ data: unknown[]; meta?: { totalPages?: number } }>) {
    const urls: string[] = [];
    let i = 0;
    const fetchPage = async (path: string) => {
      urls.push(path);
      return pages[Math.min(i++, pages.length - 1)] as never;
    };
    return { urls, fetchPage };
  }

  it('vise la route de gestion et respecte la borne du serveur', async () => {
    const { urls, fetchPage } = spy([{ data: [], meta: { totalPages: 1 } }]);

    await ownerCatalogQueryOptions('resto-a', 'tok', fetchPage).queryFn();

    expect(urls).toEqual([
      `/products/manage?restaurantId=resto-a&page=1&limit=${MAX_PAGE_SIZE}`,
    ]);
    // La borne est la raison d'être du correctif : la réclamer explicitement
    // évite qu'un « il manque des produits » soit à nouveau traité en montant
    // le `limit` plutôt qu'en paginant.
    expect(MAX_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  it('enchaîne les pages jusqu’au total annoncé', async () => {
    const { urls, fetchPage } = spy([
      { data: [{ id: 'p1' }], meta: { totalPages: 3 } },
      { data: [{ id: 'p2' }], meta: { totalPages: 3 } },
      { data: [{ id: 'p3' }], meta: { totalPages: 3 } },
    ]);

    const produits = await ownerCatalogQueryOptions('resto-a', 'tok', fetchPage).queryFn();

    expect(urls).toHaveLength(3);
    expect(produits.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('s’arrête à une page si la réponse ne porte pas de meta', async () => {
    const { urls, fetchPage } = spy([{ data: [{ id: 'p1' }] }]);

    await ownerCatalogQueryOptions('resto-a', 'tok', fetchPage).queryFn();

    expect(urls).toHaveLength(1);
  });

  it('ne part pas sans jeton ni sans vendeur', () => {
    expect(ownerCatalogQueryOptions(undefined, 'tok').enabled).toBe(false);
    expect(ownerCatalogQueryOptions('resto-a', null).enabled).toBe(false);
    expect(ownerCatalogQueryOptions('resto-a', 'tok').enabled).toBe(true);
  });
});
