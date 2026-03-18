'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { Panel } from '@xyflow/react';
import { Loader2, Play } from 'lucide-react';
import type { WorkflowDetail } from '../types/canvas';

interface TriggerWorkflowButtonProps {
  workflow: WorkflowDetail;
  onTriggerSuccess?: (executionId: string) => void;
  isExecuting?: boolean;
}

export function TriggerWorkflowButton({
  workflow,
  onTriggerSuccess,
  isExecuting,
}: TriggerWorkflowButtonProps) {
  const trpc = useTRPC();
  const isInactive = !workflow.isActive;

  const executeMutation = useMutation(
    trpc.executions.execute.mutationOptions({
      onSuccess: (data) => {
        onTriggerSuccess?.(data.executionId);
      },
    }),
  );

  const handleTrigger = () => {
    const triggerNode = workflow.nodes.find((n) =>
      n.type.startsWith('trigger_'),
    );
    const triggerData = triggerNode?.data as any;
    const value = triggerData?.thresholdValue ?? triggerData?.baseValue ?? 100;

    executeMutation.mutate({
      workflowId: workflow.id,
      triggerData: { value },
    });
  };

  const isLoading = isExecuting || executeMutation.isPending;
  const isDisabled = isInactive || isLoading;

  return (
    <Panel position="bottom-right" className="!m-4">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className={cn(isDisabled && 'pointer-events-none opacity-50')}
            disabled={isDisabled}
            onClick={handleTrigger}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isLoading ? 'Running' : 'Trigger'}
          </Button>
        </TooltipTrigger>
        {isInactive && (
          <TooltipContent side="top">
            <p className="text-xs">
              Activate the workflow before triggering events.
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </Panel>
  );
}
