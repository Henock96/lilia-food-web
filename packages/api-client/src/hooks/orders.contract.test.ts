import { describe, expect, it } from 'vitest';

import {
  ORDERS_PAGE_SIZE,
  adminOrdersQueryOptions,
  stuckOrdersQueryOptions,
} from './orders';

/**
 * Contrat de lecture de l'écran Commandes.
 *
 * Le back-office affichait **vingt commandes**, et seulement vingt, depuis le
 * premier jour : `useRestaurantOrders` appelait `/orders/restaurant` sans
 * transmettre de pagination, le serveur appliquait son `limit = 20` par défaut,
 * et rien dans l'interface ne laissait deviner qu'il y en avait d'autres. Une
 * commande plus ancienne était inatteignable depuis l'administration.
 *
 * Aucun test ne pouvait l'attraper : l'URL vivait dans une closure de
 * `useQuery`. Ces tests exercent la requête elle-même — c'est exactement le
 * garde-fou posé en septembre sur le catalogue (`products.contract.test.ts`),
 * qui manquait ici.
 */
describe('adminOrdersQueryOptions', () => {
  function spy(
    response: { data: unknown[]; meta?: Record<string, unknown> } = {
      data: [],
    },
  ) {
    const urls: string[] = [];
    const fetchPage = async (path: string) => {
      urls.push(path);
      return response as never;
    };
    return { urls, fetchPage };
  }

  it('transmet TOUJOURS page et limit — c’est le défaut corrigé', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('page=1');
    expect(urls[0]).toContain(`limit=${ORDERS_PAGE_SIZE}`);
  });

  it('vise la route d’administration pour un ADMIN', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 3,
      fetchPage,
    }).queryFn();

    expect(urls).toEqual([
      `/admin/orders?page=3&limit=${ORDERS_PAGE_SIZE}`,
    ]);
  });

  it('vise la route vendeur pour un RESTAURATEUR', async () => {
    // `/admin/orders` est ADMIN-only : y envoyer un vendeur produirait un 403
    // sur l'écran le plus consulté de son back-office.
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'RESTAURATEUR',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(urls).toEqual([
      `/orders/restaurant?page=1&limit=${ORDERS_PAGE_SIZE}`,
    ]);
  });

  it('envoie le filtre de statut au serveur, jamais au résultat', async () => {
    // Filtrer une page déjà tronquée ne rend que les commandes de cette page,
    // en annonçant avec aplomb qu'il n'y en a pas d'autres.
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      status: 'PRET',
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('&status=PRET');
  });

  it('n’ajoute pas de statut sur la vue « toutes »', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      status: 'ALL',
      fetchPage,
    }).queryFn();

    expect(urls[0]).not.toContain('status=');
  });

  it('envoie la recherche au serveur', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      search: 'Marie',
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('search=Marie');
  });

  it('encode une recherche qui contient un dièse ou un espace', async () => {
    // Un `#` non encodé coupe l'URL : tout ce qui suit deviendrait un
    // fragment, jamais transmis au serveur. La commande cherchée ne
    // remonterait pas, sans qu'aucune erreur ne s'affiche.
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      search: '#A1B2 C3',
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('search=%23A1B2+C3');
  });

  it('n’ajoute pas de paramètre sur une recherche vide', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      search: '   ',
      fetchPage,
    }).queryFn();

    expect(urls[0]).not.toContain('search=');
  });

  it('cherche aussi depuis la route vendeur', async () => {
    const { urls, fetchPage } = spy();

    await adminOrdersQueryOptions({
      token: 'tok',
      role: 'RESTAURATEUR',
      page: 1,
      search: 'Marie',
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('/orders/restaurant?');
    expect(urls[0]).toContain('search=Marie');
  });

  it('sépare les caches par recherche', () => {
    // Sans la recherche dans la clé, effacer le champ servirait le résultat de
    // la recherche précédente — présenté comme la liste complète.
    const sans = adminOrdersQueryOptions({ token: 't', role: 'ADMIN', page: 1 })
      .queryKey;
    const avec = adminOrdersQueryOptions({
      token: 't',
      role: 'ADMIN',
      page: 1,
      search: 'Marie',
    }).queryKey;

    expect(sans).not.toEqual(avec);
  });

  it('rend le total et les compteurs du serveur', async () => {
    const { fetchPage } = spy({
      data: [{ id: 'o1' }],
      meta: {
        total: 148,
        page: 2,
        limit: 20,
        totalPages: 8,
        statusCounts: { EN_ATTENTE: 3, PRET: 4 },
      },
    });

    const res = await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 2,
      fetchPage,
    }).queryFn();

    expect(res.meta.total).toBe(148);
    expect(res.meta.totalPages).toBe(8);
    expect(res.meta.statusCounts.EN_ATTENTE).toBe(3);
  });

  it('dégrade sans mentir quand le serveur ne renvoie pas de meta', async () => {
    // Un backend antérieur à `statusCounts` ne doit pas casser l'écran — mais
    // il ne doit pas non plus faire afficher « 0 commande » alors qu'une page
    // est arrivée. Le total retombe sur ce qu'on a réellement reçu.
    const { fetchPage } = spy({ data: [{ id: 'o1' }, { id: 'o2' }] });

    const res = await adminOrdersQueryOptions({
      token: 'tok',
      role: 'ADMIN',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(res.meta.total).toBe(2);
    expect(res.meta.totalPages).toBe(1);
    expect(res.meta.statusCounts).toEqual({});
  });

  it('ne part pas sans jeton', () => {
    expect(
      adminOrdersQueryOptions({ token: null, role: 'ADMIN', page: 1 }).enabled,
    ).toBe(false);
    expect(
      adminOrdersQueryOptions({ token: 'tok', role: 'ADMIN', page: 1 }).enabled,
    ).toBe(true);
  });

  it('sépare les caches par page, par statut et par rôle', () => {
    // Sans la page dans la clé, tourner la page servirait la précédente ;
    // sans le statut, changer d'onglet afficherait le cache de l'onglet
    // précédent — le catalogue entier présenté comme les commandes prêtes.
    const p1 = adminOrdersQueryOptions({ token: 't', role: 'ADMIN', page: 1 })
      .queryKey;
    const p2 = adminOrdersQueryOptions({ token: 't', role: 'ADMIN', page: 2 })
      .queryKey;
    const pret = adminOrdersQueryOptions({
      token: 't',
      role: 'ADMIN',
      page: 1,
      status: 'PRET',
    }).queryKey;
    const vendeur = adminOrdersQueryOptions({
      token: 't',
      role: 'RESTAURATEUR',
      page: 1,
    }).queryKey;

    expect(p1).not.toEqual(p2);
    expect(p1).not.toEqual(pret);
    expect(p1).not.toEqual(vendeur);
  });
});

