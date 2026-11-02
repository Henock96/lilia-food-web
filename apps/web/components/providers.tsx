'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';
import { AuthProvider } from './auth-provider';
import { bindSessionQueryClient, declareOrderFlowCapability } from '@lilia/api-client';
import { getBrowserSession } from '@/lib/auth-session';
import { useAuthStore } from '@/store/auth';
import { usePathname } from 'next/navigation';

// This application now waits for the restaurant before offering payment.
declareOrderFlowCapability('accept-first');

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><SessionData>{children}</SessionData></AuthProvider>;
}

function SessionData({ children }: { children: React.ReactNode }) {
  const state = useAuthStore();
  const pathname = usePathname();
  const queryClient = getQueryClient();
  bindSessionQueryClient(queryClient, { isCurrent: () =>
    typeof window !== 'undefined' && getBrowserSession().isCurrent(state) });
  // Forms completing Firebase login own their continuation. All other local
  // private state is remounted on an identity boundary, including public cards.
  const authForm = pathname === '/connexion' || pathname === '/inscription';
  const boundary = authForm ? `auth-form:${state.formResetKey}` : `${state.uid ?? 'anonymous'}:${state.generation}:${state.phase}`;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContent key={boundary}>{children}</SessionContent>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function SessionContent({ children }: { children: React.ReactNode }) {
  return children;
}
