'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, TrendingUp, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

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
import { useTRPC } from '@/lib/trpc/client';
import {
  ComparisonOperator,
  NodeType,
  triggerThresholdDataSchema,
  triggerVarianceDataSchema,
} from '@spexs/types';

interface TriggerEditDialogProps {
  workflowId: string;
  onClose: () => void;
}

export function TriggerEditDialog({
  workflowId,
  onClose,
}: TriggerEditDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: workflow, isLoading } = useQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  const triggerNode = workflow?.nodes.find((n) =>
    n.type.startsWith('trigger_'),
  );
  const isThreshold = triggerNode?.type === NodeType.TRIGGER_THRESHOLD;

  const schema = isThreshold
    ? triggerThresholdDataSchema
    : triggerVarianceDataSchema;
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  useEffect(() => {
    if (triggerNode?.data) {
      form.reset(triggerNode.data as FormValues);
    }
  }, [triggerNode, form]);

  const updateMutation = useMutation(
    trpc.workflows.updateNodeData.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        onClose();
      },
    }),
  );

  function onSubmit(data: FormValues) {
    if (!triggerNode) return;
    updateMutation.mutate({
      nodeId: triggerNode.id,
      data: data as Record<string, unknown>,
    });
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

        <form id="trigger-edit-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {isThreshold ? (
              <>
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
                          <SelectItem value={ComparisonOperator.GREATER_THAN}>
                            Greater Than
                          </SelectItem>
                          <SelectItem value={ComparisonOperator.LESS_THAN}>
                            Less Than
                          </SelectItem>
                          <SelectItem
                            value={ComparisonOperator.GREATER_THAN_OR_EQUAL}
                          >
                            Greater Than or Equal
                          </SelectItem>
                          <SelectItem
                            value={ComparisonOperator.LESS_THAN_OR_EQUAL}
                          >
                            Less Than or Equal
                          </SelectItem>
                          <SelectItem value={ComparisonOperator.EQUAL}>
                            Equal To
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="thresholdValue"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Threshold Value
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="number"
                        aria-invalid={fieldState.invalid}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </>
            ) : (
              <>
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
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="deviationPercentage"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Max Deviation (%)
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="number"
                        aria-invalid={fieldState.invalid}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </>
            )}
          </FieldGroup>
        </form>

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
            form="trigger-edit-form"
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
