'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '../trpc/client';

export function HelloClient() {
  const trpc = useTRPC();
  const [name, setName] = useState('');
  const [submittedName, setSubmittedName] = useState<string | undefined>();

  const { data, isFetching } = useQuery(
    trpc.hello.queryOptions({ name: submittedName }),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">Client component (React Query)</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedName(name || undefined);
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        >
          {isFetching ? '...' : 'Send'}
        </button>
      </form>
      {data && <p className="text-lg font-medium">{data.message}</p>}
    </div>
  );
}
