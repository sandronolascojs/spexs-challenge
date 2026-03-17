# Cache Key Rule — Prefetch Must Match Client Query

**This is the most common tRPC/React Query mistake in RSC apps.**

tRPC generates query keys from the procedure name + input args. If the args on the server
differ from the args the client uses on mount, the cache lookup misses and the client
re-fetches from scratch — defeating the prefetch entirely.

## Rule

> The args passed to `trpc.X.queryOptions(args)` in the server component **must exactly equal**
> the args passed to `useQuery(trpc.X.queryOptions(args))` in the client component.

## Examples

```ts
// ❌ BAD — key mismatch, prefetch wasted
// server/page.tsx
void queryClient.prefetchQuery(trpc.hello.queryOptions({ name: 'World' }));

// client/hello-client.tsx
const [name, setName] = useState<string | undefined>(); // starts as undefined
useQuery(trpc.hello.queryOptions({ name })); // key: { name: undefined } — MISS

// ✅ GOOD — keys match
// server/page.tsx
void queryClient.prefetchQuery(trpc.hello.queryOptions({ name: undefined }));

// client/hello-client.tsx
const [name] = useState<string | undefined>(); // undefined
useQuery(trpc.hello.queryOptions({ name })); // key: { name: undefined } — HIT

// ✅ GOOD — static args, same on both sides
// server/page.tsx
void queryClient.prefetchQuery(trpc.users.list.queryOptions({ page: 1 }));

// client/users-list.tsx
useQuery(trpc.users.list.queryOptions({ page: 1 })); // HIT
```

## How to verify

Check what key React Query assigned by inspecting the query in React Query Devtools.
The prefetched entry and the `useQuery` call must resolve to the same key string.
