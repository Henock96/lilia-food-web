import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { bindSessionQueryClient, useMutation } from './session-query';
import { SessionObsoleteError } from './auth-session';
import { ApiError } from './client';

let client: QueryClient;
vi.mock('@tanstack/react-query', async (original) => {
  const actual = await original<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => client,
    // Exercise the production wrapper against the real mutation state machine,
    // replacing only React's subscription/render layer for the Node suite.
    useMutation: (options: Parameters<typeof actual.useMutation>[0], queryClient: QueryClient) => {
      const observer = new actual.MutationObserver(queryClient, options);
      observer.subscribe(() => {});
      return { mutate: (v: unknown, o: never) => { void observer.mutate(v, o).catch(() => {}); }, mutateAsync: (v: unknown, o: never) => observer.mutate(v, o) };
    },
  };
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
afterEach(() => client?.clear());

describe('session mutation fencing', () => {
  it('rejects a late mutation and suppresses both hook and caller callbacks', async () => {
    client = new QueryClient(); let current = true;
    bindSessionQueryClient(client, { isCurrent: () => current });
    const pending = deferred<string>(), success = vi.fn(), error = vi.fn(), settled = vi.fn(), caller = vi.fn();
    const mutation = useMutation({ mutationFn: () => pending.promise, onSuccess: success, onError: error, onSettled: settled });
    const result = mutation.mutateAsync(undefined, { onSuccess: caller, onError: caller, onSettled: caller });
    await Promise.resolve(); current = false; pending.resolve('A');
    await expect(result).rejects.toBeInstanceOf(SessionObsoleteError);
    expect(success).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); expect(settled).not.toHaveBeenCalled(); expect(caller).not.toHaveBeenCalled();
  });
  it('does not issue the write when the identity changes during optimistic onMutate', async () => {
    client = new QueryClient(); let current = true;
    bindSessionQueryClient(client, { isCurrent: () => current });
    const pending = deferred<void>(), write = vi.fn(async () => 'ok');
    const mutation = useMutation({ mutationFn: write, onMutate: () => pending.promise });
    const result = mutation.mutateAsync(undefined);
    await Promise.resolve(); current = false; pending.resolve();
    await expect(result).rejects.toBeInstanceOf(SessionObsoleteError); expect(write).not.toHaveBeenCalled();
  });
  it('keeps valid-session callbacks and return values', async () => {
    client = new QueryClient(); bindSessionQueryClient(client, { isCurrent: () => true });
    const success = vi.fn(); const mutation = useMutation({ mutationFn: async () => 'B', onSuccess: success });
    await expect(mutation.mutateAsync(undefined)).resolves.toBe('B'); expect(success).toHaveBeenCalledOnce();
  });
  it('keeps the unbound admin QueryClient behavior', async () => {
    client = new QueryClient(); const success = vi.fn();
    const mutation = useMutation({ mutationFn: async () => 'admin', onSuccess: success });
    await expect(mutation.mutateAsync(undefined)).resolves.toBe('admin'); expect(success).toHaveBeenCalledOnce();
  });
  it('binds idempotently without replacing the original identity guard', async () => {
    client = new QueryClient(); bindSessionQueryClient(client, { isCurrent: () => false });
    bindSessionQueryClient(client, { isCurrent: () => true });
    const write = vi.fn(async () => 'wrong identity');
    const mutation = useMutation({ mutationFn: write });
    await expect(mutation.mutateAsync(undefined)).rejects.toBeInstanceOf(SessionObsoleteError);
    expect(write).not.toHaveBeenCalled();
  });
  it('does not replay an unauthorized mutation even when retry was requested', async () => {
    client = new QueryClient(); bindSessionQueryClient(client, { isCurrent: () => true });
    const write = vi.fn(async () => { throw new ApiError(401, 'Expired'); });
    const mutation = useMutation({ mutationFn: write, retry: 3 });
    await expect(mutation.mutateAsync(undefined)).rejects.toBeInstanceOf(ApiError);
    expect(write).toHaveBeenCalledTimes(1);
  });

});
