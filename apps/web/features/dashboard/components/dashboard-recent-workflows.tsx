'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardRecentWorkflow } from '@spexs/types';
import { format } from 'date-fns';
import { Activity, CircleDot } from 'lucide-react';
import Link from 'next/link';

interface DashboardRecentWorkflowsProps {
  workflows: DashboardRecentWorkflow[];
}

export function DashboardRecentWorkflows({
  workflows,
}: DashboardRecentWorkflowsProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Recent Workflows
          </CardTitle>
          <Link
            href="/workflows"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workflows yet.</p>
        ) : (
          <ul className="space-y-3">
            {workflows.map((workflow) => (
              <RecentWorkflowRow key={workflow.id} workflow={workflow} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentWorkflowRow({
  workflow,
}: { workflow: DashboardRecentWorkflow }) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Activity className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/workflows/${workflow.id}`}
          className="truncate text-sm font-medium hover:underline"
        >
          {workflow.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {workflow.nodeCount} {workflow.nodeCount === 1 ? 'node' : 'nodes'} ·{' '}
          {format(new Date(workflow.updatedAt), 'MMM d')}
        </p>
      </div>
      <div
        className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
          workflow.isActive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground'
        }`}
      >
        <CircleDot className="size-3" />
        {workflow.isActive ? 'Active' : 'Inactive'}
      </div>
    </li>
  );
}
