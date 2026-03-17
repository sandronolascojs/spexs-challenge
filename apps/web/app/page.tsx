// This page fetches from the NestJS API at request time — not statically renderable
export const dynamic = 'force-dynamic';

import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient, trpc, trpcClient } from '../lib/trpc/server';

export default async function Home() {
  const queryClient = getQueryClient();

  // Prefetch on the server — result is dehydrated and streamed to the client
  // so the client component renders instantly without a loading state
  void queryClient.prefetchQuery(trpc.hello.queryOptions({ name: 'World' }));

  // Server component: direct call, no React Query needed
  const serverData = await trpcClient.hello.query({ name: 'Server' });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-lg flex-col gap-10 px-8 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          NestJS + tRPC + Next.js
        </h1>

        {/* Server Component: direct tRPC call */}
        <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Server Component
          </p>
          <p className="text-lg font-medium">{serverData.message}</p>
        </section>

        {/* Client Component: prefetched on server, hydrated on client */}
        <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Client Component
          </p>
          <HydrationBoundary state={dehydrate(queryClient)}></HydrationBoundary>
        </section>
      </main>
    </div>
  );
}