/**
 * Alerte « commandes bloquées ».
 *
 * Elle filtrait les vingt commandes reçues : une commande bloquée depuis trois
 * heures en sortait dès que vingt plus récentes arrivaient. L'alerte
 * s'éteignait donc au moment précis où le problème s'aggravait — et son
 * horloge, figée au montage, ne détectait jamais une commande qui devenait
 * tardive pendant qu'on regardait l'écran (audit du 09/09/2026, D-4).
 */
describe('stuckOrdersQueryOptions', () => {
  // ⚠️ Pas de valeur par défaut : `spy(undefined)` doit vraiment rendre
  // `undefined`, or un paramètre par défaut l'aurait remplacé — le test du
  // repli aurait alors vérifié une réponse pleine, sans rien prouver.
  function spy(response?: unknown) {
    const urls: string[] = [];
    const fetchStuck = async (path: string) => {
      urls.push(path);
      return response as never;
    };
    return { urls, fetchStuck };
  }

  it('demande le décompte au serveur, avec le seuil', async () => {
    const { urls, fetchStuck } = spy();

    await stuckOrdersQueryOptions({
      token: 'tok',
      minutes: 30,
      fetchStuck,
    }).queryFn();

    expect(urls).toEqual(['/orders/restaurant/stuck?minutes=30']);
  });

  it('sert les deux rôles — le vendeur aussi doit voir ses retards', async () => {
    // La route est `@Roles('RESTAURATEUR','ADMIN')` et borne le vendeur à sa
    // boutique. Réserver l'alerte à l'admin priverait du signal celui qui peut
    // agir dessus tout de suite.
    const { urls, fetchStuck } = spy();

    await stuckOrdersQueryOptions({
      token: 'tok',
      minutes: 45,
      fetchStuck,
    }).queryFn();

    expect(urls[0]).toContain('/orders/restaurant/stuck');
  });

  it('rend un décompte à zéro plutôt que undefined sur une réponse vide', async () => {
    const { fetchStuck } = spy(undefined);

    const res = await stuckOrdersQueryOptions({
      token: 'tok',
      minutes: 30,
      fetchStuck,
    }).queryFn();

    expect(res.total).toBe(0);
    expect(res.oldestMinutes).toBeNull();
    expect(res.byStatus).toEqual({ PAYER: 0, EN_PREPARATION: 0, PRET: 0 });
  });

  it('ne part pas sans jeton', () => {
    expect(stuckOrdersQueryOptions({ token: null, minutes: 30 }).enabled).toBe(
      false,
    );
    expect(stuckOrdersQueryOptions({ token: 'tok', minutes: 30 }).enabled).toBe(
      true,
    );
  });

  it('sépare les caches par seuil', () => {
    expect(
      stuckOrdersQueryOptions({ token: 't', minutes: 30 }).queryKey,
    ).not.toEqual(stuckOrdersQueryOptions({ token: 't', minutes: 60 }).queryKey);
  });
});
