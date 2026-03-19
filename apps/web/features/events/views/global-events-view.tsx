'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlertEvents } from '@/features/workflows/hooks/http/use-events';
import { useWorkflowList } from '@/features/workflows/hooks/http/use-workflows';
import { DEFAULT_WORKFLOW_PAGINATION } from '@/features/workflows/lib/pagination';
import {
  EVENTS_ALL_STATUS,
  type EventStatusFilter,
  WORKFLOW_TABS,
  eventsPageParser,
  eventsStatusParser,
  eventsWorkflowParser,
} from '@/features/workflows/lib/search-params';
import { AlertEventStatus, SMALL_PAGE_SIZE } from '@spexs/types';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Moon,
} from 'lucide-react';
import Link from 'next/link';
import { useQueryState, useQueryStates } from 'nuqs';
import { ResolveEventDialog } from '../components/resolve-event-dialog';
import { SnoozeEventDialog } from '../components/snooze-event-dialog';

const STATUS_CONFIG = {
  [AlertEventStatus.OPEN]: {
    label: 'Open',
    icon: AlertTriangle,
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  [AlertEventStatus.SNOOZED]: {
    label: 'Snoozed',
    icon: Moon,
    badgeClass:
      'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  [AlertEventStatus.RESOLVED]: {
    label: 'Resolved',
    icon: CheckCircle2,
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
} as const;

export function GlobalEventsView() {
  const [{ page, workflow: workflowId, status: statusFilter }, setParams] =
    useQueryStates(
      {
        page: eventsPageParser,
        workflow: eventsWorkflowParser,
        status: eventsStatusParser,
      },
      { shallow: false },
    );

  const resolvedStatus =
    statusFilter === EVENTS_ALL_STATUS
      ? undefined
      : (statusFilter as AlertEventStatus);

  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    refetch,
  } = useAlertEvents({
    workflowId: workflowId || undefined,
    page,
    pageSize: SMALL_PAGE_SIZE,
    status: resolvedStatus,
  });

  const { data: workflowsData } = useWorkflowList(DEFAULT_WORKFLOW_PAGINATION);

  const events = eventsData?.items ?? [];
  const meta = eventsData?.meta;
  const workflows = workflowsData?.items ?? [];

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={workflowId || 'all'}
          onValueChange={(v) => {
            void setParams({ workflow: v === 'all' ? '' : v, page: 1 });
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All workflows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workflows</SelectItem>
            {workflows.map((wf) => (
              <SelectItem key={wf.id} value={wf.id}>
                {wf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            void setParams({ status: v as EventStatusFilter, page: 1 });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVENTS_ALL_STATUS}>All statuses</SelectItem>
            <SelectItem value={AlertEventStatus.OPEN}>Open</SelectItem>
            <SelectItem value={AlertEventStatus.SNOOZED}>Snoozed</SelectItem>
            <SelectItem value={AlertEventStatus.RESOLVED}>Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event list */}
      {isLoadingEvents ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <History className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-sm font-semibold">No events found</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            Triggered alerts will appear here. Try adjusting the filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <GlobalEventCard
              key={event.id}
              event={event}
              onAction={() => void refetch()}
            />
          ))}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} · {meta.total} events
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => void setParams({ page: page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => void setParams({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GlobalEventCard({
  event,
  onAction,
}: {
  event: {
    id: string;
    status: AlertEventStatus;
    workflowId: string;
    executionId?: string | null;
    triggerData: Record<string, unknown>;
    createdAt: Date | string;
    resolvedAt?: Date | string | null;
    snoozedUntil?: Date | string | null;
  };
  onAction: () => void;
}) {
  const config =
    STATUS_CONFIG[event.status] ?? STATUS_CONFIG[AlertEventStatus.OPEN];
  const StatusIcon = config.icon;
  const trigData =
    Object.keys(event.triggerData).length > 0 ? event.triggerData : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${config.badgeClass}`}
          >
            <StatusIcon className="size-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/workflows/${event.workflowId}?tab=${WORKFLOW_TABS.HISTORY}`}
                className="text-sm font-semibold hover:underline"
              >
                Alert Triggered
              </Link>
              <Badge
                variant="outline"
                className={`h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide ${config.badgeClass}`}
              >
                {config.label}
              </Badge>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
              </span>
              {event.resolvedAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Resolved{' '}
                  {format(new Date(event.resolvedAt), 'MMM d, yyyy HH:mm')}
                </span>
              )}
              {event.snoozedUntil &&
                event.status === AlertEventStatus.SNOOZED && (
                  <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                    <Moon className="size-3" />
                    Until {format(new Date(event.snoozedUntil), 'MMM d, HH:mm')}
                  </span>
                )}
            </div>

            {trigData && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-xs">
                <span className="text-muted-foreground">Metric</span>
                <span className="font-semibold text-foreground">
                  {String(trigData.metricValue)}
                </span>
                <span className="text-muted-foreground">vs threshold</span>
                <span className="font-semibold text-foreground">
                  {String(trigData.evaluatedThreshold)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {(event.status === AlertEventStatus.OPEN ||
          event.status === AlertEventStatus.SNOOZED) && (
          <div className="flex shrink-0 items-center gap-2">
            {event.status === AlertEventStatus.OPEN && (
              <SnoozeEventDialog eventId={event.id} onSnooze={onAction} />
            )}
            <ResolveEventDialog eventId={event.id} onResolve={onAction} />
          </div>
        )}
      </div>
    </div>
  );
}
