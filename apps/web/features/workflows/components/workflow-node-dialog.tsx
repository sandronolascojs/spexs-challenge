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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc/client';
import {
  ComparisonOperator,
  type CreateWorkflowInput,
  NotificationChannel,
  TriggerType,
} from '@spexs/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkflowDialogStore } from '../stores/dialog-store';
import type { WorkflowWithRecipients } from '../types/canvas';

const COMPARISON_OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GREATER_THAN]: '> greater than',
  [ComparisonOperator.LESS_THAN]: '< less than',
  [ComparisonOperator.GREATER_THAN_OR_EQUAL]: '≥ greater than or equal',
  [ComparisonOperator.LESS_THAN_OR_EQUAL]: '≤ less than or equal',
  [ComparisonOperator.EQUAL]: '= equal to',
};

const COMPARISON_OPERATOR_VALUES: readonly ComparisonOperator[] = [
  ComparisonOperator.GREATER_THAN,
  ComparisonOperator.LESS_THAN,
  ComparisonOperator.GREATER_THAN_OR_EQUAL,
  ComparisonOperator.LESS_THAN_OR_EQUAL,
  ComparisonOperator.EQUAL,
];

const CHANNEL_VALUES: readonly NotificationChannel[] = [
  NotificationChannel.EMAIL,
  NotificationChannel.IN_APP,
];

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.IN_APP]: 'In-App',
};

const DEFAULT_THRESHOLD_VALUE = 0;
const DEFAULT_BASE_VALUE = 0;
const DEFAULT_DEVIATION_PERCENTAGE = 20;
const DEFAULT_OPERATOR = ComparisonOperator.GREATER_THAN;
const DEFAULT_METRIC_NAME = '';

function parseComparisonOperator(value: string): ComparisonOperator | null {
  for (const operator of COMPARISON_OPERATOR_VALUES) {
    if (operator === value) {
      return operator;
    }
  }

  return null;
}

function parseNotificationChannel(value: string): NotificationChannel | null {
  for (const channel of CHANNEL_VALUES) {
    if (channel === value) {
      return channel;
    }
  }

  return null;
}

function buildCreateWorkflowInputFromWorkflow(
  workflow: WorkflowWithRecipients,
): CreateWorkflowInput {
  const recipients = workflow.recipients.map((recipient) => ({
    channel: recipient.channel,
    recipient: recipient.recipient,
  }));

  if (workflow.triggerType === TriggerType.THRESHOLD) {
    return {
      name: workflow.name,
      triggerType: TriggerType.THRESHOLD,
      metricName: workflow.metricName ?? DEFAULT_METRIC_NAME,
      operator: workflow.operator ?? DEFAULT_OPERATOR,
      thresholdValue: workflow.thresholdValue ?? DEFAULT_THRESHOLD_VALUE,
      messageTemplate: workflow.messageTemplate,
      recipients,
    };
  }

  return {
    name: workflow.name,
    triggerType: TriggerType.VARIANCE,
    baseValue: workflow.baseValue ?? DEFAULT_BASE_VALUE,
    deviationPercentage:
      workflow.deviationPercentage ?? DEFAULT_DEVIATION_PERCENTAGE,
    messageTemplate: workflow.messageTemplate,
    recipients,
  };
}

interface WorkflowNodeDialogProps {
  workflow: WorkflowWithRecipients;
  isSaving: boolean;
  onSave: (nextInput: CreateWorkflowInput) => void;
}

