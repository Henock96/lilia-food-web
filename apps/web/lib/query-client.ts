import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Retired identity generations never reuse a cache, even for the same UID. */
export function retireQueryClient() {
  const retired = browserQueryClient;
  browserQueryClient = undefined;
  if (retired) {
    void retired.cancelQueries();
    retired.clear();
  }
}

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
