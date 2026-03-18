import { WorkflowPageShell } from '@/features/workflows/components/workflow-page-shell';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@spexs/types';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ workflowId: string }>;
}

export default async function WorkflowPage({ params }: PageProps) {
  const { workflowId } = await params;

  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  const queryClient = getQueryClient();

  // Await prefetches so errors are caught server-side and never dehydrated
  // as pending queries — which would cause client-side rejection errors.
  await Promise.allSettled([
    queryClient.prefetchQuery(
      trpc.workflows.getById.queryOptions({ id: workflowId }),
    ),
    queryClient.prefetchQuery(
      trpc.events.list.queryOptions({
        workflowId,
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
      }),
    ),
    queryClient.prefetchQuery(
      trpc.executions.getLastExecution.queryOptions({ workflowId }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkflowPageShell workflowId={workflowId} />
    </HydrationBoundary>
  );
}
