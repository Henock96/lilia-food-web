import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiClientRaw } from '@lilia/api-client';

/**
 * Le web s'annonce comme sachant conduire un paiement prestataire.
 *
 * Le serveur refuse d'ouvrir un encaissement pawaPay à un client qui ne
 * l'annonce pas (426 `CLIENT_UPGRADE_REQUIRED`). Cette garde existe parce que
 * les clients écrits pour le virement manuel affichaient leur consigne avec un
 * numéro **vide** pendant que le prestataire sollicitait réellement le
 * téléphone du client.
 *
 * Conséquence directe : si cet en-tête disparaissait du client web, **plus
 * aucun paiement ne serait possible depuis le site**. D'où ce test, qui vaut
 * moins pour ce qu'il vérifie que pour ce qu'il empêche de supprimer par
 * inadvertance.
 */
describe('apiClient — capacité de paiement annoncée', () => {
  const captureHeaders = () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const headersOf = (fetchMock: ReturnType<typeof captureHeaders>) =>
    (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> })
      .headers;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('apiClient envoie X-Lilia-Payment-Flow: provider', async () => {
    const fetchMock = captureHeaders();
    await apiClient('/payments', { method: 'POST', token: 't' });
    expect(headersOf(fetchMock)['X-Lilia-Payment-Flow']).toBe('provider');
  });

  it('apiClientRaw l’envoie aussi', async () => {
    // Les deux clients coexistent (l'un déballe `{ data }`, l'autre non) : un
    // en-tête posé dans un seul laisserait la moitié des appels muets.
    const fetchMock = captureHeaders();
    await apiClientRaw('/admin/payments', { token: 't' });
    expect(headersOf(fetchMock)['X-Lilia-Payment-Flow']).toBe('provider');
  });

  it('n’écrase ni le jeton ni le Content-Type', async () => {
    const fetchMock = captureHeaders();
    await apiClient('/payments', { method: 'POST', token: 'jeton' });
    const headers = headersOf(fetchMock);
    expect(headers.Authorization).toBe('Bearer jeton');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
