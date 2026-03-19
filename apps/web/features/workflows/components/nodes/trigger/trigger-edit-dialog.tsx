'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TrendingUp, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ComparisonOperator,
  NodeType,
  type TriggerThresholdData,
  type TriggerVarianceData,
  triggerThresholdDataSchema,
  triggerVarianceDataSchema,
} from '@spexs/types';
import {
  useUpdateNodeData,
  useWorkflow,
} from '../../../hooks/http/use-workflows';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TriggerEditDialogProps {
  workflowId: string;
  onClose: () => void;
}

interface TriggerFormProps {
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

const FORM_ID = 'trigger-edit-form';

// ── Operator select options ───────────────────────────────────────────────────

const OPERATOR_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: ComparisonOperator.GREATER_THAN, label: 'Greater Than' },
  { value: ComparisonOperator.LESS_THAN, label: 'Less Than' },
  {
    value: ComparisonOperator.GREATER_THAN_OR_EQUAL,
    label: 'Greater Than or Equal',
  },
  { value: ComparisonOperator.LESS_THAN_OR_EQUAL, label: 'Less Than or Equal' },
  { value: ComparisonOperator.EQUAL, label: 'Equal To' },
];

// ── Threshold form ────────────────────────────────────────────────────────────

function ThresholdForm({ initialData, onSubmit }: TriggerFormProps) {
  const parsed = triggerThresholdDataSchema.safeParse(initialData);

  const form = useForm<TriggerThresholdData>({
    resolver: zodResolver(triggerThresholdDataSchema),
    defaultValues: parsed.success
      ? parsed.data
      : {
          metricName: '',
          operator: ComparisonOperator.GREATER_THAN,
          thresholdValue: 0,
        },
  });

  return (
    <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="py-4">
        <Controller
          name="metricName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Metric Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. cpu_usage"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="operator"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Operator</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="thresholdValue"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Threshold Value</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                aria-invalid={fieldState.invalid}
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

// ── Variance form ─────────────────────────────────────────────────────────────

function VarianceForm({ initialData, onSubmit }: TriggerFormProps) {
  const parsed = triggerVarianceDataSchema.safeParse(initialData);

  const form = useForm<TriggerVarianceData>({
    resolver: zodResolver(triggerVarianceDataSchema),
    defaultValues: parsed.success
      ? parsed.data
      : { metricName: '', baseValue: 0, deviationPercentage: 0 },
  });

  return (
    <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="py-4">
        <Controller
          name="metricName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Metric Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. cpu_usage"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="baseValue"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Base Value</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="deviationPercentage"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Max Deviation (%)</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                aria-invalid={fieldState.invalid}
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

// ── Main dialog ───────────────────────────────────────────────────────────────

export function TriggerEditDialog({
  workflowId,
  onClose,
}: TriggerEditDialogProps) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);

  const triggerNode = workflow?.nodes.find((n) =>
    n.type.startsWith('trigger_'),
  );
  const isThreshold = triggerNode?.type === NodeType.TRIGGER_THRESHOLD;

  const updateMutation = useUpdateNodeData(workflowId);

  function handleFormSubmit(formData: Record<string, unknown>) {
    if (!triggerNode) return;
    updateMutation.mutate(
      { nodeId: triggerNode.id, data: formData },
      { onSuccess: onClose },
    );
  }

  if (isLoading || !triggerNode) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="flex h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              {isThreshold ? (
                <Zap className="size-4 text-primary" />
              ) : (
                <TrendingUp className="size-4 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>Edit Trigger</DialogTitle>
              <DialogDescription>
                {isThreshold
                  ? 'Configure threshold trigger'
                  : 'Configure variance trigger'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isThreshold ? (
          <ThresholdForm
            initialData={triggerNode.data}
            onSubmit={handleFormSubmit}
          />
        ) : (
          <VarianceForm
            initialData={triggerNode.data}
            onSubmit={handleFormSubmit}
          />
        )}

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
