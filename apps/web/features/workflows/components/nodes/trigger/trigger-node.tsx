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
      return <p className="text-xs text-muted-foreground">Not configured</p>;
    return <TriggerThresholdBody data={parsed} />;
  }

  const parsed = parseTriggerVarianceData(data.nodeData);
  if (!parsed)
    return <p className="text-xs text-muted-foreground">Not configured</p>;
  return <TriggerVarianceBody data={parsed} />;
}

export function TriggerNode({ data }: TriggerNodeProps) {
  const statusProp = data.executionStatus
    ? mapExecutionStatusToIndicator(data.executionStatus)
    : data.isActive
      ? 'success'
      : 'initial';

  const { openDialog } = useWorkflowDialogStore();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode data-tour="workflow-trigger-node" className={NODE_CARD_CLASS}>
        <BaseNodeHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary/10">
              <Zap className="size-3 text-primary" />
            </div>
            <BaseNodeHeaderTitle className="text-xs uppercase tracking-wider">
              {data.label}
            </BaseNodeHeaderTitle>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={
                data.isActive
                  ? 'mr-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'mr-2 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground'
              }
            >
              <span
                className={`size-1.5 rounded-full ${data.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
              />
              {data.isActive ? 'Active' : 'Inactive'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
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
              className="size-7 cursor-not-allowed opacity-50 hover:bg-destructive/10 hover:text-destructive"
              disabled
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent>
          <TriggerBody data={data} />
        </BaseNodeContent>

        <BaseHandle type="source" position={Position.Bottom} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
