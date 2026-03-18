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
import { useMutation } from '@tanstack/react-query';
import { Loader2, Play, Zap } from 'lucide-react';
import { useState } from 'react';
import type { WorkflowDetail } from '../types/canvas';

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
  const trpc = useTRPC();
  const [metricValue, setMetricValue] = useState('');

  const executeMutation = useMutation(
    trpc.executions.execute.mutationOptions({
      onSuccess: (data) => {
        onTriggerSuccess?.(data.executionId);
        onOpenChange(false);
        setMetricValue('');
      },
    }),
  );

  function handleTrigger() {
    executeMutation.mutate({
      workflowId: workflow.id,
      triggerData: {
        value: metricValue ? Number(metricValue) : 0,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label htmlFor="trigger-value">Metric Value</Label>
            <Input
              id="trigger-value"
              type="number"
              placeholder="Enter a numeric value"
              value={metricValue}
              onChange={(event) => setMetricValue(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This value will be evaluated against the trigger node&apos;s
              conditions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
