'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ComparisonOperator,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeType,
} from '@spexs/types';
import { AlertTriangle, CheckCircle2, Loader2, Play, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useExecuteWorkflow,
  useExecutionProgress,
} from '../hooks/http/use-executions';
import type { WorkflowDetail } from '../types/canvas';
import {
  parseTriggerThresholdData,
  parseTriggerVarianceData,
} from './nodes/shared/parse-node-data';

const OPERATOR_LABEL: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GREATER_THAN]: '>',
  [ComparisonOperator.LESS_THAN]: '<',
  [ComparisonOperator.GREATER_THAN_OR_EQUAL]: '≥',
  [ComparisonOperator.LESS_THAN_OR_EQUAL]: '≤',
  [ComparisonOperator.EQUAL]: '=',
};

const DEFAULT_METRIC_VALUE = 100;

interface TriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowDetail;
  onTriggerSuccess?: (executionId: string) => void;
}

export function TriggerDialog({
  open,
  onOpenChange,
  workflow,
  onTriggerSuccess,
}: TriggerDialogProps) {
  const [metricValue, setMetricValue] = useState('');
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const triggerNode = useMemo(
    () => workflow.nodes.find((n) => n.type.startsWith('trigger_')),
    [workflow.nodes],
  );

  const isVariance = triggerNode?.type === NodeType.TRIGGER_VARIANCE;
  const rawData = triggerNode?.data ?? {};

  const thresholdData = !isVariance ? parseTriggerThresholdData(rawData) : null;
  const varianceData = isVariance ? parseTriggerVarianceData(rawData) : null;

  const metricName =
    thresholdData?.metricName ?? varianceData?.metricName ?? 'metric';

  const conditionLabel = useMemo(() => {
    if (varianceData) {
      return `Triggers when ${varianceData.metricName} deviates more than ${varianceData.deviationPercentage}% from baseline ${varianceData.baseValue}`;
    }
    if (thresholdData) {
      const opLabel = OPERATOR_LABEL[thresholdData.operator];
      return `Triggers when ${thresholdData.metricName} ${opLabel} ${thresholdData.thresholdValue}`;
    }
    return null;
  }, [thresholdData, varianceData]);

  const defaultValue =
    thresholdData?.thresholdValue ??
    varianceData?.baseValue ??
    DEFAULT_METRIC_VALUE;

  // Poll execution status after firing to detect triggered vs not-triggered
  const { data: progress } = useExecutionProgress(
    lastExecutionId,
    !!lastExecutionId && showResult,
  );

  const executionFinished =
    progress?.executionStatus === ExecutionStatus.SUCCESS ||
    progress?.executionStatus === ExecutionStatus.FAILED;

  const didTrigger = useMemo(() => {
    if (!executionFinished || !progress) return null;
    const nodeStatuses = Object.values(progress.nodeStatusByNodeId);
    const hasSkipped = nodeStatuses.some(
      (n) => n.status === NodeExecutionStatus.SKIPPED,
    );
    return !hasSkipped;
  }, [executionFinished, progress]);

  const executeMutation = useExecuteWorkflow(workflow.id);

  function handleTrigger() {
    setShowResult(false);
    setLastExecutionId(null);
    executeMutation.mutate(
      {
        workflowId: workflow.id,
        triggerData: {
          value: metricValue ? Number(metricValue) : defaultValue,
        },
      },
      {
        onSuccess: (data) => {
          onTriggerSuccess?.(data.executionId);
          setLastExecutionId(data.executionId);
          setShowResult(true);
          setMetricValue('');
        },
      },
    );
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setMetricValue('');
      setShowResult(false);
      setLastExecutionId(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Zap className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Trigger Workflow</DialogTitle>
              <DialogDescription>
                Execute &ldquo;{workflow.name}&rdquo; with test data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="trigger-value">
              Value for <span className="font-semibold">{metricName}</span>
            </Label>
            <Input
              id="trigger-value"
              type="number"
              placeholder={`e.g. ${defaultValue}`}
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              disabled={executeMutation.isPending}
            />
            {conditionLabel && (
              <p className="text-xs text-muted-foreground">{conditionLabel}</p>
            )}
          </div>

          {/* Result feedback */}
          {showResult && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              {executeMutation.isPending ||
              (lastExecutionId && !executionFinished) ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Running…
                </div>
              ) : executionFinished && didTrigger === false ? (
                <div className="flex items-center gap-2 text-xs text-amber-500 dark:text-amber-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Condition not met — no alert event was created. Enter a value
                  that satisfies the trigger condition.
                </div>
              ) : executionFinished && didTrigger === true ? (
                <div className="flex items-center gap-2 text-xs text-emerald-500">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  Alert event created. Check the Executions tab.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={executeMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleTrigger} disabled={executeMutation.isPending}>
            {executeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
