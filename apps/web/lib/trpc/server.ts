import 'server-only';

import type { AppRouter } from '@api/trpc';
import { env } from '@env';
import { createTRPCClient, httpLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import SuperJSON from 'superjson';
import { makeQueryClient } from './query-client';

// Stable per-request query client (React cache dedups across the same request)
export const getQueryClient = cache(makeQueryClient);

function getServerUrl() {
  return `${env.NEXT_PUBLIC_API_URL}/trpc`;
}

// Direct caller for server components (await trpcClient.hello.query(...))
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: getServerUrl(), transformer: SuperJSON })],
});

// Proxy for prefetching into queryClient (trpc.hello.queryOptions(...))
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient,
});
