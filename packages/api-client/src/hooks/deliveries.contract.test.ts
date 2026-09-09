import { describe, expect, it } from 'vitest';

import { ApiError } from '../client';
import {
  assignDelivererRequest,
  assignSuccessMessage,
  canAssignDeliverer,
  orderDeliveryQueryOptions,
} from './deliveries';

/**
 * Assignation de livreur depuis le Web Admin.
 *
 * Le dépôt `lilia-food-web` n'appelait **aucune** route `/deliveries/*` : le
 * geste le plus fréquent de la journée d'un opérateur — confier une course
 * prête à un livreur — n'existait que dans l'application Flutter (audit du
 * 09/09/2026, blocker n°3).
 */
describe('orderDeliveryQueryOptions', () => {
  function spyThrowing(error: unknown) {
    return async () => {
      throw error;
    };
  }

  it('lit la course d’une commande', async () => {
    const paths: string[] = [];
    const fetchDelivery = async (path: string) => {
      paths.push(path);
      return { id: 'd1', status: 'ASSIGNER' } as never;
    };

    const res = await orderDeliveryQueryOptions({
      orderId: 'o1',
      token: 'tok',
      fetchDelivery,
    }).queryFn();

    expect(paths).toEqual(['/deliveries/by-order/o1']);
    expect(res?.id).toBe('d1');
  });

  it('traduit le 404 en « aucune course », qui est un cas normal', async () => {
    // Le backend répond 404 tant qu'aucun livreur n'a été assigné. C'est
    // l'état de départ de toute commande, pas une anomalie.
    const res = await orderDeliveryQueryOptions({
      orderId: 'o1',
      token: 'tok',
      fetchDelivery: spyThrowing(new ApiError(404, 'Aucune livraison trouvée')),
    }).queryFn();

    expect(res).toBeNull();
  });

  it('NE dissimule PAS un 403 derrière « aucune course »', async () => {
    // C'est le défaut relevé côté Flutter : un `catch (_) { return null; }`
    // rendait un refus d'accès, une panne serveur et une coupure réseau
    // indiscernables d'une commande sans livreur. L'écran affichait « Aucun
    // livreur assigné » sur une commande qui en avait peut-être un.
    await expect(
      orderDeliveryQueryOptions({
        orderId: 'o1',
        token: 'tok',
        fetchDelivery: spyThrowing(new ApiError(403, 'Accès refusé')),
      }).queryFn(),
    ).rejects.toThrow('Accès refusé');
  });

  it('NE dissimule PAS une panne serveur', async () => {
    await expect(
      orderDeliveryQueryOptions({
        orderId: 'o1',
        token: 'tok',
        fetchDelivery: spyThrowing(new ApiError(500, 'Erreur interne')),
      }).queryFn(),
    ).rejects.toThrow('Erreur interne');
  });

  it('NE dissimule PAS une coupure réseau', async () => {
    await expect(
      orderDeliveryQueryOptions({
        orderId: 'o1',
        token: 'tok',
        fetchDelivery: spyThrowing(new TypeError('Failed to fetch')),
      }).queryFn(),
    ).rejects.toThrow('Failed to fetch');
  });

  it('ne part pas sans jeton ni sans commande', () => {
    expect(
      orderDeliveryQueryOptions({ orderId: 'o1', token: null }).enabled,
    ).toBe(false);
    expect(orderDeliveryQueryOptions({ orderId: '', token: 'tok' }).enabled).toBe(
      false,
    );
    expect(
      orderDeliveryQueryOptions({ orderId: 'o1', token: 'tok' }).enabled,
    ).toBe(true);
  });
});

describe('assignDelivererRequest', () => {
  it('vise la route par commande — elle crée la course si besoin', () => {
    // `PATCH /deliveries/:id/assign` exige une livraison existante ;
    // `by-order` la crée au passage. Une commande sans livraison est le cas
    // le plus courant au moment où l'on assigne.
    expect(assignDelivererRequest('o1', 'd9')).toEqual({
      path: '/deliveries/by-order/o1/assign',
      body: { delivererId: 'd9' },
    });
  });
});

describe('assignSuccessMessage', () => {
  it('reprend le message du serveur', () => {
    // Il distingue « Livreur assigné avec succès » de « Livreur réassigné — le
    // précédent a été libéré ». La seconde information dit à l'opérateur que
    // quelqu'un vient d'être décroché d'une course : la remplacer par un
    // libellé maison la ferait disparaître.
    expect(
      assignSuccessMessage({
        data: { id: 'd1' } as never,
        message: 'Livreur réassigné — le précédent a été libéré',
      }),
    ).toBe('Livreur réassigné — le précédent a été libéré');
  });

  it('retombe sur un libellé neutre si le serveur n’en envoie pas', () => {
    expect(assignSuccessMessage({ data: { id: 'd1' } as never })).toBe(
      'Livreur assigné',
    );
  });
});

describe('canAssignDeliverer', () => {
  it('autorise les quatre statuts que le serveur accepte', () => {
    // Miroir exact d'`assignableStatuses` dans `DeliveryAssignmentService` :
    // un bouton que l'API refusera par un 400 n'apprend rien, sinon que
    // l'application est cassée.
    expect(canAssignDeliverer('PAYER', true)).toBe(true);
    expect(canAssignDeliverer('EN_PREPARATION', true)).toBe(true);
    expect(canAssignDeliverer('PRET', true)).toBe(true);
    expect(canAssignDeliverer('EN_ROUTE', true)).toBe(true);
  });

  it('refuse une commande non payée', () => {
    expect(canAssignDeliverer('EN_ATTENTE', true)).toBe(false);
  });

  it('refuse une commande terminée', () => {
    expect(canAssignDeliverer('LIVRER', true)).toBe(false);
    expect(canAssignDeliverer('ANNULER', true)).toBe(false);
  });

  it('refuse un retrait au comptoir', () => {
    // Une commande sans livraison n'a pas de livreur à assigner. Le serveur ne
    // l'interdit pas explicitement — c'est l'interface qui ne doit pas
    // proposer un geste dénué de sens.
    expect(canAssignDeliverer('PRET', false)).toBe(false);
  });
});
