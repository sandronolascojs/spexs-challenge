import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { WorkflowCanvas } from '@/features/workflows/components/workflow-canvas';
import { isAuthenticated } from '@/lib/auth/guards';
import { getQueryClient, trpc } from '@/lib/trpc/server';
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
  await queryClient.prefetchQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <DashboardTopNavbar
          withBorder
          items={[
            { id: 'workflows', label: 'Workflows', href: '/workflows' },
            { id: 'workflow-canvas', label: 'Canvas' },
          ]}
        />

        <div className="flex-1 overflow-hidden">
          <WorkflowCanvas workflowId={workflowId} />
        </div>
      </div>
    </HydrationBoundary>
  );
}
