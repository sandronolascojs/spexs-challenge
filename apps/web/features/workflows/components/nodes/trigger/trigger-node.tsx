'use client';

import { Button } from '@/components/ui/button';
import { BaseHandle } from '@/components/ui/react-flow/base-handle';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/ui/react-flow/base-node';
import { NodeStatusIndicator } from '@/components/ui/react-flow/node-status-indicator';
import { NodeType } from '@spexs/types';
import { Position } from '@xyflow/react';
import { Pencil, Trash2, Zap } from 'lucide-react';
import { useRemoveNode } from '../../../hooks/http/use-workflows';
import { mapExecutionStatusToIndicator } from '../../../lib/node-status';
import { useWorkflowDialogStore } from '../../../stores/dialog-store';
import type { WorkflowNodeData } from '../../../types/canvas';
import { NODE_CARD_CLASS } from '../shared/node-card-styles';
import {
  parseTriggerThresholdData,
  parseTriggerVarianceData,
} from '../shared/parse-node-data';
import { TriggerThresholdBody } from './trigger-threshold-body';
import { TriggerVarianceBody } from './trigger-variance-body';

interface TriggerNodeProps {
  data: WorkflowNodeData;
}

function TriggerBody({ data }: { data: WorkflowNodeData }) {
  const isThreshold = data.nodeType === NodeType.TRIGGER_THRESHOLD;

  if (isThreshold) {
    const parsed = parseTriggerThresholdData(data.nodeData);
    if (!parsed)
      return (
        <p className="text-xs text-muted-foreground italic">Not configured</p>
      );
    return <TriggerThresholdBody data={parsed} />;
  }

  const parsed = parseTriggerVarianceData(data.nodeData);
  if (!parsed)
    return (
      <p className="text-xs text-muted-foreground italic">Not configured</p>
    );
  return <TriggerVarianceBody data={parsed} />;
}

export function TriggerNode({ data }: TriggerNodeProps) {
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);
  const { openDialog } = useWorkflowDialogStore();
  const removeMutation = useRemoveNode(data.workflowId);

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode data-tour="workflow-trigger-node" className={NODE_CARD_CLASS}>
        <BaseNodeHeader className="gap-2.5 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <BaseNodeHeaderTitle className="truncate text-sm font-semibold">
              {data.label}
            </BaseNodeHeaderTitle>
            <p className="text-[10px] text-muted-foreground">
              Workflow trigger
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <span
              className={`mr-1 flex items-center gap-1 text-[10px] font-medium ${
                data.isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  data.isActive ? 'bg-primary' : 'bg-muted-foreground'
                }`}
              />
              {data.isActive ? 'Active' : 'Inactive'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() =>
                openDialog({
                  type: 'edit-trigger',
                  data: { workflowId: data.workflowId },
                })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate({ nodeId: data.nodeId })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent className="pt-1">
          <TriggerBody data={data} />
        </BaseNodeContent>

        <BaseHandle type="source" position={Position.Bottom} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
