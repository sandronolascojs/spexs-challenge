import { WorkflowPageShell } from '@/features/workflows/components/workflow-page-shell';
import { workflowDetailSearchParamsCache } from '@/features/workflows/lib/search-params';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkflowPage({
  params,
  searchParams,
}: PageProps) {
  const { workflowId } = await params;

  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  const { page, pageSize, status } = workflowDetailSearchParamsCache.parse(
    await searchParams,
  );

  const queryClient = getQueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery(
      trpc.workflows.getById.queryOptions({ id: workflowId }),
    ),
    queryClient.prefetchQuery(
      trpc.events.list.queryOptions({
        workflowId,
        page,
        pageSize,
        ...(status ? { status } : {}),
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
