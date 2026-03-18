'use client';

import type { AppRouter } from '@api/trpc';
import { env } from '@env';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import SuperJSON from 'superjson';
import { makeQueryClient } from './query-client';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// Singleton browser query client — never recreate to avoid losing cache on Suspense
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always a fresh client per render
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

function getApiUrl() {
  return `${env.NEXT_PUBLIC_API_URL}/trpc`;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: getApiUrl(),
          transformer: SuperJSON,
          fetch: (url, options) =>
            fetch(url, {
              ...options,
              credentials: 'include',
            }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
