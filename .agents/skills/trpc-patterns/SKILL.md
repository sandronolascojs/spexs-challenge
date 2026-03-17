---
name: trpc-patterns
description: tRPC v11 patterns for RSC + TanStack React Query with a remote server (NestJS). Covers prefetch/hydration, useQuery, useMutation, and the cache-key match rule.
user-invocable: false
---

# tRPC Patterns — RSC + Remote Server

This project uses tRPC with a **remote NestJS API** and the official RSC + TanStack Query integration.
Files in this directory document the correct patterns to follow.

## Files

- [setup.md](./setup.md) — how `trpc/server.ts` and `trpc/client.tsx` are wired up
- [prefetch.md](./prefetch.md) — server-side prefetch + HydrationBoundary pattern
- [use-query.md](./use-query.md) — client component `useQuery` and `useSuspenseQuery`
- [mutations.md](./mutations.md) — `useMutation` + cache invalidation
- [cache-key-rule.md](./cache-key-rule.md) — **critical**: prefetch args must match client args
