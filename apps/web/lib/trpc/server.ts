import 'server-only';

import type { AppRouter } from '@api/trpc';
import { env } from '@env';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { headers } from 'next/headers';
import { cache } from 'react';
import SuperJSON from 'superjson';
import { makeQueryClient } from './query-client';

// Stable per-request query client (React cache dedups across the same request)
export const getQueryClient = cache(makeQueryClient);

const TRPC_PATH = '/trpc';
const COOKIE_HEADER_NAME = 'cookie';

function getServerUrl() {
  return `${env.NEXT_PUBLIC_API_URL}${TRPC_PATH}`;
}

async function createServerSideRequestHeaders(
  requestHeaders: RequestInit['headers'],
): Promise<Headers> {
  const incomingHeaders = await headers();
  const outgoingHeaders = new Headers(requestHeaders);

  const cookieHeader = incomingHeaders.get(COOKIE_HEADER_NAME);
  if (cookieHeader !== null) {
    outgoingHeaders.set(COOKIE_HEADER_NAME, cookieHeader);
  }

  return outgoingHeaders;
}

// Direct caller for server components (await trpcClient.hello.query(...))
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getServerUrl(),
      transformer: SuperJSON,
      fetch: async (url, options) =>
        fetch(url, {
          ...options,
          headers: await createServerSideRequestHeaders(options?.headers),
        }),
    }),
  ],
});

// Proxy for prefetching into queryClient (trpc.hello.queryOptions(...))
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient,
});
