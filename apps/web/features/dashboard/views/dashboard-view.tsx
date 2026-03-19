import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { DashboardContent } from '../components/dashboard-content';

const SKELETON_STAT_CARDS = [
  'workflows',
  'events',
  'executions',
  'success-rate',
] as const;

function DashboardContentSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SKELETON_STAT_CARDS.map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default async function DashboardView() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.dashboard.stats.queryOptions());

  return (
    <>
      <DashboardTopNavbar items={[{ id: 'dashboard', label: 'Dashboard' }]} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<DashboardContentSkeleton />}>
          <DashboardContent />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
