import { WorkflowPageShell } from '@/features/workflows/components/workflow-page-shell';
import { workflowDetailSearchParamsCache } from '@/features/workflows/lib/search-params';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import type { SearchParams } from 'nuqs/server';

interface PageProps {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function WorkflowPage({
  params,
  searchParams,
}: PageProps) {
  const { workflowId } = await params;

  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  const { page, pageSize, sortBy, sortDirection, status } =
    await workflowDetailSearchParamsCache.parse(searchParams);

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  void queryClient.prefetchQuery(
    trpc.events.listByWorkflow.queryOptions({
      workflowId,
      query: {
        page,
        pageSize,
        sortBy,
        sortDirection,
        status: status ?? undefined,
      },
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkflowPageShell workflowId={workflowId} />
    </HydrationBoundary>
  );
}
