'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { useDashboardStatsSuspense } from '../hooks/http/use-dashboard-stats';
import { DashboardRecentEvents } from './dashboard-recent-events';
import { DashboardRecentWorkflows } from './dashboard-recent-workflows';
import { DashboardStatCard } from './dashboard-stat-card';

const PERCENT_MULTIPLIER = 100;

function computeSuccessRate(succeeded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((succeeded / total) * PERCENT_MULTIPLIER);
}

function DashboardSuccessRateCard({
  succeeded,
  total,
}: {
  succeeded: number;
  total: number;
}) {
  const rate = computeSuccessRate(succeeded, total);
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Success Rate
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{rate}%</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {total === 0
            ? 'No executions yet'
            : `${succeeded} of ${total} succeeded`}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardContent() {
  const { data: stats } = useDashboardStatsSuspense();

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Workflows"
          value={stats.workflows.total}
          icon={Activity}
          breakdown={[
            { label: 'active', value: stats.workflows.active },
            {
              label: 'inactive',
              value: stats.workflows.total - stats.workflows.active,
            },
          ]}
        />
        <DashboardStatCard
          label="Alert Events"
          value={stats.events.total}
          icon={AlertTriangle}
          breakdown={[
            {
              label: 'open',
              value: stats.events.open,
              className:
                stats.events.open > 0
                  ? 'text-destructive font-medium'
                  : undefined,
            },
            { label: 'snoozed', value: stats.events.snoozed },
            { label: 'resolved', value: stats.events.resolved },
          ]}
        />
        <DashboardStatCard
          label="Executions"
          value={stats.executions.total}
          icon={PlayCircle}
          breakdown={[
            { label: 'succeeded', value: stats.executions.succeeded },
            { label: 'failed', value: stats.executions.failed },
          ]}
        />
        <DashboardSuccessRateCard
          succeeded={stats.executions.succeeded}
          total={stats.executions.total}
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardRecentWorkflows workflows={stats.recent.workflows} />
        <DashboardRecentEvents events={stats.recent.events} />
      </div>
    </div>
  );
}
