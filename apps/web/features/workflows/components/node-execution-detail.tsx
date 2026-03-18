'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTRPC } from '@/lib/trpc/client';
import { NodeExecutionStatus } from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface NodeExecutionComment {
  id: string;
  nodeExecutionId: string;
  userId: string;
  content: string;
  createdAt: Date | string | null;
}

interface NodeExecutionDetailProps {
  nodeExecutionId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  error?: string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  comments?: NodeExecutionComment[];
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
  return new Date(date).toLocaleString();
}

export function NodeExecutionDetail({
  nodeExecutionId,
  nodeType,
  status,
  inputData,
  outputData,
  error,
  startedAt,
  completedAt,
  comments = [],
}: NodeExecutionDetailProps) {
  const [comment, setComment] = useState('');
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const statusConfig =
    STATUS_CONFIG[status] || STATUS_CONFIG[NodeExecutionStatus.PENDING];
  const StatusIcon = statusConfig.icon;

  const addCommentMutation = useMutation(
    trpc.events.addStepComment.mutationOptions({
      onSuccess: () => {
        setComment('');
        void queryClient.invalidateQueries(
          trpc.executions.getDetails.queryFilter({
            executionId: nodeExecutionId,
          }),
        );
      },
    }),
  );

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addCommentMutation.mutate({
      nodeExecutionId,
      content: comment.trim(),
    });
  };

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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Comments</p>
        </div>

        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-border/50 bg-muted/30 p-2"
              >
                <p className="text-sm">{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(c.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddComment}
            disabled={!comment.trim() || addCommentMutation.isPending}
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
