# Client Component: useQuery / useSuspenseQuery

## useQuery (with loading state)

```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function SomeComponent() {
  const trpc = useTRPC();

  const { data, isLoading, isFetching } = useQuery(
    trpc.someRoute.queryOptions(args),
  );

  if (isLoading) return <Skeleton />;
  return <div>{data?.value}</div>;
}
```

## useSuspenseQuery (with Suspense boundary)

Preferred when the server has prefetched — the data is already in cache, so Suspense
resolves immediately with no loading flash.

```ts
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function SomeComponent() {
  const trpc = useTRPC();

  // Never returns undefined — throws to Suspense boundary if not ready
  const { data } = useSuspenseQuery(trpc.someRoute.queryOptions(args));

  return <div>{data.value}</div>;
}
```

Wrap with a Suspense boundary in the parent Server Component:

```tsx
import { Suspense } from 'react';

<HydrationBoundary state={dehydrate(queryClient)}>
  <Suspense fallback={<Skeleton />}>
    <SomeComponent />
  </Suspense>
</HydrationBoundary>
```

## Rules

- Always call `useTRPC()` inside the component — do not call it at module level.
- The args must match what was prefetched on the server. See [cache-key-rule.md](./cache-key-rule.md).
- `queryOptions` returns a full TanStack Query options object — pass it directly to `useQuery`.
- Do not construct your own query keys manually; always use `trpc.X.queryOptions()`.
