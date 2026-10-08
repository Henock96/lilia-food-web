import { describe, expect, it } from 'vitest';
import type { Restaurant } from '@lilia/types';
import {
  CATALOGUE_PAGE_SIZE,
  SHOWCASE_BATCH,
  SHOWCASE_MAX,
  availableTypeFilters,
  catalogueHref,
  collectPages,
  matchesVendorQuery,
  normalizeVendorPage,
  paginate,
  parseCatalogueParams,
  parseShowcaseCount,
  showcaseView,
  vendorsPath,
  type VendorPage,
} from './vendor-catalog';

function vendor(id: string, extra: Partial<Restaurant> = {}): Restaurant {
  return { id, nom: `Vendeur ${id}`, adresse: '', isOpen: false, ...extra } as Restaurant;
}

function vendors(n: number, prefix = 'v'): Restaurant[] {
  return Array.from({ length: n }, (_, i) => vendor(`${prefix}${i + 1}`));
}

/** Simule `GET /vendors` paginé sur un catalogue donné, dans l'ordre serveur. */
function fakeServer(catalogue: Restaurant[]) {
  const calls: number[] = [];
  const fetchPage = async (page: number, limit: number): Promise<VendorPage> => {
    calls.push(page);
    const start = (page - 1) * limit;
    return {
      vendors: catalogue.slice(start, start + limit),
      meta: { page, limit, total: catalogue.length, totalPages: Math.ceil(catalogue.length / limit) },
    };
  };
  return { fetchPage, calls };
}

describe('vendorsPath — la mise en page ne décide jamais du limit', () => {
  it('ne transmet que les paramètres demandés', () => {
    expect(vendorsPath({ page: 1, limit: 12 })).toBe('/vendors?page=1&limit=12');
    expect(vendorsPath({ page: 2, limit: 24, vendorType: 'BAKERY', isOpen: true })).toBe(
      '/vendors?page=2&limit=24&vendorType=BAKERY&isOpen=true',
    );
  });

  it('borne le limit à la borne serveur (100)', () => {
    expect(vendorsPath({ page: 1, limit: 500 })).toBe('/vendors?page=1&limit=100');
    expect(vendorsPath({ page: 0, limit: 0 })).toBe('/vendors?page=1&limit=1');
  });
});

