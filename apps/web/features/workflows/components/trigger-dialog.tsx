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
import { useTRPC } from '@/lib/trpc/client';
import { ComparisonOperator, TriggerType } from '@spexs/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import { getOperatorLabel } from '../lib/operator-label';
import type { WorkflowWithRecipients } from '../types/canvas';

interface TriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowWithRecipients;
}

const DEFAULT_METRIC_VALUE = '';
const DEFAULT_CURRENT_VALUE = '';

export function TriggerDialog({
  open,
  onOpenChange,
  workflow,
}: TriggerDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [metricValue, setMetricValue] = useState(DEFAULT_METRIC_VALUE);
  const [currentValue, setCurrentValue] = useState(DEFAULT_CURRENT_VALUE);

  const isThreshold = workflow.triggerType === TriggerType.THRESHOLD;

  const triggerThresholdMutation = useMutation(
    trpc.events.triggerThreshold.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.events.listByWorkflow.queryFilter());
        resetAndClose();
      },
    }),
  );

  const triggerVarianceMutation = useMutation(
    trpc.events.triggerVariance.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.events.listByWorkflow.queryFilter());
        resetAndClose();
      },
    }),
  );

  const isPending =
    triggerThresholdMutation.isPending || triggerVarianceMutation.isPending;
  const error = triggerThresholdMutation.error ?? triggerVarianceMutation.error;

  function resetAndClose() {
    setMetricValue(DEFAULT_METRIC_VALUE);
    setCurrentValue(DEFAULT_CURRENT_VALUE);
    onOpenChange(false);
  }

  function handleTrigger() {
    if (isThreshold) {
      const parsedMetricValue = Number.parseFloat(metricValue);
      if (Number.isNaN(parsedMetricValue)) return;

      triggerThresholdMutation.mutate({
        workflowId: workflow.id,
        payload: {
          triggerType: TriggerType.THRESHOLD,
          metricName: workflow.metricName ?? '',
          metricValue: parsedMetricValue,
          operator: workflow.operator ?? ComparisonOperator.GREATER_THAN,
          thresholdValue: workflow.thresholdValue ?? 0,
        },
      });
    } else {
      const parsedCurrentValue = Number.parseFloat(currentValue);
      if (Number.isNaN(parsedCurrentValue)) return;

      const baseValue = workflow.baseValue ?? 0;
      const deviationPercentage = workflow.deviationPercentage ?? 0;
      const actualDeviation = Math.abs(parsedCurrentValue - baseValue);

      triggerVarianceMutation.mutate({
        workflowId: workflow.id,
        payload: {
          triggerType: TriggerType.VARIANCE,
          baseValue,
          currentValue: parsedCurrentValue,
          deviationPercentage,
          actualDeviation,
        },
      });
    }
  }

  const isFormValid = isThreshold
    ? metricValue.trim() !== ''
    : currentValue.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger Workflow Event</DialogTitle>
          <DialogDescription>
            Simulate a workflow trigger by providing the current metric values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isThreshold ? (
            <>
              <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Condition
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {workflow.metricName ?? '—'}{' '}
                  {getOperatorLabel(workflow.operator)}{' '}
                  {workflow.thresholdValue ?? '—'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Current Metric Value</Label>
                <Input
                  type="number"
                  step="any"
                  value={metricValue}
                  onChange={(event) => setMetricValue(event.target.value)}
                  placeholder="Enter the current value to test against the threshold"
                />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Condition
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  Base {workflow.baseValue ?? '—'} ±
                  {workflow.deviationPercentage ?? '—'}%
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Current Value</Label>
                <Input
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(event) => setCurrentValue(event.target.value)}
                  placeholder="Enter the current value to test against the baseline"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleTrigger} disabled={isPending || !isFormValid}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Triggering…
              </>
            ) : (
              <>
                <Play className="mr-2 size-4" />
                Trigger Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
