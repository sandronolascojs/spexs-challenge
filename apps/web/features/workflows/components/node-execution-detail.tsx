'use client';

import { Badge } from '@/components/ui/badge';
import { NodeExecutionStatus } from '@spexs/types';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

interface NodeExecutionDetailProps {
  nodeType: string;
  status: NodeExecutionStatus;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  error?: string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

const STATUS_CONFIG = {
  [NodeExecutionStatus.PENDING]: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  [NodeExecutionStatus.RUNNING]: {
    label: 'Running',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  [NodeExecutionStatus.SUCCESS]: {
    label: 'Success',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  [NodeExecutionStatus.FAILED]: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive',
  },
  [NodeExecutionStatus.SKIPPED]: {
    label: 'Skipped',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
} as const;

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy HH:mm:ss');
}

export function NodeExecutionDetail({
  nodeType,
  status,
  inputData,
  outputData,
  error,
  startedAt,
  completedAt,
}: NodeExecutionDetailProps) {
  const statusConfig =
    STATUS_CONFIG[status] ?? STATUS_CONFIG[NodeExecutionStatus.PENDING];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={statusConfig.className}>
          <StatusIcon
            className={`mr-1 size-3 ${status === NodeExecutionStatus.RUNNING ? 'animate-spin' : ''}`}
          />
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{nodeType}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Started</p>
          <p className="font-mono text-xs">{formatDate(startedAt)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Completed</p>
          <p className="font-mono text-xs">{formatDate(completedAt)}</p>
        </div>
      </div>

      {inputData && Object.keys(inputData).length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Input Context
          </p>
          <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
            {JSON.stringify(inputData, null, 2)}
          </pre>
        </div>
      )}

      {outputData && Object.keys(outputData).length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Output
          </p>
          <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
            {JSON.stringify(outputData, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div>
          <p className="mb-1 text-xs font-medium text-destructive">Error</p>
          <pre className="max-h-32 overflow-auto rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
}
