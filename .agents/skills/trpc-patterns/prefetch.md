# Server-Side Prefetch + HydrationBoundary

## Pattern

```ts
// app/some/page.tsx — Server Component
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient, trpc, trpcClient } from '@/app/trpc/server';
import { SomeClientComponent } from './_components/some-client';

export default async function Page() {
  const queryClient = getQueryClient();

  // Fire-and-forget: do NOT await. The prefetch runs concurrently with rendering.
  // The result is dehydrated and streamed to the client automatically.
  void queryClient.prefetchQuery(trpc.someRoute.queryOptions(args));

  // Optional: direct call for data only needed in the Server Component itself.
  // This is a plain HTTP call — no React Query involved.
  const serverOnlyData = await trpcClient.someRoute.query(args);

  return (
    <>
      <ServerOnlySection data={serverOnlyData} />

      {/* HydrationBoundary sends the dehydrated cache to client components */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SomeClientComponent />
      </HydrationBoundary>
    </>
  );
}
```

## Rules

- Always `void` the prefetch — never `await` it at the top level (it would block streaming).
- `getQueryClient()` uses `React.cache()` so it returns the same instance within one request.
- `dehydrate(queryClient)` captures both settled and pending (streaming) queries because
  `makeQueryClient` sets `shouldDehydrateQuery` to include `status === 'pending'`.
- The args in `trpc.someRoute.queryOptions(args)` **must match** the client's `useQuery` args.
  See [cache-key-rule.md](./cache-key-rule.md).

## Multiple prefetches

```ts
// Parallel prefetches — both fire immediately
void queryClient.prefetchQuery(trpc.users.list.queryOptions({ page: 1 }));
void queryClient.prefetchQuery(trpc.stats.summary.queryOptions());
```
