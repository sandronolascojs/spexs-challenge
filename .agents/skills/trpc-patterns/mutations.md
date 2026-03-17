# Client Component: useMutation + Cache Invalidation

## Basic mutation

```ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/app/trpc/client';

export function CreateForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    trpc.items.create.mutationOptions({
      onSuccess: () => {
        // Invalidate the list so it refetches
        queryClient.invalidateQueries({ queryKey: trpc.items.list.queryKey() });
      },
    }),
  );

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New item' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Saving...' : 'Create'}
    </button>
  );
}
```

## Optimistic update pattern

```ts
const mutation = useMutation(
  trpc.items.update.mutationOptions({
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: trpc.items.list.queryKey() });

      // Snapshot previous value
      const previous = queryClient.getQueryData(trpc.items.list.queryKey());

      // Optimistically update
      queryClient.setQueryData(trpc.items.list.queryKey(), (old) =>
        old?.map((item) => (item.id === newItem.id ? { ...item, ...newItem } : item)),
      );

      return { previous };
    },
    onError: (_err, _newItem, context) => {
      // Roll back on error
      queryClient.setQueryData(trpc.items.list.queryKey(), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trpc.items.list.queryKey() });
    },
  }),
);
```

## Rules

- Use `trpc.X.mutationOptions()` — not a raw `useMutation` with a manual fetch.
- Use `trpc.X.queryKey()` (no args) or `trpc.X.queryFilter()` for invalidation — never hardcode key arrays.
- Invalidate in `onSettled`, not just `onSuccess`, so errors still trigger a refetch.
