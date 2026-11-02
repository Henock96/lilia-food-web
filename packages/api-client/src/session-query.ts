'use client';

import * as Query from '@tanstack/react-query';
import { SessionObsoleteError } from './auth-session';

export * from '@tanstack/react-query';
export interface SessionQueryScope { isCurrent(): boolean }
const scopes = new WeakMap<Query.QueryClient, SessionQueryScope>();
/** Bind once: a QueryClient is never reassigned to another identity. */
export function bindSessionQueryClient(client: Query.QueryClient, scope: SessionQueryScope): void {
  if (scopes.has(client)) return; // StrictMode/rerenders retain the first immutable binding.
  scopes.set(client, scope);
}
function assertScope(scope: SessionQueryScope): void {
  if (!scope.isCurrent()) throw new SessionObsoleteError();
}
export const useQueryClient = Query.useQueryClient;

// Preserve TanStack's overloads at the public boundary (including select and initialData).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useQuery: typeof Query.useQuery = ((options: any, client?: Query.QueryClient) => {
  const queryClient = Query.useQueryClient(client);
  const scope = scopes.get(queryClient);
  const retry = options.retry ?? queryClient.getDefaultOptions().queries?.retry ?? 3;
  return Query.useQuery(scope ? {
    ...options,
    ...(typeof options.queryFn === 'function' ? {
      // The credential fences HTTP; this also fences query adapters that catch errors.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryFn: async (...args: any[]) => {
        assertScope(scope);
        try {
          const data = await options.queryFn(...args);
          assertScope(scope);
          return data;
        } catch (error) {
          assertScope(scope);
          throw error;
        }
      },
    } : {}),
    retry: (count: number, error: unknown) => {
      if (!scope.isCurrent() || error instanceof SessionObsoleteError ||
          (error && typeof error === 'object' && 'status' in error && (error.status === 401 || ('code' in error && ['ACCOUNT_REVOKED', 'ACCOUNT_NOT_SYNCED'].includes(String(error.code)))))) return false;
      if (typeof retry === 'function') return retry(count, error);
      return retry === true || (typeof retry === 'number' && count < retry);
    },
  } : options, queryClient);
}) as typeof Query.useQuery;

// Callback arguments are forwarded unchanged; the public type remains TanStack's generic contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useMutation: typeof Query.useMutation = ((options: any, client?: Query.QueryClient) => {
  const queryClient = Query.useQueryClient(client);
  const scope = scopes.get(queryClient);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callbacks = (value: any) => {
    if (!scope || !value) return value;
    const guarded = { ...value };
    for (const name of ['onSuccess', 'onError', 'onSettled']) {
      if (value[name]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        guarded[name] = (...args: any[]) => scope.isCurrent() ? value[name](...args) : undefined;
      }
    }
    return guarded;
  };
  const guarded = callbacks(options);
  if (scope) {
    if (options.onMutate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guarded.onMutate = async (...args: any[]) => {
        assertScope(scope);
        const result = await options.onMutate(...args);
        assertScope(scope);
        return result;
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guarded.mutationFn = async (...args: any[]) => {
      assertScope(scope);
      try {
        const result = await options.mutationFn(...args);
        assertScope(scope);
        return result;
      } catch (error) {
        assertScope(scope);
        throw error;
      }
    };
    const retry = options.retry ?? queryClient.getDefaultOptions().mutations?.retry ?? false;
    guarded.retry = (count: number, error: unknown) => {
      if (!scope.isCurrent() || error instanceof SessionObsoleteError ||
          (error && typeof error === 'object' && 'status' in error &&
            (error.status === 401 || ('code' in error && ['ACCOUNT_REVOKED', 'ACCOUNT_NOT_SYNCED'].includes(String(error.code)))))) return false;
      if (typeof retry === 'function') return retry(count, error);
      return retry === true || (typeof retry === 'number' && count < retry);
    };
  }
  const result = Query.useMutation(guarded, queryClient);
  if (!scope) return result;
  return {
    ...result,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutate: (variables: any, callOptions?: any) => {
      if (!scope.isCurrent()) return;
      result.mutate(variables, callbacks(callOptions));
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: async (variables: any, callOptions?: any) => {
      assertScope(scope);
      try {
        const data = await result.mutateAsync(variables, callbacks(callOptions));
        assertScope(scope);
        return data;
      } catch (error) {
        assertScope(scope);
        throw error;
      }
    },
  };
}) as typeof Query.useMutation;
