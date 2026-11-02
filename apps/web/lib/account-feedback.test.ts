import { ApiError } from '@lilia/api-client';
import { describe, expect, it, vi } from 'vitest';
import { collectionReadState, runVisibleMutation, mutationErrorMessage } from './account-feedback';

describe('cart reads do not invent an empty state', () => {
  it('distinguishes loading, failed/missing reads and a confirmed empty cart', () => {
    expect(collectionReadState(undefined, true, false)).toBe('loading');
    expect(collectionReadState(undefined, false, true)).toBe('error');
    expect(collectionReadState(undefined, false, false)).toBe('error');
    expect(collectionReadState({ items: [] }, false, true)).toBe('error');
    expect(collectionReadState({ items: [] }, false, false)).toBe('ready');
    expect(collectionReadState({ items: [{ id: 'one' }] }, false, true)).toBe('error');
  });
});

describe('cart/account mutation feedback', () => {
  it('consumes rejection, shows failure, never announces success and permits a deliberate retry', async () => {
    const gate = { current: false };
    const onError = vi.fn(); const onSuccess = vi.fn();
    const run = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const options = { gate, isCurrent: () => true, run, onError, onSuccess };
    await expect(runVisibleMutation(options)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce(); expect(onSuccess).not.toHaveBeenCalled();
    expect(gate.current).toBe(false);
    await runVisibleMutation(options);
    expect(run).toHaveBeenCalledTimes(2); expect(onSuccess).toHaveBeenCalledOnce();
  });
  it('serializes rapid duplicate clicks while waiting for server confirmation', async () => {
    let finish!: () => void;
    const run = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const options = { gate: { current: false }, isCurrent: () => true, run, onError: vi.fn(), onSuccess: vi.fn() };
    const first = runVisibleMutation(options);
    await runVisibleMutation(options);
    expect(run).toHaveBeenCalledOnce(); expect(options.onSuccess).not.toHaveBeenCalled();
    finish(); await first; expect(options.onSuccess).toHaveBeenCalledOnce();
  });
  it.each([true, false])('suppresses feedback from a previous session (success=%s)', async (success) => {
    let current = true;
    const options = { gate: { current: false }, isCurrent: () => current,
      run: async () => { current = false; if (!success) throw new Error('offline'); },
      onError: vi.fn(), onSuccess: vi.fn() };
    await runVisibleMutation(options);
    expect(options.onError).not.toHaveBeenCalled(); expect(options.onSuccess).not.toHaveBeenCalled();
    await runVisibleMutation({ ...options, run: async () => { throw new Error('must not start'); } });
  });
  it('handles unavailable clipboard synchronously without a false copied message', async () => {
    const onSuccess = vi.fn(); const onError = vi.fn();
    await runVisibleMutation({ gate: { current: false }, isCurrent: () => true,
      run: () => { throw new TypeError('clipboard unavailable'); }, onSuccess, onError });
    expect(onError).toHaveBeenCalledOnce(); expect(onSuccess).not.toHaveBeenCalled();
  });
});

it('preserves a server business rejection while using a safe fallback for transport errors', async () => {
  const stock = new ApiError(409, 'Stock insuffisant', 'OUT_OF_STOCK');
  const feedback = vi.fn();
  for (const error of [stock, new TypeError('private transport details')]) {
    await runVisibleMutation({ gate: { current: false }, isCurrent: () => true,
      run: async () => { throw error; },
      onError: (caught) => feedback(mutationErrorMessage(caught, 'Connexion interrompue')) });
  }
  expect(feedback.mock.calls).toEqual([['Stock insuffisant'], ['Connexion interrompue']]);
});
