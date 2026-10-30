import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient, declareOrderFlowCapability } from './client';

/**
 * Lot 3 — la capacité « accepter puis payer » est déclarée par application,
 * jamais par défaut : le site client, qui ne l'appelle pas, reste dans le
 * parcours historique (`PAY_FIRST`).
 */
describe('X-Lilia-Order-Flow', () => {
  const sent = async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await apiClient('/x');
    return (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
  };

  afterEach(() => {
    declareOrderFlowCapability(null);
    vi.unstubAllGlobals();
  });

  it('absent par défaut', async () => {
    expect((await sent())['X-Lilia-Order-Flow']).toBeUndefined();
  });

  it('envoyé une fois déclaré (back-office)', async () => {
    declareOrderFlowCapability('accept-first');
    expect((await sent())['X-Lilia-Order-Flow']).toBe('accept-first');
  });
});
