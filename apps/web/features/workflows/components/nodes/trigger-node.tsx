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
import { cn } from '@/lib/utils';
import { NodeType } from '@spexs/types';
import { Position } from '@xyflow/react';
import { Pencil, Trash2, Zap } from 'lucide-react';
import { mapExecutionStatusToIndicator } from '../../lib/node-status';
import { getOperatorLabel } from '../../lib/operator-label';
import { useWorkflowDialogStore } from '../../stores/dialog-store';
import type { WorkflowNodeData } from '../../types/canvas';

type Props = { data: WorkflowNodeData };

function ThresholdBody({ data }: { data: Record<string, unknown> }) {
  const metricName = data.metricName as string | undefined;
  const operator = data.operator as string | undefined;
  const thresholdValue = data.thresholdValue as number | undefined;

  return (
    <div className="space-y-2.5">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Metric
        </p>
        <p className="truncate font-mono text-sm font-semibold">
          {metricName ?? '—'}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">value</span>
        <span className="font-mono text-sm font-bold text-primary">
          {operator ? getOperatorLabel(operator) : '—'}
        </span>
        <span className="font-mono text-xs font-semibold">
          {thresholdValue ?? '—'}
        </span>
      </div>
    </div>
  );
}

function VarianceBody({ data }: { data: Record<string, unknown> }) {
  const baseValue = data.baseValue as number | undefined;
  const deviationPercentage = data.deviationPercentage as number | undefined;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Base Value
        </p>
        <p className="font-mono text-sm font-semibold">{baseValue ?? '—'}</p>
      </div>
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Max Deviation
        </p>
        <p className="font-mono text-sm font-semibold">
          ±{deviationPercentage ?? '—'}%
        </p>
      </div>
    </div>
  );
}

export function TriggerNode({ data }: Props) {
  const isThreshold = data.nodeType === NodeType.TRIGGER_THRESHOLD;
  const statusProp = data.executionStatus
    ? mapExecutionStatusToIndicator(data.executionStatus)
    : data.isActive
      ? 'success'
      : 'initial';

  const { openDialog } = useWorkflowDialogStore();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode
        data-tour="workflow-trigger-node"
        className={cn(
          'w-80 bg-card',
          'border border-border/50',
          '[box-shadow:0_0_0_1px_rgba(0,0,0,.02),0_1px_2px_rgba(0,0,0,.03)]',
          'dark:[box-shadow:0_-10px_40px_-10px_#ffffff08_inset] dark:[border:1px_solid_rgba(255,255,255,.08)]',
        )}
      >
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
          {isThreshold ? (
            <ThresholdBody data={data.nodeData} />
          ) : (
            <VarianceBody data={data.nodeData} />
          )}
        </BaseNodeContent>

        <BaseHandle type="source" position={Position.Bottom} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
