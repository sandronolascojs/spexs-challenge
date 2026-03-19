# spexs-challenge

Monorepo: Next.js frontend (`apps/web`) + NestJS tRPC API (`apps/api`).

## Code Quality — Non-Negotiable

The goal is never just code that works. Every file must be **clean, scalable, understandable,
extensible and maintainable** across time. Write as a senior engineer who will not be there
to explain it.

- **No magic strings or numbers** — use enums and named constants. See `.agents/skills/code-standards/no-magic-values.md`.
- **No `any`, no `unknown`, no `as` assertions** — every value is correctly typed from the source.
- **Zod schemas use `z.nativeEnum(Enum)`** — never re-declare enum values as string literals.
- **SOLID + DRY** — single responsibility, open/closed, dependency inversion, no duplication.
- **Short, single-purpose functions** — if you need "and" to describe it, split it.
- **Names reveal intent** — no abbreviations, no noise words (`data`, `manager`, `helper`).
- **Shared types in `@spexs/types`** — never duplicate domain types between apps.

Full rules: `.agents/skills/code-standards/`

## Stack

- **Frontend**: Next.js (App Router, React 19, TanStack React Query v5)
- **API**: NestJS with tRPC router exposed at `/trpc`
- **tRPC**: `@trpc/tanstack-react-query` v11 — RSC + remote server pattern
- **Serialization**: SuperJSON (handles dates, Sets, Maps, etc.)

## tRPC Data Fetching Patterns

This project uses tRPC with a **remote NestJS server** and the official RSC + TanStack Query pattern.
See `.agents/skills/trpc-patterns/` for full detail.

### Critical rule: prefetch key must match client query key

The args passed to `trpc.X.queryOptions(args)` on the server **must exactly match** what
the client component passes to `useQuery(trpc.X.queryOptions(args))` on mount.
A mismatch means the prefetched data is never used and the client starts with a loading state.

```ts
// ❌ BAD — server prefetches { name: 'World' }, client queries { name: undefined }
// server (page.tsx)
void queryClient.prefetchQuery(trpc.hello.queryOptions({ name: 'World' }));
// client (hello-client.tsx)
const [name] = useState<string | undefined>();
useQuery(trpc.hello.queryOptions({ name })); // key: { name: undefined } — cache miss!

// ✅ GOOD — same args on both sides
// server
void queryClient.prefetchQuery(trpc.hello.queryOptions({ name: undefined }));
// client
useQuery(trpc.hello.queryOptions({ name: undefined }));
```

### Server component: prefetch + direct call

```ts
// app/some/page.tsx (Server Component)
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient, trpc, trpcClient } from '@/app/trpc/server';

export default async function Page() {
  const queryClient = getQueryClient();

  // Fire-and-forget prefetch — result is dehydrated and streamed to client
  void queryClient.prefetchQuery(trpc.someRoute.queryOptions(args));

  // Direct call for data only needed server-side
  const serverData = await trpcClient.someRoute.query(args);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SomeClientComponent />
    </HydrationBoundary>
  );
}
```

### Client component: useTRPC + useQuery

```ts
// app/_components/some-client.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function SomeClientComponent() {
  const trpc = useTRPC();
  // args must match what was prefetched on the server
  const { data } = useQuery(trpc.someRoute.queryOptions(args));
  return <div>{data?.value}</div>;
}
```

### Mutations in client components

```ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function SomeForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    trpc.someRoute.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.someRoute.queryFilter()),
    }),
  );

  return <button onClick={() => mutation.mutate(args)}>Submit</button>;
}
```

## Database (`@spexs/db`)

`packages/db` is the single source for all database concerns.

| Export | Use |
|---|---|
| `users`, `sessions`, `accounts`, `verifications` | Drizzle table definitions (snake_case columns, plural names) |
| `User`, `NewUser`, `Session`, … | TypeScript types inferred from schema |
| `db`, `pool` | Drizzle instance — import directly in `auth.ts` and scripts |
| `DatabaseModule` | Global NestJS module — import **once** in `AppModule` |
| `DatabaseService` | Injectable — provides `service.db: Database`, inject in repositories |

**Migrations:** run from `packages/db/` with `pnpm db:generate` then `pnpm db:migrate`.
Requires `DATABASE_URL` env var.

## Authentication (Better Auth)

**Backend** — `src/auth/auth.ts` is the single auth instance. `AuthModule.forRoot({ auth })` mounts the Better Auth route handler and registers the global `AuthGuard`.

**tRPC procedures:**
- `this.trpc.publicProcedure` — no auth, `ctx.session` is `Session | null`
- `this.trpc.protectedProcedure` — requires session, throws `UNAUTHORIZED` otherwise, `ctx.session` is `Session`

**Frontend** — `apps/web/lib/auth-client.ts` exports the single auth client:
```ts
import { signIn, signUp, signOut, useSession } from '@/lib/auth-client';
// useSession() → only in 'use client' components
```

Full backend auth docs: `.agents/skills/backend-architecture/auth.md`

## Backend Architecture (NestJS)

Every feature module follows a strict three-layer structure. Full rules: `.agents/skills/backend-architecture/`

```
[feature]/
├── [feature].repository.ts   # DB access only — no business logic
├── [feature].service.ts      # Business logic — uses repository, throws TRPCError
├── [feature].router.ts       # tRPC sub-router — Zod input, calls service, no logic
└── [feature].module.ts       # Wires layers, declares imports/exports
```

**Dependency direction** (never reverse this):
```
Router → Service → Repository → Database
```

**Key rules:**
- Repository returns `null` for not-found — service decides whether to throw
- Service throws `TRPCError`, never the router or repository
- Cross-feature: import the module, inject the service — never another module's repository
- Export `[Feature]Service` and `[Feature]Router`; never export the repository
- `TrpcModule` imports each feature module and merges its router under a namespace
- No `forwardRef` — if you think you need it, the design is wrong
- Zod input schemas live in the router file, use `z.nativeEnum(Enum)` for enums

## Environment Variables

| Var | Used in | Purpose |
|-----|---------|---------|
| `API_URL` | Server (build + runtime) | Internal URL for server→API calls |
| `NEXT_PUBLIC_API_URL` | Browser (baked at build) | Public URL for client→API calls |

Both default to `http://localhost:3001` if unset.