export function WorkflowNodeDialog({
  workflow,
  isSaving,
  onSave,
}: WorkflowNodeDialogProps) {
  const { dialog, isOpen, closeDialog } = useWorkflowDialogStore();

  const baseInput = useMemo(
    () => buildCreateWorkflowInputFromWorkflow(workflow),
    [workflow],
  );

  const [workflowName, setWorkflowName] = useState(baseInput.name);
  const [triggerType, setTriggerType] = useState(baseInput.triggerType);
  const [metricName, setMetricName] = useState(
    baseInput.triggerType === TriggerType.THRESHOLD
      ? baseInput.metricName
      : DEFAULT_METRIC_NAME,
  );
  const [operator, setOperator] = useState(
    baseInput.triggerType === TriggerType.THRESHOLD
      ? baseInput.operator
      : DEFAULT_OPERATOR,
  );
  const [thresholdValue, setThresholdValue] = useState(
    baseInput.triggerType === TriggerType.THRESHOLD
      ? baseInput.thresholdValue
      : DEFAULT_THRESHOLD_VALUE,
  );
  const [baseValue, setBaseValue] = useState(
    baseInput.triggerType === TriggerType.VARIANCE
      ? baseInput.baseValue
      : DEFAULT_BASE_VALUE,
  );
  const [deviationPercentage, setDeviationPercentage] = useState(
    baseInput.triggerType === TriggerType.VARIANCE
      ? baseInput.deviationPercentage
      : DEFAULT_DEVIATION_PERCENTAGE,
  );
  const [messageTemplate, setMessageTemplate] = useState(
    baseInput.messageTemplate,
  );
  const [recipientChannel, setRecipientChannel] = useState<NotificationChannel>(
    workflow.recipients[0]?.channel ?? NotificationChannel.EMAIL,
  );
  const [recipientValue, setRecipientValue] = useState(
    workflow.recipients[0]?.recipient ?? '',
  );

  useEffect(() => {
    setWorkflowName(baseInput.name);
    setTriggerType(baseInput.triggerType);
    setMetricName(
      baseInput.triggerType === TriggerType.THRESHOLD
        ? baseInput.metricName
        : DEFAULT_METRIC_NAME,
    );
    setOperator(
      baseInput.triggerType === TriggerType.THRESHOLD
        ? baseInput.operator
        : DEFAULT_OPERATOR,
    );
    setThresholdValue(
      baseInput.triggerType === TriggerType.THRESHOLD
        ? baseInput.thresholdValue
        : DEFAULT_THRESHOLD_VALUE,
    );
    setBaseValue(
      baseInput.triggerType === TriggerType.VARIANCE
        ? baseInput.baseValue
        : DEFAULT_BASE_VALUE,
    );
    setDeviationPercentage(
      baseInput.triggerType === TriggerType.VARIANCE
        ? baseInput.deviationPercentage
        : DEFAULT_DEVIATION_PERCENTAGE,
    );
    setMessageTemplate(baseInput.messageTemplate);
    setRecipientChannel(
      workflow.recipients[0]?.channel ?? NotificationChannel.EMAIL,
    );
    setRecipientValue(workflow.recipients[0]?.recipient ?? '');
  }, [baseInput, workflow.recipients]);

  useEffect(() => {
    if (!dialog || dialog.type !== 'edit-recipient') {
      return;
    }

    const selectedRecipient = workflow.recipients.find(
      (recipient) => recipient.id === dialog.data.recipientId,
    );

    if (!selectedRecipient) {
      return;
    }

    setRecipientChannel(selectedRecipient.channel);
    setRecipientValue(selectedRecipient.recipient);
  }, [dialog, workflow.recipients]);

  if (!dialog || !isOpen || dialog.data.workflowId !== workflow.id) {
    return null;
  }

  function close() {
    closeDialog();
  }

  function saveTrigger() {
    if (triggerType === TriggerType.THRESHOLD) {
      onSave({
        name: workflowName,
        triggerType: TriggerType.THRESHOLD,
        metricName,
        operator,
        thresholdValue,
        messageTemplate: baseInput.messageTemplate,
        recipients: baseInput.recipients,
      });
      return;
    }

    onSave({
      name: workflowName,
      triggerType: TriggerType.VARIANCE,
      baseValue,
      deviationPercentage,
      messageTemplate: baseInput.messageTemplate,
      recipients: baseInput.recipients,
    });
  }

  function saveMessage() {
    if (baseInput.triggerType === TriggerType.THRESHOLD) {
      onSave({
        ...baseInput,
        messageTemplate,
      });
      return;
    }

    onSave({
      ...baseInput,
      messageTemplate,
    });
  }

  function saveRecipient() {
    if (!dialog || dialog.type !== 'edit-recipient') {
      return;
    }

    const recipients = workflow.recipients.map((recipient) => {
      if (recipient.id !== dialog.data.recipientId) {
        return {
          channel: recipient.channel,
          recipient: recipient.recipient,
        };
      }

      return {
        channel: recipientChannel,
        recipient: recipientValue,
      };
    });

    if (baseInput.triggerType === TriggerType.THRESHOLD) {
      onSave({
        ...baseInput,
        recipients,
      });
      return;
    }

    onSave({
      ...baseInput,
      recipients,
    });
  }

  if (dialog.type === 'edit-trigger') {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
            <DialogDescription>
              Update workflow name and trigger configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Workflow name</Label>
              <Input
                value={workflowName}
                onChange={(event) => setWorkflowName(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Trigger type</Label>
              <Select
                value={triggerType}
                onValueChange={(value) => {
                  if (value === TriggerType.THRESHOLD) {
                    setTriggerType(TriggerType.THRESHOLD);
                    return;
                  }
                  if (value === TriggerType.VARIANCE) {
                    setTriggerType(TriggerType.VARIANCE);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TriggerType.THRESHOLD}>
                    Threshold
                  </SelectItem>
                  <SelectItem value={TriggerType.VARIANCE}>Variance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {triggerType === TriggerType.THRESHOLD ? (
              <>
                <div className="space-y-1.5">
                  <Label>Metric name</Label>
                  <Input
                    value={metricName}
                    onChange={(event) => setMetricName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Operator</Label>
                  <Select
                    value={operator}
                    onValueChange={(value) => {
                      const parsedValue = parseComparisonOperator(value);
                      if (!parsedValue) {
                        return;
                      }
                      setOperator(parsedValue);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPARISON_OPERATOR_VALUES.map((candidateOperator) => (
                        <SelectItem
                          key={candidateOperator}
                          value={candidateOperator}
                        >
                          {COMPARISON_OPERATOR_LABELS[candidateOperator]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Threshold value</Label>
                  <Input
                    type="number"
                    value={thresholdValue}
                    onChange={(event) =>
                      setThresholdValue(Number(event.target.value))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Base value</Label>
                  <Input
                    type="number"
                    value={baseValue}
                    onChange={(event) =>
                      setBaseValue(Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Deviation percentage</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={deviationPercentage}
                    onChange={(event) =>
                      setDeviationPercentage(Number(event.target.value))
                    }
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={saveTrigger} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (dialog.type === 'edit-message') {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Update the output template shown in notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>Template</Label>
            <Textarea
              rows={4}
              value={messageTemplate}
              onChange={(event) => setMessageTemplate(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={saveMessage} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (dialog.type === 'edit-recipient') {
    const selectedRecipient = workflow.recipients.find(
      (recipient) => recipient.id === dialog.data.recipientId,
    );

    if (!selectedRecipient) {
      return null;
    }

    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recipient</DialogTitle>
            <DialogDescription>
              Update recipient channel and destination.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select
                value={recipientChannel}
                onValueChange={(value) => {
                  const channel = parseNotificationChannel(value);
                  if (!channel) {
                    return;
                  }
                  setRecipientChannel(channel);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_VALUES.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {CHANNEL_LABELS[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Recipient</Label>
              <Input
                value={recipientValue}
                onChange={(event) => setRecipientValue(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={saveRecipient} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (dialog.type === 'delete-recipient') {
    return (
      <DeleteRecipientDialog
        workflowId={dialog.data.workflowId}
        recipientId={dialog.data.recipientId}
        onClose={close}
      />
    );
  }

  return null;
}

// ── Delete-recipient confirmation ─────────────────────────────────────────────

function DeleteRecipientDialog({
  workflowId,
  recipientId,
  onClose,
}: {
  workflowId: string;
  recipientId: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.workflows.deleteRecipient.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        await queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
        onClose();
      },
    }),
  );

  function handleDelete() {
    deleteMutation.mutate({ workflowId, recipientId });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Recipient</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this recipient? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteMutation.error && (
          <p className="text-sm text-destructive">
            {deleteMutation.error.message}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
