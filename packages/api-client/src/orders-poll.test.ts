import { describe, expect, it, vi } from 'vitest';
import { useOrder } from './hooks/orders';

const captured = vi.hoisted(() => ({ options: null as null | {
  refetchInterval(query: { state: { data?: { status: string } } }): number | false;
} }));
vi.mock('./session-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('./session-query')>(),
  useQuery: (options: NonNullable<typeof captured.options>) => { captured.options = options; return {}; },
}));

describe('useOrder — suivi de la demande avant acceptation', () => {
  it('continue à interroger DEMANDE_ENVOYEE toutes les quinze secondes', () => {
    useOrder('synthetic-order', 'synthetic-token');
    expect(captured.options!.refetchInterval({ state: { data: { status: 'DEMANDE_ENVOYEE' } } })).toBe(15000);
  });
  it.each(['LIVRER', 'ANNULER', 'ECHEC_LIVRAISON'])('arrête le polling pour %s', (status) => {
    useOrder('synthetic-order', 'synthetic-token');
    expect(captured.options!.refetchInterval({ state: { data: { status } } })).toBe(false);
  });
});
