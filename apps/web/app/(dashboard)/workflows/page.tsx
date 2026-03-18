import { DEFAULT_WORKFLOW_PAGINATION } from '@/features/workflows/lib/pagination';
import { WorkflowsListView } from '@/features/workflows/views/workflows-list-view';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

export default async function WorkflowsPage() {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.workflows.list.queryOptions(DEFAULT_WORKFLOW_PAGINATION),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkflowsListView />
    </HydrationBoundary>
  );
}
