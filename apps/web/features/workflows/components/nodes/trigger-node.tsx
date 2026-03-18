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
import { TriggerType } from '@spexs/types';
import { Position } from '@xyflow/react';
import { Pencil, Zap } from 'lucide-react';
import { getOperatorLabel } from '../../lib/operator-label';
import { useWorkflowDialogStore } from '../../stores/dialog-store';
import type { TriggerNode as TriggerNodeType } from '../../types/canvas';

type Props = { data: TriggerNodeType['data'] };

function ThresholdBody({
  metricName,
  operator,
  thresholdValue,
}: Pick<
  TriggerNodeType['data'],
  'metricName' | 'operator' | 'thresholdValue'
>) {
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
          {getOperatorLabel(operator)}
        </span>
        <span className="font-mono text-xs font-semibold">
          {thresholdValue ?? '—'}
        </span>
      </div>
    </div>
  );
}

function VarianceBody({
  baseValue,
  deviationPercentage,
}: Pick<TriggerNodeType['data'], 'baseValue' | 'deviationPercentage'>) {
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
  const isThreshold = data.triggerType === TriggerType.THRESHOLD;
  const openDialog = useWorkflowDialogStore((state) => state.openDialog);

  function handleEditClick(event: React.MouseEvent) {
    event.stopPropagation();
    openDialog({
      type: 'edit-trigger',
      data: { workflowId: data.workflowId },
    });
  }

  return (
    <NodeStatusIndicator status={data.isActive ? 'success' : 'initial'}>
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
          <div className="flex size-5 items-center justify-center rounded bg-primary/10">
            <Zap className="size-3 text-primary" />
          </div>
          <BaseNodeHeaderTitle className="text-xs uppercase tracking-wider">
            {isThreshold ? 'Threshold Trigger' : 'Variance Trigger'}
          </BaseNodeHeaderTitle>
          <div className="flex items-center gap-1">
            <span
              className={
                data.isActive
                  ? 'flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'flex items-center gap-1 text-[10px] font-semibold text-muted-foreground'
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
              className="size-6 rounded-md hover:bg-accent"
              onClick={handleEditClick}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent>
          {isThreshold ? (
            <ThresholdBody
              metricName={data.metricName}
              operator={data.operator}
              thresholdValue={data.thresholdValue}
            />
          ) : (
            <VarianceBody
              baseValue={data.baseValue}
              deviationPercentage={data.deviationPercentage}
            />
          )}
        </BaseNodeContent>

        <BaseHandle type="source" position={Position.Bottom} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
