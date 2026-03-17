# Frontend Feature Architecture

## Directory Layout

```
apps/web/
├── app/
│   ├── trpc/                   # tRPC wiring (server.ts, client.tsx, query-client.ts)
│   ├── layout.tsx              # Root layout — mounts TRPCReactProvider
│   └── (routes)/               # Next.js route segments
│
├── features/
│   └── [feature-name]/
│       ├── views/              # Full-page view components (one per route)
│       ├── components/         # UI components specific to this feature
│       ├── hooks/
│       │   ├── ui/             # UI-only hooks (no API calls, e.g. useFilterState)
│       │   └── http/           # tRPC hooks — all API calls live here
│       └── store/              # Zustand stores scoped to this feature
│
├── components/
│   └── ui/                     # Shared components: shadcn/ui + any cross-feature components
│
├── hooks/                      # Global shared hooks (used across features)
├── store/                      # Global Zustand stores
└── packages/types/             # @spexs/types — shared types across frontend + backend
```

---

## Views (`features/[feature]/views/`)

The view is the boundary between Next.js routing and the feature. It owns:
- Server-side prefetching into the QueryClient
- `HydrationBoundary` wrapping
- Composing feature components

The Next.js `page.tsx` simply re-exports or renders the view — no logic lives in `page.tsx` itself.

```tsx
// app/users/page.tsx
export { UsersView as default } from '@/features/users/views/users-view';

// features/users/views/users-view.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient, trpc } from '@/app/trpc/server';
import { UsersList } from '../components/users-list';

export default async function UsersView() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.users.list.queryOptions({ page: 1 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersList />
    </HydrationBoundary>
  );
}
```

---

## HTTP Hooks (`features/[feature]/hooks/http/`)

All tRPC calls are encapsulated here. Exports two things per procedure:
1. A **Suspense hook** — uses `useSuspenseQuery`, assumes data is prefetched (no loading state needed)
2. A **standard hook** — uses `useQuery`, includes loading/error state

```ts
// features/users/hooks/http/use-users-list.ts
'use client';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

// Use inside a Suspense boundary — throws until data is ready (resolves instantly when prefetched)
export function useUsersListSuspense(params: { page: number }) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.users.list.queryOptions(params));
}

// Use outside a Suspense boundary — exposes isLoading/isError
export function useUsersList(params: { page: number }) {
  const trpc = useTRPC();
  return useQuery(trpc.users.list.queryOptions(params));
}
```

Mutations also live in `hooks/http/`:

```ts
// features/users/hooks/http/use-create-user.ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function useCreateUser() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.users.create.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
      },
    }),
  );
}
```

---

## UI Hooks (`features/[feature]/hooks/ui/`)

Pure UI state — no API calls. Examples: form state, filter state, modal open/close.

```ts
// features/users/hooks/ui/use-user-filters.ts
import { useState } from 'react';

export function useUserFilters() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>();
  return { search, setSearch, role, setRole };
}
```

---

## Components (`features/[feature]/components/`)

Feature-specific components. They consume hooks from `hooks/http/` and `hooks/ui/`.
Never call `useTRPC` / `useQuery` directly in a component — always go through a hook in `hooks/http/`.

```tsx
// features/users/components/users-list.tsx
'use client';
import { useUsersListSuspense } from '../hooks/http/use-users-list';

export function UsersList() {
  const { data } = useUsersListSuspense({ page: 1 });
  return <ul>{data.users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## Shared vs Feature-scoped

| Thing | Where it lives |
|---|---|
| shadcn components, shared UI | `components/ui/` |
| Cross-feature components | `components/` |
| Global hooks | `hooks/` |
| Global Zustand store | `store/` |
| Feature components | `features/[feature]/components/` |
| Feature UI hooks | `features/[feature]/hooks/ui/` |
| Feature tRPC hooks | `features/[feature]/hooks/http/` |
| Feature Zustand store | `features/[feature]/store/` |
| Types shared across apps | `packages/types/` (`@spexs/types`) |

---

## Rules

- `page.tsx` contains no logic — delegates entirely to a view in `features/`.
- Prefetch + `HydrationBoundary` always live in the view, never in a component.
- tRPC args in the view's `prefetchQuery` call must exactly match the args used in the corresponding `hooks/http/` hook. See [cache-key-rule.md](./cache-key-rule.md).
- Never import from `app/trpc/server` in a client component — server-only imports will throw.
- Never call `useTRPC()` directly in a component — wrap it in a hook in `hooks/http/`.
- Types shared between frontend and backend go in `packages/types` (`@spexs/types`), not inside `apps/`.