describe('normalizeVendorPage', () => {
  it('conserve data et meta', () => {
    const page = normalizeVendorPage(
      { data: vendors(3), meta: { page: 1, limit: 12, total: 3, totalPages: 1 } },
      { page: 1, limit: 12 },
    );
    expect(page.vendors.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
    expect(page.meta).toEqual({ page: 1, limit: 12, total: 3, totalPages: 1 });
  });

  it('refuse une réponse sans meta.total : un total inventé masquerait des vendeurs', () => {
    expect(() => normalizeVendorPage({ data: vendors(3) }, { page: 1, limit: 12 })).toThrow();
  });

  it('refuse une réponse sans tableau data', () => {
    expect(() =>
      normalizeVendorPage({ meta: { total: 0 } } as never, { page: 1, limit: 12 }),
    ).toThrow();
  });

  it('recalcule totalPages s’il manque', () => {
    const page = normalizeVendorPage(
      { data: vendors(12), meta: { total: 30 } },
      { page: 1, limit: 12 },
    );
    expect(page.meta.totalPages).toBe(3);
  });
});

describe('collectPages — parcours complet borné', () => {
  it.each([0, 1, 3, 4, 5, 9, 10, 120])('%i vendeurs : aucun perdu, ordre conservé', async (n) => {
    const catalogue = vendors(n);
    const { fetchPage } = fakeServer(catalogue);
    const result = await collectPages(fetchPage, { limit: 50, maxPages: 20 });
    expect(result.vendors.map((v) => v.id)).toEqual(catalogue.map((v) => v.id));
    expect(result.total).toBe(n);
    expect(result.truncated).toBe(false);
  });

  it('ne demande que les pages nécessaires', async () => {
    const { fetchPage, calls } = fakeServer(vendors(120));
    await collectPages(fetchPage, { limit: 100, maxPages: 20 });
    expect(calls).toEqual([1, 2]);
  });

  it('dédoublonne un vendeur glissé d’une page à l’autre entre deux lectures', async () => {
    const pages: Record<number, Restaurant[]> = {
      1: [vendor('a'), vendor('b')],
      2: [vendor('b'), vendor('c')],
    };
    const result = await collectPages(
      async (page, limit) => ({
        vendors: pages[page] ?? [],
        meta: { page, limit, total: 4, totalPages: 2 },
      }),
      { limit: 2, maxPages: 20 },
    );
    expect(result.vendors.map((v) => v.id)).toEqual(['a', 'b', 'c']);
  });

  it('signale la troncature au lieu de la taire', async () => {
    const { fetchPage } = fakeServer(vendors(30));
    const result = await collectPages(fetchPage, { limit: 10, maxPages: 2 });
    expect(result.vendors).toHaveLength(20);
    expect(result.total).toBe(30);
    expect(result.truncated).toBe(true);
  });

  it('une page en échec fait échouer tout le parcours (jamais de liste partielle)', async () => {
    const { fetchPage } = fakeServer(vendors(25));
    const failing = async (page: number, limit: number) => {
      if (page === 2) throw new Error('503');
      return fetchPage(page, limit);
    };
    await expect(collectPages(failing, { limit: 10, maxPages: 20 })).rejects.toThrow('503');
  });
});

describe('parseShowcaseCount — lots de l’accueil', () => {
  it('commence à un lot', () => {
    expect(parseShowcaseCount(undefined)).toBe(SHOWCASE_BATCH);
    expect(parseShowcaseCount('abc')).toBe(SHOWCASE_BATCH);
    expect(parseShowcaseCount('-5')).toBe(SHOWCASE_BATCH);
  });

  it('arrondit au lot supérieur et borne au maximum', () => {
    expect(parseShowcaseCount('24')).toBe(24);
    expect(parseShowcaseCount('13')).toBe(24);
    expect(parseShowcaseCount('5000')).toBe(SHOWCASE_MAX);
    expect(SHOWCASE_MAX).toBeLessThanOrEqual(100);
  });
});

describe('showcaseView — ce que l’accueil propose après la grille', () => {
  it.each([
    // shown, total → afficher plus ?, lien catalogue complet ?
    [0, 0, false, false],
    [1, 1, false, true],
    [4, 4, false, true],
    [9, 9, false, true],
    [12, 50, true, true],
    [96, 120, false, true],
  ])('%i affichés sur %i', (shown, total, more, all) => {
    const view = showcaseView(shown, total, Math.max(shown, SHOWCASE_BATCH));
    expect(view.canShowMore).toBe(more);
    expect(view.showCatalogueLink).toBe(all);
  });

  it('le lot suivant ne dépasse ni le total ni le maximum', () => {
    expect(showcaseView(12, 50, 12).nextCount).toBe(24);
    expect(showcaseView(84, 120, 84).nextCount).toBe(SHOWCASE_MAX);
  });
});

describe('parseCatalogueParams / catalogueHref', () => {
  it('lit les filtres partageables de l’URL', () => {
    expect(
      parseCatalogueParams({ q: ' poulet ', vendorType: 'BAKERY', ouvert: '1', page: '3' }),
    ).toEqual({ q: 'poulet', vendorType: 'BAKERY', openOnly: true, page: 3 });
  });

  it('ignore les valeurs invalides', () => {
    expect(parseCatalogueParams({ vendorType: 'PIZZA', ouvert: 'oui', page: '-2' })).toEqual({
      q: '',
      vendorType: null,
      openOnly: false,
      page: 1,
    });
    expect(parseCatalogueParams({ vendorType: ['BAKERY', 'X'] }).vendorType).toBe('BAKERY');
  });

  it('écrit une URL minimale et revient en page 1 quand un filtre change', () => {
    const base = { q: '', vendorType: null, openOnly: false, page: 3 } as const;
    expect(catalogueHref(base, { openOnly: true })).toBe('/restaurants?ouvert=1');
    expect(catalogueHref(base, { vendorType: 'RESTAURANT' })).toBe(
      '/restaurants?vendorType=RESTAURANT',
    );
    expect(catalogueHref(base, { page: 2 })).toBe('/restaurants?page=2');
    expect(catalogueHref({ ...base, page: 1 }, {})).toBe('/restaurants');
    expect(catalogueHref({ ...base, q: 'pâte' }, { page: 2 })).toBe(
      '/restaurants?q=p%C3%A2te&page=2',
    );
  });
});

describe('matchesVendorQuery', () => {
  const v = vendor('x', {
    nom: 'Les Gâteaux Gourmands',
    adresse: '5 Rue Impasse Nkombo',
    specialties: [{ id: 's', name: 'Pâtisserie' }] as Restaurant['specialties'],
  });

  it('cherche dans le nom, l’adresse et les spécialités, sans tenir compte des accents', () => {
    expect(matchesVendorQuery(v, 'gateaux')).toBe(true);
    expect(matchesVendorQuery(v, 'NKOMBO')).toBe(true);
    expect(matchesVendorQuery(v, 'patisserie')).toBe(true);
    expect(matchesVendorQuery(v, 'pizza')).toBe(false);
    expect(matchesVendorQuery(v, '  ')).toBe(true);
  });
});

describe('paginate', () => {
  it('découpe sans perte ni doublon', () => {
    const list = vendors(50);
    const seen = [1, 2, 3].flatMap((p) => paginate(list, p, CATALOGUE_PAGE_SIZE).items);
    expect(seen.map((v) => v.id)).toEqual(list.map((v) => v.id));
    expect(paginate(list, 1, CATALOGUE_PAGE_SIZE).totalPages).toBe(3);
  });

  it('une page au-delà de la fin est vide, pas une erreur', () => {
    expect(paginate(vendors(5), 4, CATALOGUE_PAGE_SIZE).items).toEqual([]);
  });
});

describe('availableTypeFilters — pas de catégorie vide', () => {
  it('ne propose que les types présents, dans l’ordre fixe, avec leur compte', () => {
    const filters = availableTypeFilters({
      byType: { RESTAURANT: 7, HOME_COOK: 1, BAKERY: 0, BEVERAGE_SHOP: 1, GROCERY: 0 },
      open: 1,
      total: 9,
    });
    expect(filters).toEqual([
      { type: 'RESTAURANT', label: 'Restaurants', count: 7 },
      { type: 'HOME_COOK', label: 'Cuisines maison', count: 1 },
      { type: 'BEVERAGE_SHOP', label: 'Boissons', count: 1 },
    ]);
  });
});
