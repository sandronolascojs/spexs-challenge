# tRPC Setup — Server and Client

## Server (`app/trpc/server.ts`)

```ts
import 'server-only';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { createTRPCClient, httpLink } from '@trpc/client';
import SuperJSON from 'superjson';
import { cache } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from '@api/trpc/trpc.router';

// One QueryClient per request (React cache deduplicates within a request)
export const getQueryClient = cache(makeQueryClient);

// Direct HTTP client for Server Components (no React Query)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: `${process.env.API_URL}/trpc`, transformer: SuperJSON })],
});

// Proxy for prefetching — produces queryOptions/mutationOptions bound to the request's QueryClient
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: getQueryClient,
});
```

- `trpcClient` → use for direct `await trpcClient.X.query(args)` in Server Components
- `trpc` → use for `trpc.X.queryOptions(args)` when prefetching into the QueryClient

## Client (`app/trpc/client.tsx`)

```ts
'use client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { QueryClientProvider } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import type { AppRouter } from '@api/trpc/trpc.router';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient(); // singleton in browser
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`, transformer: SuperJSON })],
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
```

- `useTRPC()` → the hook for client components; returns the same proxy shape as `trpc` on the server
- `httpBatchLink` batches multiple client queries into one HTTP request

## QueryClient (`app/trpc/query-client.ts`)

Key settings:
- `staleTime: 30_000` — avoids refetch on mount after SSR hydration
- `shouldDehydrateQuery` includes `status === 'pending'` — enables streaming prefetches
- SuperJSON for serialize/deserialize — handles non-JSON types across the wire
