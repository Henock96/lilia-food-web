import { ApiError } from '@lilia/api-client';

/** Only a successful read may establish an empty collection. */
export function collectionReadState(data: unknown, loading: boolean, failed: boolean): 'loading' | 'error' | 'ready' {
  if (loading) return 'loading';
  if (failed || data === undefined || data === null) return 'error';
  return 'ready';
}

/** Consume rejected UI actions, fence session changes and serialize rapid clicks. */
export async function runVisibleMutation(options: {
  gate: { current: boolean };
  isCurrent: () => boolean;
  run: () => Promise<unknown>;
  onError: (error: unknown) => void;
  onSuccess?: () => void;
}): Promise<void> {
  if (options.gate.current || !options.isCurrent()) return;
  options.gate.current = true;
  try {
    await options.run();
    if (options.isCurrent()) options.onSuccess?.();
  } catch (error) {
    if (options.isCurrent()) options.onError(error);
  } finally {
    options.gate.current = false;
  }
}

export function mutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
