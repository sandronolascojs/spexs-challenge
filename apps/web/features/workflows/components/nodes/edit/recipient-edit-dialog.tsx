'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Mail } from 'lucide-react';
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc/client';
import {
  NodeType,
  recipientEmailDataSchema,
  recipientInAppDataSchema,
} from '@spexs/types';

interface RecipientEditDialogProps {
  workflowId: string;
  recipientId: string;
  onClose: () => void;
}

export function RecipientEditDialog({
  workflowId,
  recipientId,
  onClose,
}: RecipientEditDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: workflow, isLoading } = useQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  const recipientNode = workflow?.nodes.find((n) => n.id === recipientId);
  const isEmail = recipientNode?.type === NodeType.RECIPIENT_EMAIL;

  const schema = isEmail ? recipientEmailDataSchema : recipientInAppDataSchema;
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  useEffect(() => {
    if (recipientNode?.data) {
      form.reset(recipientNode.data as FormValues);
    }
  }, [recipientNode, form]);

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
    if (!recipientNode) return;
    updateMutation.mutate({
      nodeId: recipientNode.id,
      data: data as Record<string, unknown>,
    });
  }

  if (isLoading || !recipientNode) {
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
            <div
              className={`flex size-8 items-center justify-center rounded-full ${isEmail ? 'bg-sky-500/10' : 'bg-amber-500/10'}`}
            >
              {isEmail ? (
                <Mail className="size-4 text-sky-600 dark:text-sky-400" />
              ) : (
                <Bell className="size-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <DialogTitle>Edit Recipient</DialogTitle>
              <DialogDescription>
                {isEmail
                  ? 'Configure email delivery'
                  : 'Configure in-app notification'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="recipient-edit-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="py-4">
            {isEmail ? (
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="e.g. dev@example.com"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            ) : (
              <Field>
                <FieldDescription>
                  In-app notifications are delivered to the current user by
                  default. No further configuration is required.
                </FieldDescription>
              </Field>
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
            form="recipient-edit-form"
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
