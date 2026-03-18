'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc/client';
import {
  AlertEventStatus,
  ExecutionStatus,
  NodeExecutionStatus,
} from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { historyPageParser, historyPageSizeParser } from '../lib/search-params';
import { NodeExecutionDetail } from './node-execution-detail';

const HISTORY_PARAM_OPTIONS = { shallow: false } as const;

interface WorkflowHistoryViewProps {
  workflowId: string;
}

const EVENT_STATUS_CONFIG = {
  [AlertEventStatus.OPEN]: {
    label: 'Open Alert',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive',
  },
  [AlertEventStatus.RESOLVED]: {
    label: 'Resolved',
    variant: 'secondary' as const,
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
} as const;

function ResolveEventDialog({
  eventId,
  onResolve,
}: {
  eventId: string;
  onResolve: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.events.resolve.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        setComment('');
        onResolve();
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 shadow-sm">
          <CheckCircle2 className="mr-2 size-4 text-emerald-500" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Alert Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-1">
            <Label
              htmlFor="comment"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Resolution Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was this alert resolved?"
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ eventId, comment })}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {mutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventStepDetails({
  stepLogs,
  nodeExecutions,
}: {
  stepLogs: Array<{
    nodeId: string;
    nodeType: string;
    status: NodeExecutionStatus;
    error?: string;
    completedAt?: string;
    output?: Record<string, unknown>;
  }>;
  nodeExecutions?: Array<{
    id: string;
    nodeId: string;
    status: NodeExecutionStatus;
    inputData?: unknown;
    outputData?: unknown;
    error?: string | null;
    startedAt?: Date | string | null;
    completedAt?: Date | string | null;
    comments?: Array<{
      id: string;
      nodeExecutionId: string;
      userId: string;
      content: string;
      createdAt: Date | string | null;
    }>;
  }>;
}) {
  if (!stepLogs || stepLogs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No step logs available.</p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {stepLogs.map((step, index) => {
        const nodeExec = nodeExecutions?.find(
          (ne) => ne.nodeId === step.nodeId,
        );
        const stepNumber = index + 1;

        return (
          <AccordionItem key={step.nodeId} value={`step-${step.nodeId}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {stepNumber}:
                </span>
                <span className="text-sm font-medium">{step.nodeType}</span>
                <Badge
                  variant="outline"
                  className={
                    step.status === NodeExecutionStatus.SUCCESS
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : step.status === NodeExecutionStatus.FAILED
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                  }
                >
                  {step.status}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {nodeExec ? (
                <NodeExecutionDetail
                  nodeExecutionId={nodeExec.id}
                  nodeType={step.nodeType}
                  status={nodeExec.status}
                  inputData={
                    nodeExec.inputData as Record<string, unknown> | undefined
                  }
                  outputData={
                    nodeExec.outputData as Record<string, unknown> | undefined
                  }
                  error={nodeExec.error ?? undefined}
                  startedAt={nodeExec.startedAt ?? undefined}
                  completedAt={nodeExec.completedAt ?? undefined}
                  comments={nodeExec.comments}
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Status: {step.status}
                  </p>
                  {step.output && (
                    <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  )}
                  {step.error && (
                    <pre className="max-h-32 overflow-auto rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      {step.error}
                    </pre>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/**
 * Lazily loads the full node executions (with outputData + comments) for an
 * alert event when the event has an associated executionId.
 * Falls back to the static stepLogs snapshot if no executionId is present.
 */
function EventExecutionDetails({
  executionId,
  stepLogs,
}: {
  executionId: string | null | undefined;
  stepLogs: Array<{
    nodeId: string;
    nodeType: string;
    status: NodeExecutionStatus;
    error?: string;
    completedAt?: string;
    output?: Record<string, unknown>;
  }>;
}) {
  const trpc = useTRPC();

  const { data: details, isLoading } = useQuery({
    ...trpc.executions.getDetails.queryOptions({
      executionId: executionId ?? '',
    }),
    enabled: !!executionId,
  });

  if (!executionId) {
    return <EventStepDetails stepLogs={stepLogs} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading step details…
      </div>
    );
  }

  return (
    <EventStepDetails
      stepLogs={stepLogs}
      nodeExecutions={details?.nodeExecutions}
    />
  );
}

export function WorkflowHistoryView({ workflowId }: WorkflowHistoryViewProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [{ page, pageSize }, setParams] = useQueryStates(
    {
      page: historyPageParser,
      pageSize: historyPageSizeParser,
    },
    HISTORY_PARAM_OPTIONS,
  );

  const { data, isLoading, error, refetch } = useQuery(
    trpc.events.list.queryOptions({
      workflowId,
      page,
      pageSize,
    }),
  );

  const events = data?.items ?? [];
  const meta = data?.meta;

  const retryMutation = useMutation(
    trpc.executions.retry.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.events.list.queryFilter({ workflowId }),
        );
        void queryClient.invalidateQueries(
          trpc.executions.getLastExecution.queryFilter({ workflowId }),
        );
      },
    }),
  );

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
        <h3 className="mb-1 text-base font-semibold">No alert events yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Any triggered alerts will appear here requiring resolution. Simulate
          the workflow to generate an event.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((event) => {
          const statusConfig =
            EVENT_STATUS_CONFIG[event.status as AlertEventStatus] ||
            EVENT_STATUS_CONFIG.OPEN;
          const StatusIcon = statusConfig.icon;
          const trigData = event.triggerData as Record<string, unknown> | null;
          const stepLogs =
            (event.stepLogs as Array<{
              nodeId: string;
              nodeType: string;
              status: NodeExecutionStatus;
              error?: string;
              completedAt?: string;
              output?: Record<string, unknown>;
            }>) || [];

          const hasFailedStep = stepLogs.some(
            (s) => s.status === NodeExecutionStatus.FAILED,
          );

          return (
            <div
              key={event.id}
              className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${statusConfig.className}`}
                  >
                    <StatusIcon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        Alert Triggered
                      </span>
                      <Badge
                        variant={statusConfig.variant}
                        className="h-5 border-0 px-2 text-[10px] font-medium uppercase"
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          Opened: {new Date(event.createdAt).toLocaleString()}
                        </span>
                        {event.resolvedAt && (
                          <>
                            <span className="text-border">·</span>
                            <span>
                              Resolved:{' '}
                              {new Date(event.resolvedAt).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>

                      {trigData && (
                        <div className="mt-2 rounded-md border border-border/50 bg-muted/40 p-2 text-sm">
                          <span className="font-medium">Details: </span>
                          <span className="text-muted-foreground">
                            Metric value{' '}
                            <strong className="text-foreground">
                              {String(trigData.metricValue)}
                            </strong>{' '}
                            evaluated against threshold{' '}
                            <strong className="text-foreground">
                              {String(trigData.evaluatedThreshold)}
                            </strong>
                            .
                          </span>
                        </div>
                      )}

                      {stepLogs.length > 0 && (
                        <div className="mt-3">
                          <EventExecutionDetails
                            executionId={event.executionId}
                            stepLogs={stepLogs}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {hasFailedStep && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shadow-sm"
                      onClick={() => {
                        const failedStep = stepLogs.find(
                          (s) => s.status === NodeExecutionStatus.FAILED,
                        );
                        if (failedStep) {
                          retryMutation.mutate({ executionId: event.id });
                        }
                      }}
                      disabled={retryMutation.isPending}
                    >
                      {retryMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 size-4" />
                      )}
                      Retry
                    </Button>
                  )}
                  {event.status === AlertEventStatus.OPEN && (
                    <ResolveEventDialog
                      eventId={event.id}
                      onResolve={() => refetch()}
                    />
                  )}
                </div>
              </div>
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
              disabled={page <= 1}
              onClick={() => setParams({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => setParams({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
