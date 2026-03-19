'use client';

import { BaseHandle } from '@/components/ui/react-flow/base-handle';
import { NodeStatusIndicator } from '@/components/ui/react-flow/node-status-indicator';
import { cn } from '@/lib/utils';
import { Position } from '@xyflow/react';
import { Play, X } from 'lucide-react';
import { useRemoveNode } from '../../../hooks/http/use-workflows';
import { mapExecutionStatusToIndicator } from '../../../lib/node-status';
import type { WorkflowNodeData } from '../../../types/canvas';

interface ManualTriggerNodeProps {
  data: WorkflowNodeData;
}

export function ManualTriggerNode({ data }: ManualTriggerNodeProps) {
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);
  const removeMutation = useRemoveNode(data.workflowId);

  function handleRemove() {
    removeMutation.mutate({ nodeId: data.nodeId });
  }

  return (
    <NodeStatusIndicator status={statusProp}>
      {/* Remove button — lives outside the shape so it doesn't interfere with drag */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={removeMutation.isPending}
        className={cn(
          'nodrag absolute -top-2.5 -left-2.5 z-10',
          'flex size-5 items-center justify-center rounded-full',
          'border border-border bg-card text-muted-foreground',
          'transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <X className="size-2.5" />
      </button>

      <div
        data-tour="workflow-manual-trigger-node"
        className={cn(
          'relative flex size-[70px] items-center justify-center border bg-card',
          'rounded-tl-lg rounded-bl-lg rounded-tr-full rounded-br-full',
          'dark:[border:1px_solid_rgba(255,255,255,.08)]',
          'dark:[box-shadow:0_-10px_40px_-10px_#ffffff08_inset]',
          '[.react-flow\\_\\_node.selected_&]:border-muted-foreground',
        )}
      >
        <div className="flex size-full items-center justify-center text-primary">
          <Play className="size-6 translate-x-px" />
        </div>

        <BaseHandle type="source" position={Position.Right} />
      </div>
    </NodeStatusIndicator>
  );
}
