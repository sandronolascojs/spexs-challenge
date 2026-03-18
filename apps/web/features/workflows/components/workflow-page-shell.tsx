'use client';

import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryState } from 'nuqs';
import { workflowTabParser } from '../lib/search-params';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowHistoryView } from './workflow-history-view';

interface WorkflowPageShellProps {
  workflowId: string;
}

export function WorkflowPageShell({ workflowId }: WorkflowPageShellProps) {
  const [tab, setTab] = useQueryState(
    'tab',
    workflowTabParser.withDefault('canvas').withOptions({ shallow: false }),
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as typeof tab)}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <DashboardTopNavbar
        withBorder
        items={[
          { id: 'workflows', label: 'Workflows', href: '/workflows' },
          { id: 'workflow-detail', label: 'Detail' },
        ]}
      >
        <TabsList>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="history">Executions</TabsTrigger>
        </TabsList>
      </DashboardTopNavbar>

      <TabsContent value="canvas" className="mt-0 flex-1 overflow-hidden">
        <WorkflowCanvas workflowId={workflowId} />
      </TabsContent>

      <TabsContent value="history" className="mt-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Execution History
            </h2>
            <p className="text-sm text-muted-foreground">
              Past workflow executions and their results.
            </p>
          </div>
          <WorkflowHistoryView workflowId={workflowId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
