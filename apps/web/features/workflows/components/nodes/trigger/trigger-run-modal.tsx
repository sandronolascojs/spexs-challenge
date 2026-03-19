'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Play, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NodeType,
  type TriggerThresholdData,
  type TriggerVarianceData,
  triggerThresholdDataSchema,
  triggerVarianceDataSchema,
} from '@spexs/types';
import { useExecuteWorkflow } from '../../../hooks/http/use-executions';
import { useWorkflow } from '../../../hooks/http/use-workflows';
import { useExecutionStore } from '../../../stores/execution-store';
import {
  parseTriggerThresholdData,
  parseTriggerVarianceData,
} from '../shared/parse-node-data';

// ── Schemas for run-time inputs ────────────────────────────────────────────────

const thresholdRunSchema = z.object({
  value: z.number({ error: 'Must be a number' }),
});

const varianceRunSchema = z.object({
  value: z.number({ error: 'Must be a number' }),
});

type ThresholdRunInput = z.infer<typeof thresholdRunSchema>;
type VarianceRunInput = z.infer<typeof varianceRunSchema>;

// ── Shared run-form props ─────────────────────────────────────────────────────

interface RunFormProps {
  formId: string;
  onSubmit: (triggerData: Record<string, number>) => void;
}

// ── Threshold run form ────────────────────────────────────────────────────────

interface ThresholdRunFormProps extends RunFormProps {
  config: TriggerThresholdData;
}

function ThresholdRunForm({ formId, config, onSubmit }: ThresholdRunFormProps) {
  const form = useForm<ThresholdRunInput>({
    resolver: zodResolver(thresholdRunSchema),
    defaultValues: { value: 0 },
  });

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(({ value }) => onSubmit({ value }))}
    >
      <FieldGroup className="py-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Trigger fires when </span>
          <span className="font-semibold">{config.metricName}</span>
          <span className="text-muted-foreground">
            {' '}
            crosses the threshold of{' '}
          </span>
          <span className="font-mono font-semibold">
            {config.thresholdValue}
          </span>
        </div>
        <Controller
          name="value"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Current value for{' '}
                <span className="font-semibold">{config.metricName}</span>
              </FieldLabel>
              <Input
                id={field.name}
                type="number"
                step="any"
                aria-invalid={fieldState.invalid}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}

// ── Variance run form ─────────────────────────────────────────────────────────

interface VarianceRunFormProps extends RunFormProps {
  config: TriggerVarianceData;
}

function VarianceRunForm({ formId, config, onSubmit }: VarianceRunFormProps) {
  const form = useForm<VarianceRunInput>({
    resolver: zodResolver(varianceRunSchema),
    defaultValues: { value: 0 },
  });

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(({ value }) => onSubmit({ value }))}
    >
      <FieldGroup className="py-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Trigger fires when </span>
          <span className="font-semibold">{config.metricName}</span>
          <span className="text-muted-foreground"> deviates more than </span>
          <span className="font-mono font-semibold">
            ±{config.deviationPercentage}%
          </span>
          <span className="text-muted-foreground"> from base </span>
          <span className="font-mono font-semibold">{config.baseValue}</span>
        </div>
        <Controller
          name="value"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Current value for{' '}
                <span className="font-semibold">{config.metricName}</span>
              </FieldLabel>
              <Input
                id={field.name}
                type="number"
                step="any"
                aria-invalid={fieldState.invalid}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

const RUN_FORM_ID = 'trigger-run-form';

const TRIGGER_NODE_TYPES = new Set([
  NodeType.MANUAL_TRIGGER,
  NodeType.TRIGGER_THRESHOLD,
  NodeType.TRIGGER_VARIANCE,
]);

interface TriggerRunModalProps {
  workflowId: string;
  onClose: () => void;
}

export function TriggerRunModal({ workflowId, onClose }: TriggerRunModalProps) {
  const setActiveExecutionId = useExecutionStore((s) => s.setActiveExecutionId);

  const { data: workflow, isLoading } = useWorkflow(workflowId);

  const executeMutation = useExecuteWorkflow(workflowId);

  const fireExecution = useCallback(
    (triggerData: Record<string, unknown>) => {
      executeMutation.mutate(
        { workflowId, triggerData },
        {
          onSuccess: (result) => {
            setActiveExecutionId(result.executionId);
            onClose();
          },
          onError: (error) => {
            toast.error(error.message);
            onClose();
          },
        },
      );
    },
    [executeMutation, workflowId, setActiveExecutionId, onClose],
  );

  const triggerNode = workflow?.nodes.find((n) =>
    TRIGGER_NODE_TYPES.has(n.type),
  );

  const isManual = triggerNode?.type === NodeType.MANUAL_TRIGGER;
  const isThreshold = triggerNode?.type === NodeType.TRIGGER_THRESHOLD;
  const isVariance = triggerNode?.type === NodeType.TRIGGER_VARIANCE;

  const thresholdConfig = isThreshold
    ? parseTriggerThresholdData(triggerNode?.data ?? {})
    : null;
  const varianceConfig = isVariance
    ? parseTriggerVarianceData(triggerNode?.data ?? {})
    : null;

  // Manual trigger: fire immediately on open, no form needed.
  // The ref guards against double-fire in StrictMode.
  const hasFiredRef = useRef(false);
  useEffect(() => {
    if (!isManual || hasFiredRef.current) return;
    hasFiredRef.current = true;
    fireExecution({});
  }, [isManual, fireExecution]);

  // While loading or for manual triggers, show a spinner
  if (isLoading || isManual) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="flex h-40 items-center justify-center sm:max-w-sm">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Starting execution…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No trigger node configured
  if (!triggerNode) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>No trigger configured</DialogTitle>
            <DialogDescription>
              Add a trigger node to this workflow before running it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const icon = isThreshold ? (
    <Zap className="size-4 text-primary" />
  ) : (
    <TrendingUp className="size-4 text-primary" />
  );

  const title = isThreshold ? 'Run threshold trigger' : 'Run variance trigger';
  const description = isThreshold
    ? 'Provide the current metric value to evaluate the threshold condition.'
    : 'Provide the current metric value to evaluate the variance condition.';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isThreshold && thresholdConfig && (
          <ThresholdRunForm
            formId={RUN_FORM_ID}
            config={thresholdConfig}
            onSubmit={(data) => fireExecution(data)}
          />
        )}

        {isVariance && varianceConfig && (
          <VarianceRunForm
            formId={RUN_FORM_ID}
            config={varianceConfig}
            onSubmit={(data) => fireExecution(data)}
          />
        )}

        {((isThreshold && !thresholdConfig) ||
          (isVariance && !varianceConfig)) && (
          <p className="py-4 text-sm italic text-muted-foreground">
            The trigger node is not fully configured. Please edit it first.
          </p>
        )}

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form={RUN_FORM_ID}
            disabled={
              executeMutation.isPending ||
              (isThreshold && !thresholdConfig) ||
              (isVariance && !varianceConfig)
            }
          >
            {executeMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {executeMutation.isPending ? 'Running…' : 'Run Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
