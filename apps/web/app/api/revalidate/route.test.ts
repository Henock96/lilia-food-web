import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag }));

/**
 * `POST /api/revalidate` — purge du cache d'une carte vendeur.
 *
 * Cette route est **publique et non authentifiée par une session** : sa seule
 * protection est un secret partagé. Les tests portent donc autant sur ce qu'elle
 * refuse que sur ce qu'elle fait.
 */
describe('POST /api/revalidate', () => {
  const SECRET = 'un-secret-assez-long-pour-passer';

  const post = async (
    body: unknown,
    headers: Record<string, string> = {},
    raw?: string,
  ) => {
    const { POST } = await import('./route');
    return POST(
      new Request('https://liliafood.com/api/revalidate', {
        method: 'POST',
        headers,
        body: raw ?? JSON.stringify(body),
      }),
    );
  };

  beforeEach(() => {
    vi.resetModules();
    revalidateTag.mockClear();
    process.env.WEB_REVALIDATE_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.WEB_REVALIDATE_SECRET;
  });

  it('purge la carte du vendeur ET les listes où il figure', async () => {
    const res = await post(
      { restaurantId: 'v1', reason: 'product.updated' },
      { 'x-revalidate-secret': SECRET },
    );

    expect(res.status).toBe(200);
    // Deux étiquettes : la fiche, et l'accueil/catalogue où son statut
    // d'ouverture et son image apparaissent aussi.
    // Le profil est passé explicitement : depuis Next 16 il est obligatoire,
    // et il doit correspondre au `cacheLife` posé sur ces entrées — sinon la
    // purge est annulée en pratique par un profil plus long.
    expect(revalidateTag).toHaveBeenCalledWith('vendor-v1', 'minutes');
    expect(revalidateTag).toHaveBeenCalledWith('vendors', 'minutes');
  });

  describe('refus', () => {
    it('401 sans secret dans l’en-tête', async () => {
      const res = await post({ restaurantId: 'v1' });
      expect(res.status).toBe(401);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('401 avec un mauvais secret', async () => {
      const res = await post(
        { restaurantId: 'v1' },
        { 'x-revalidate-secret': 'mauvais' },
      );
      expect(res.status).toBe(401);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('401 sur un secret de bonne longueur mais faux', async () => {
      // Garde la comparaison à temps constant honnête : même longueur, un seul
      // octet différent.
      const presque = SECRET.slice(0, -1) + 'X';
      const res = await post(
        { restaurantId: 'v1' },
        { 'x-revalidate-secret': presque },
      );
      expect(res.status).toBe(401);
    });

    /**
     * ⚠️ La propriété la plus importante de cette suite.
     *
     * Sans secret configuré, la route est **fermée**, pas ouverte. Accepter les
     * appels quand aucun secret n'est posé transformerait un oubli de
     * configuration en purge accessible à tous — donc en amplificateur de
     * charge vers le backend.
     */
    it('503 et aucune purge quand le secret n’est pas configuré', async () => {
      delete process.env.WEB_REVALIDATE_SECRET;

      const res = await post(
        { restaurantId: 'v1' },
        { 'x-revalidate-secret': 'peu importe' },
      );

      expect(res.status).toBe(503);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('400 si le corps n’est pas du JSON', async () => {
      const res = await post(
        null,
        { 'x-revalidate-secret': SECRET },
        'pas du json',
      );
      expect(res.status).toBe(400);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('400 sans restaurantId exploitable', async () => {
      for (const body of [{}, { restaurantId: '' }, { restaurantId: 42 }]) {
        revalidateTag.mockClear();
        const res = await post(body, { 'x-revalidate-secret': SECRET });
        expect(res.status).toBe(400);
        expect(revalidateTag).not.toHaveBeenCalled();
      }
    });
  });
});
