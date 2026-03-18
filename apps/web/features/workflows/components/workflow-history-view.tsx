'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc/client';
import { EventStatus } from '@spexs/types';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
} from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import {
  historyPageParser,
  historyPageSizeParser,
  historySortByParser,
  historySortDirectionParser,
  historyStatusParser,
} from '../lib/search-params';
import { ResolveEventDialog } from './resolve-event-dialog';

const HISTORY_PARAM_OPTIONS = { shallow: false } as const;

interface WorkflowHistoryViewProps {
  workflowId: string;
}

const EVENT_STATUS_CONFIG = {
  [EventStatus.OPEN]: {
    label: 'Open',
    variant: 'default' as const,
    icon: AlertCircle,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  [EventStatus.RESOLVED]: {
    label: 'Resolved',
    variant: 'secondary' as const,
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
} as const;

export function WorkflowHistoryView({ workflowId }: WorkflowHistoryViewProps) {
  const trpc = useTRPC();
  const [resolveEventId, setResolveEventId] = useState<string | null>(null);

  const [{ page, pageSize, sortBy, sortDirection, status }, setParams] =
    useQueryStates(
      {
        page: historyPageParser,
        pageSize: historyPageSizeParser,
        status: historyStatusParser,
        sortBy: historySortByParser,
        sortDirection: historySortDirectionParser,
      },
      HISTORY_PARAM_OPTIONS,
    );

  const { data, isLoading, error } = useQuery(
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

  const events = data?.items ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-2 size-6 text-destructive" />
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <History className="size-7 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-base font-semibold">No events yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Events will appear here when the workflow is triggered. Use the
          trigger button on the canvas to simulate an event.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((event) => {
          const statusConfig = EVENT_STATUS_CONFIG[event.status as EventStatus];
          const StatusIcon = statusConfig?.icon ?? Clock;
          const isOpen = event.status === EventStatus.OPEN;

          return (
            <div
              key={event.id}
              className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${statusConfig?.className ?? 'bg-muted'}`}
                  >
                    <StatusIcon className="size-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Event</span>
                      <Badge
                        variant={statusConfig?.variant ?? 'secondary'}
                        className="h-5 border-0 px-2 text-[10px] font-medium"
                      >
                        {statusConfig?.label ?? event.status}
                      </Badge>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{new Date(event.openedAt).toLocaleString()}</span>
                      {event.resolvedAt && (
                        <>
                          <span className="text-border">·</span>
                          <span>
                            Resolved{' '}
                            {new Date(event.resolvedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setResolveEventId(event.id)}
                  >
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Resolve
                  </Button>
                )}
              </div>

              {event.triggerPayload && (
                <div className="mt-3 rounded-md bg-muted/40 px-3 py-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Trigger Payload
                  </p>
                  <pre className="overflow-x-auto font-mono text-xs text-foreground/80">
                    {JSON.stringify(event.triggerPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} events
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasPreviousPage}
              onClick={() => setParams({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => setParams({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {resolveEventId && (
        <ResolveEventDialog
          open
          onOpenChange={(open) => {
            if (!open) setResolveEventId(null);
          }}
          eventId={resolveEventId}
          workflowId={workflowId}
        />
      )}
    </>
  );
}
