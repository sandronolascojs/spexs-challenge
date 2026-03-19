'use client';

import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTriggerPrimitive,
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertEventStatus,
  ExecutionStatus,
  NodeExecutionStatus,
} from '@spexs/types';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { useAlertEvents, useResolveAlertEvent } from '../hooks/http/use-events';
import {
  useExecutionDetails,
  useRetryExecution,
} from '../hooks/http/use-executions';
import { historyPageParser, historyPageSizeParser } from '../lib/search-params';
import { NodeExecutionDetail } from './node-execution-detail';
import { StepCommentsSheet } from './step-comments-sheet';

const HISTORY_PARAM_OPTIONS = { shallow: false } as const;

interface WorkflowHistoryViewProps {
  workflowId: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const EVENT_STATUS_CONFIG = {
  [AlertEventStatus.OPEN]: {
    label: 'Open',
    icon: AlertTriangle,
    dotClass: 'bg-destructive',
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  [AlertEventStatus.RESOLVED]: {
    label: 'Resolved',
    icon: CheckCircle2,
    dotClass: 'bg-emerald-500',
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
} as const;

const STEP_STATUS_CLASS: Record<NodeExecutionStatus, string> = {
  [NodeExecutionStatus.SUCCESS]:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  [NodeExecutionStatus.FAILED]:
    'bg-destructive/10 text-destructive border-destructive/20',
  [NodeExecutionStatus.RUNNING]:
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  [NodeExecutionStatus.PENDING]: 'bg-muted text-muted-foreground border-border',
  [NodeExecutionStatus.SKIPPED]: 'bg-muted text-muted-foreground border-border',
};

// ── Resolve dialog ────────────────────────────────────────────────────────────

function ResolveEventDialog({
  eventId,
  workflowId,
  onResolve,
}: {
  eventId: string;
  workflowId: string;
  onResolve: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');

  const mutation = useResolveAlertEvent(workflowId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="resolve-comment"
              className="text-xs font-medium text-muted-foreground"
            >
              Resolution note (optional)
            </Label>
            <Textarea
              id="resolve-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe how this alert was resolved…"
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
            onClick={() =>
              mutation.mutate(
                { eventId, comment },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setComment('');
                    onResolve();
                  },
                },
              )
            }
          >
            {mutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            {mutation.isPending ? 'Resolving…' : 'Mark as Resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Selected step for comments sheet ─────────────────────────────────────────

interface SelectedStep {
  nodeExecutionId: string;
  executionId: string;
  nodeType: string;
}

// ── Step list + retry — shows all workflow nodes and the authoritative retry button ──

function EventSteps({
  executionId,
  onRetry,
  isRetrying,
}: {
  executionId: string;
  onRetry: (executionId: string) => void;
  isRetrying: boolean;
}) {
  const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);

  const { data: details, isLoading } = useExecutionDetails(executionId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading steps…
      </div>
    );
  }

  const allNodes = details?.allWorkflowNodes ?? [];
  const nodeExecutionByNodeId = Object.fromEntries(
    (details?.nodeExecutions ?? []).map((ne) => [ne.nodeId, ne]),
  );

  // Retry is only valid when the execution itself is in FAILED state.
  // We read this from the live execution row, not from stale stepLogs on the event.
  const canRetry = details?.status === ExecutionStatus.FAILED;

  return (
    <>
      {/* Retry banner — shown at the top of the steps panel when execution is FAILED */}
      {canRetry && (
        <div className="flex items-center justify-between border-b border-border/40 py-2">
          <p className="text-xs text-muted-foreground">
            One or more steps failed.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(executionId)}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Retry
          </Button>
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {allNodes.map((node, index) => {
          const nodeExec = nodeExecutionByNodeId[node.id];
          const isNewStep = !nodeExec;
          const nodeType = node.type;

          return (
            <AccordionItem
              key={node.id}
              value={`step-${node.id}`}
              className="border-b border-border/40 last:border-0"
            >
              <AccordionHeader>
                <AccordionTriggerPrimitive className="flex-1 py-3 focus-visible:ring-0 focus-visible:outline-none">
                  <span className="w-6 shrink-0 text-right text-[11px] font-mono text-muted-foreground/50">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{nodeType}</span>
                  {isNewStep ? (
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full px-2 text-[10px] font-medium bg-muted text-muted-foreground border-border"
                    >
                      new
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`h-5 rounded-full px-2 text-[10px] font-medium ${STEP_STATUS_CLASS[nodeExec.status] ?? STEP_STATUS_CLASS[NodeExecutionStatus.PENDING]}`}
                    >
                      {nodeExec.status}
                    </Badge>
                  )}
                </AccordionTriggerPrimitive>
                {!isNewStep ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="mr-1 size-7 shrink-0 text-muted-foreground/40 hover:text-foreground"
                    onClick={() => {
                      setSelectedStep({
                        nodeExecutionId: nodeExec.id,
                        executionId,
                        nodeType,
                      });
                    }}
                  >
                    <MessageSquare className="size-3.5" />
                    <span className="sr-only">View comments</span>
                  </Button>
                ) : (
                  <div className="mr-1 size-7 shrink-0" />
                )}
              </AccordionHeader>
              <AccordionContent className="pb-3 pl-14">
                {isNewStep ? (
                  <p className="text-xs text-muted-foreground">
                    This step was not part of this execution.
                  </p>
                ) : (
                  <NodeExecutionDetail
                    nodeType={nodeType}
                    status={nodeExec.status}
                    inputData={nodeExec.inputData ?? undefined}
                    outputData={nodeExec.outputData ?? undefined}
                    error={nodeExec.error ?? undefined}
                    startedAt={nodeExec.startedAt ?? undefined}
                    completedAt={nodeExec.completedAt ?? undefined}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {selectedStep && (
        <StepCommentsSheet
          nodeExecutionId={selectedStep.nodeExecutionId}
          executionId={selectedStep.executionId}
          nodeType={selectedStep.nodeType}
          open={selectedStep !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedStep(null);
          }}
        />
      )}
    </>
  );
}

// ── Single event card ─────────────────────────────────────────────────────────

function EventCard({
  event,
  workflowId,
  onResolve,
  onRetry,
  isRetrying,
}: {
  event: {
    id: string;
    status: AlertEventStatus;
    executionId?: string | null;
    triggerData: Record<string, unknown>;
    createdAt: Date | string;
    resolvedAt?: Date | string | null;
  };
  workflowId: string;
  onResolve: () => void;
  onRetry: (executionId: string) => void;
  isRetrying: boolean;
}) {
  const statusConfig =
    EVENT_STATUS_CONFIG[event.status] ??
    EVENT_STATUS_CONFIG[AlertEventStatus.OPEN];

  const StatusIcon = statusConfig.icon;

  const trigData =
    Object.keys(event.triggerData).length > 0 ? event.triggerData : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card transition-colors hover:border-border">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${statusConfig.badgeClass}`}
          >
            <StatusIcon className="size-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Alert Triggered</span>
              <Badge
                variant="outline"
                className={`h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide ${statusConfig.badgeClass}`}
              >
                {statusConfig.label}
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

        {/* Only the Resolve button lives in the card header; Retry lives inside EventSteps */}
        {event.status === AlertEventStatus.OPEN && (
          <div className="flex shrink-0 items-center gap-2">
            <ResolveEventDialog
              eventId={event.id}
              workflowId={workflowId}
              onResolve={onResolve}
            />
          </div>
        )}
      </div>

      {/* Steps — shown whenever we have an executionId */}
      {event.executionId && (
        <>
          <Separator />
          <div className="px-4 py-1">
            <EventSteps
              executionId={event.executionId}
              onRetry={onRetry}
              isRetrying={isRetrying}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function WorkflowHistoryView({ workflowId }: WorkflowHistoryViewProps) {
  const [{ page, pageSize }, setParams] = useQueryStates(
    { page: historyPageParser, pageSize: historyPageSizeParser },
    HISTORY_PARAM_OPTIONS,
  );

  const { data, isLoading, error, refetch } = useAlertEvents({
    workflowId,
    page,
    pageSize,
  });

  const retryMutation = useRetryExecution(workflowId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <AlertCircle className="size-5 text-destructive" />
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const events = data?.items ?? [];
  const meta = data?.meta;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-16 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <History className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-sm font-semibold">No events yet</h3>
        <p className="max-w-xs text-xs text-muted-foreground">
          Triggered alerts will appear here. Simulate the workflow to generate
          an event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          workflowId={workflowId}
          onResolve={() => void refetch()}
          onRetry={(executionId) => retryMutation.mutate({ executionId })}
          isRetrying={retryMutation.isPending}
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
    </div>
  );
}
