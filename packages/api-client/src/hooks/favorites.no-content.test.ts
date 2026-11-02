import { QueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { favoriteKeys, useToggleFavorite } from './favorites';
const state = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('../session-query', () => ({
  useQueryClient: () => state.client,
  useMutation: (options: unknown) => options,
  useQuery: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());
describe('favorite deletion HTTP outcome', () => {
  it.each([204, 500])('HTTP %s invalidates; only failure rolls back', async status => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    state.client = client;
    const favorite = { id: 'restaurant-1' };
    client.setQueryData(favoriteKeys.all, [favorite]);
    let release!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { release = resolve; })));
    // Execute actual hook callbacks through the real TanStack mutation lifecycle.
    const options = useToggleFavorite('synthetic') as unknown as UseMutationOptions<void, Error, { restaurantId: string; isFavorite: boolean }, unknown>;
    const invalidation = vi.spyOn(client, 'invalidateQueries');
    const mutation = client.getMutationCache().build(client, options);
    const completion = mutation.execute({ restaurantId: favorite.id, isFavorite: true }).then(() => 'success', () => 'error');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(client.getQueryData(favoriteKeys.all)).toEqual([]);
    release(new Response(status === 204 ? null : JSON.stringify({ message: 'failed' }), { status }));
    expect(await completion).toBe(status === 204 ? 'success' : 'error');
    expect(client.getQueryData(favoriteKeys.all)).toEqual(status === 204 ? [] : [favorite]);
    expect(invalidation).toHaveBeenCalledWith({ queryKey: favoriteKeys.all });
    client.clear();
  });
});
