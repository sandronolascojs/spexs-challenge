'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { ExecutionStatus } from '@spexs/types';
import { useMutation } from '@tanstack/react-query';
import { Panel } from '@xyflow/react';
import { Loader2, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { WorkflowDetail } from '../types/canvas';
import { TriggerDialog } from './trigger-dialog';

interface LastExecution {
  id: string;
  status: ExecutionStatus;
}

interface TriggerWorkflowButtonProps {
  workflow: WorkflowDetail;
  lastExecution: LastExecution | null | undefined;
  onTriggerSuccess?: (executionId: string) => void;
  isExecuting?: boolean;
}

export function TriggerWorkflowButton({
  workflow,
  lastExecution,
  onTriggerSuccess,
  isExecuting,
}: TriggerWorkflowButtonProps) {
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isInactive = !workflow.isActive;

  const retryMutation = useMutation(
    trpc.executions.retry.mutationOptions({
      onSuccess: (data) => {
        onTriggerSuccess?.(data.executionId);
      },
    }),
  );

  const handleRetry = () => {
    if (lastExecution?.id) {
      retryMutation.mutate({ executionId: lastExecution.id });
    }
  };

  const isLoading = isExecuting || retryMutation.isPending;
  const isRunning = isExecuting;
  const isFailed = lastExecution?.status === ExecutionStatus.FAILED;
  const isDisabled = isInactive || isLoading || isRunning;

  const getButtonContent = () => {
    if (isRunning) {
      return (
        <>
          <Loader2 className="size-4 animate-spin" />
          Running...
        </>
      );
    }
    if (isFailed) {
      return (
        <>
          <RotateCcw className="size-4" />
          Retry
        </>
      );
    }
    return (
      <>
        <Play className="size-4" />
        Trigger
      </>
    );
  };

  const getTooltipContent = () => {
    if (isInactive) {
      return 'Activate the workflow before triggering events.';
    }
    if (isRunning) {
      return 'Workflow is currently running. Wait for completion.';
    }
    if (isFailed) {
      return 'Retry the failed execution from where it stopped.';
    }
    return null;
  };

  const handleClick = () => {
    if (isFailed) {
      handleRetry();
    } else {
      setDialogOpen(true);
    }
  };

  const tooltipContent = getTooltipContent();

  return (
    <Panel position="bottom-right" className="!m-4">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className={cn(isDisabled && 'pointer-events-none opacity-50')}
            disabled={isDisabled}
            onClick={handleClick}
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        {tooltipContent && (
          <TooltipContent side="top">
            <p className="text-xs">{tooltipContent}</p>
          </TooltipContent>
        )}
      </Tooltip>

      <TriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflow={workflow}
        onTriggerSuccess={onTriggerSuccess}
      />
    </Panel>
  );
}
