import { describe, expect, it } from 'vitest';

import {
  REFUNDS_PAGE_SIZE,
  nextRefundStatuses,
  refundRequiresNote,
  refundUpdateRequest,
  refundsQueryOptions,
} from './refunds';

/**
 * File des remboursements.
 *
 * `apps/admin` n'appelait **aucune** route `/refunds`. Or c'est le Web qui
 * porte le bouton « Annuler » d'une commande payée — lequel ouvre un
 * remboursement. Un administrateur créait donc, depuis le Web, une dette envers
 * un client qu'il ne pouvait ensuite voir que dans l'application Flutter. De
 * l'argent dû pouvait rester en attente indéfiniment sans qu'aucun signal
 * n'apparaisse sur la surface où le geste avait été fait (audit du 09/09/2026,
 * blocker n°4).
 */
describe('refundsQueryOptions', () => {
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

  it('demande explicitement une page et une taille de page', async () => {
    const { urls, fetchPage } = spy();

    await refundsQueryOptions({ token: 'tok', page: 2, fetchPage }).queryFn();

    expect(urls).toEqual([
      `/refunds?page=2&limit=${REFUNDS_PAGE_SIZE}`,
    ]);
  });

  it('transmet le filtre de statut au serveur', async () => {
    const { urls, fetchPage } = spy();

    await refundsQueryOptions({
      token: 'tok',
      page: 1,
      status: 'PENDING',
      fetchPage,
    }).queryFn();

    expect(urls[0]).toContain('&status=PENDING');
  });

  it('n’ajoute pas de statut sur la vue « tous »', async () => {
    const { urls, fetchPage } = spy();

    await refundsQueryOptions({
      token: 'tok',
      page: 1,
      status: 'ALL',
      fetchPage,
    }).queryFn();

    expect(urls[0]).not.toContain('status=');
  });

  it('rapporte le total serveur, pas le nombre de lignes reçues', async () => {
    // C'est ce chiffre que lira le badge : 57 clients attendent leur argent,
    // pas 2. Le badge Flutter comptait les éléments et plafonnait à la taille
    // d'une page — on ne refait pas l'erreur.
    const { fetchPage } = spy({
      data: [{ id: 'r1' }, { id: 'r2' }],
      meta: { page: 1, limit: 20, total: 57 },
    });

    const res = await refundsQueryOptions({
      token: 'tok',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(res.meta.total).toBe(57);
    expect(res.data).toHaveLength(2);
  });

  it('dérive totalPages — le serveur ne l’envoie pas sur cette route', async () => {
    const { fetchPage } = spy({
      data: [],
      meta: { page: 1, limit: 20, total: 57 },
    });

    const res = await refundsQueryOptions({
      token: 'tok',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(res.meta.totalPages).toBe(3);
  });

  it('annonce au moins une page sur une file vide', async () => {
    const { fetchPage } = spy({ data: [], meta: { page: 1, limit: 20, total: 0 } });

    const res = await refundsQueryOptions({
      token: 'tok',
      page: 1,
      fetchPage,
    }).queryFn();

    expect(res.meta.totalPages).toBe(1);
  });

  it('ne part pas sans jeton', () => {
    expect(refundsQueryOptions({ token: null, page: 1 }).enabled).toBe(false);
    expect(refundsQueryOptions({ token: 'tok', page: 1 }).enabled).toBe(true);
  });

  it('sépare les caches par page et par statut', () => {
    const p1 = refundsQueryOptions({ token: 't', page: 1 }).queryKey;
    const p2 = refundsQueryOptions({ token: 't', page: 2 }).queryKey;
    const pending = refundsQueryOptions({
      token: 't',
      page: 1,
      status: 'PENDING',
    }).queryKey;

    expect(p1).not.toEqual(p2);
    expect(p1).not.toEqual(pending);
  });
});

describe('nextRefundStatuses', () => {
  it('propose le virement en cours et les deux issues sur un PENDING', () => {
    expect(nextRefundStatuses('PENDING')).toEqual([
      'PROCESSING',
      'COMPLETED',
      'REJECTED',
    ]);
  });

  it('ne propose plus « virement en cours » sur un PROCESSING', () => {
    // Le geste a déjà été fait ; il ne reste qu'à dire s'il a abouti.
    expect(nextRefundStatuses('PROCESSING')).toEqual(['COMPLETED', 'REJECTED']);
  });

  it('ne propose rien sur un remboursement clos', () => {
    // Miroir du 409 serveur : « Ce remboursement est déjà clos ». Un bouton
    // qui mène à un conflit n'apprend rien.
    expect(nextRefundStatuses('COMPLETED')).toEqual([]);
    expect(nextRefundStatuses('REJECTED')).toEqual([]);
  });
});

describe('refundRequiresNote', () => {
  it('exige un motif pour un refus', () => {
    // Le serveur accepte `notes` vide. Un refus sans motif est pourtant
    // inexplicable trois mois plus tard, quand le client rappelle — c'est
    // l'interface qui pose la règle, faute de mieux.
    expect(refundRequiresNote('REJECTED')).toBe(true);
  });

  it('n’exige rien pour les autres transitions', () => {
    expect(refundRequiresNote('PROCESSING')).toBe(false);
    expect(refundRequiresNote('COMPLETED')).toBe(false);
  });
});

describe('refundUpdateRequest', () => {
  it('poste le statut et le motif', () => {
    expect(refundUpdateRequest('r1', 'REJECTED', 'Commande consommée')).toEqual({
      path: '/refunds/r1/status',
      body: { status: 'REJECTED', notes: 'Commande consommée' },
    });
  });

  it('omet un motif vide plutôt que d’écraser celui déjà en base', () => {
    // `updateStatus` fait `notes: notes ?? refund.notes` : envoyer une chaîne
    // vide effacerait le motif écrit à l'étape précédente.
    expect(refundUpdateRequest('r1', 'COMPLETED', '   ')).toEqual({
      path: '/refunds/r1/status',
      body: { status: 'COMPLETED' },
    });
    expect(refundUpdateRequest('r1', 'COMPLETED')).toEqual({
      path: '/refunds/r1/status',
      body: { status: 'COMPLETED' },
    });
  });
});
