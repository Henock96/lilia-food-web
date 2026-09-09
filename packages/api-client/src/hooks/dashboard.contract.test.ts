import { describe, expect, it } from 'vitest';

import { restaurantRankingQueryOptions } from './dashboard';

/**
 * Classement des vendeurs par revenu.
 *
 * Le panneau « Revenus par restaurant » du tableau de bord agrégeait **la page
 * de vingt commandes** de l'écran Commandes, groupée par `restaurantId`, et
 * affichait le résultat sous un titre qui promettait le contraire. Deux erreurs
 * superposées : une population arbitraire, et aucun filtre de statut — les
 * commandes annulées y étaient comptées, contrairement au reste du tableau de
 * bord (audit du 09/09/2026, D-3).
 *
 * `GET /dashboard/restaurant-ranking` existait, était correct, était réservé
 * ADMIN — et n'était appelé que par l'application Flutter.
 */
describe('restaurantRankingQueryOptions', () => {
  function spy(response: unknown = []) {
    const urls: string[] = [];
    const fetchRanking = async (path: string) => {
      urls.push(path);
      return response as never;
    };
    return { urls, fetchRanking };
  }

  it('vise la route dédiée plutôt que d’agréger une page de commandes', async () => {
    const { urls, fetchRanking } = spy();

    await restaurantRankingQueryOptions({
      token: 'tok',
      isAdmin: true,
      fetchRanking,
    }).queryFn();

    expect(urls).toEqual(['/dashboard/restaurant-ranking']);
  });

  it('transmet la période demandée', async () => {
    const { urls, fetchRanking } = spy();

    await restaurantRankingQueryOptions({
      token: 'tok',
      isAdmin: true,
      period: 'week',
      fetchRanking,
    }).queryFn();

    expect(urls[0]).toBe('/dashboard/restaurant-ranking?period=week');
  });

  it('ne part pas pour un RESTAURATEUR', () => {
    // La route est `@Roles('ADMIN')` : l'appeler avec un compte vendeur
    // produirait un 403 sur le tableau de bord. Et « revenus par restaurant »
    // n'a de toute façon aucun sens pour quelqu'un qui n'en tient qu'un.
    expect(
      restaurantRankingQueryOptions({ token: 'tok', isAdmin: false }).enabled,
    ).toBe(false);
    expect(
      restaurantRankingQueryOptions({ token: 'tok', isAdmin: true }).enabled,
    ).toBe(true);
    expect(
      restaurantRankingQueryOptions({ token: null, isAdmin: true }).enabled,
    ).toBe(false);
  });

  it('sépare les caches par période', () => {
    const jour = restaurantRankingQueryOptions({
      token: 't',
      isAdmin: true,
      period: 'today',
    }).queryKey;
    const mois = restaurantRankingQueryOptions({
      token: 't',
      isAdmin: true,
      period: 'month',
    }).queryKey;

    expect(jour).not.toEqual(mois);
  });

  it('rend une liste vide plutôt que undefined', async () => {
    // Le tableau de bord itère directement le résultat ; un `undefined` y
    // produirait un écran blanc au lieu d'un « aucune vente ».
    const { fetchRanking } = spy(undefined);

    const res = await restaurantRankingQueryOptions({
      token: 'tok',
      isAdmin: true,
      fetchRanking,
    }).queryFn();

    expect(res).toEqual([]);
  });
});
