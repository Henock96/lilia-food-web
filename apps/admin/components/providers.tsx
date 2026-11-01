'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { declareOrderFlowCapability } from '@lilia/api-client';
import { getQueryClient } from '@/lib/query-client';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';

// Lot 3 — ce back-office sait répondre à une demande (`DEMANDE_ENVOYEE`) :
// accepter avec un temps de préparation, ou refuser. Sans cette déclaration,
// le serveur lui répondrait `426` une fois « accepter puis payer » allumé.
// Le site client, lui, ne la fait pas : ses commandes restent `PAY_FIRST`.
declareOrderFlowCapability('accept-first');

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
