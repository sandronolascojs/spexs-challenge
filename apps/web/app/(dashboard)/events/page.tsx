import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { GlobalEventsView } from '@/features/events/views/global-events-view';
import { eventsSearchParamsCache } from '@/features/workflows/lib/search-params';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { SMALL_PAGE_SIZE } from '@spexs/types';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const EVENTS_BREADCRUMB = [{ id: 'events', label: 'Events' }] as const;

export default async function EventsPage({ searchParams }: PageProps) {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  const {
    page,
    status,
    workflow: workflowId,
  } = eventsSearchParamsCache.parse(await searchParams);

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    trpc.events.list.queryOptions({
      page,
      pageSize: SMALL_PAGE_SIZE,
      ...(workflowId ? { workflowId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    }),
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardTopNavbar items={EVENTS_BREADCRUMB} withBorder />
      <div className="flex-1 overflow-y-auto">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <GlobalEventsView />
        </HydrationBoundary>
      </div>
    </div>
  );
}
