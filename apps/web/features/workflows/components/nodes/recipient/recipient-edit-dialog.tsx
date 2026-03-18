'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc/client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  NodeType,
  type RecipientInAppData,
  recipientEmailDataSchema,
  recipientInAppDataSchema,
} from '@spexs/types';
import { useForm } from 'react-hook-form';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecipientEditDialogProps {
  workflowId: string;
  recipientId: string;
  onClose: () => void;
}

interface RecipientFormProps {
  initialData: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FORM_ID = 'recipient-edit-form';
const MAX_EMAIL_ENTRIES = 10;

// ── Email entry helpers ───────────────────────────────────────────────────────

interface EmailEntry {
  id: string;
  value: string;
  error?: string;
}

let entryCounter = 0;

function createEmptyEntry(): EmailEntry {
  return { id: `entry-${++entryCounter}`, value: '' };
}

function createEntryFromEmail(email: string): EmailEntry {
  return { id: `entry-${++entryCounter}`, value: email };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Email form ────────────────────────────────────────────────────────────────

function EmailForm({ initialData, onSubmit }: RecipientFormProps) {
  const parsed = recipientEmailDataSchema.safeParse(initialData);
  const initialEmails = parsed.success ? parsed.data.emails : [];

  const [entries, setEntries] = useState<EmailEntry[]>(() =>
    initialEmails.length > 0
      ? initialEmails.map((email) => createEntryFromEmail(email))
      : [createEmptyEntry()],
  );

  function updateEntry(index: number, value: string) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, value, error: undefined } : entry,
      ),
    );
  }

  function addEntry() {
    if (entries.length < MAX_EMAIL_ENTRIES) {
      setEntries((prev) => [...prev, createEmptyEntry()]);
    }
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    let isValid = true;

    const validated = entries.map((entry) => {
      const trimmed = entry.value.trim();
      if (!trimmed) {
        isValid = false;
        return { ...entry, error: 'Email is required' };
      }
      if (!isValidEmail(trimmed)) {
        isValid = false;
        return { ...entry, error: 'Enter a valid email address' };
      }
      return { ...entry, error: undefined };
    });

    // Check for duplicates
    const emails = validated.map((e) => e.value.trim().toLowerCase());
    const withDuplicates = validated.map((entry, i) => {
      if (emails.indexOf(entry.value.trim().toLowerCase()) !== i) {
        isValid = false;
        return { ...entry, error: 'Duplicate email' };
      }
      return entry;
    });

    setEntries(withDuplicates);
    return isValid;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ emails: entries.map((entry) => entry.value.trim()) });
  }

  const filledCount = entries.filter((e) => e.value.trim()).length;

  return (
    <form id={FORM_ID} onSubmit={handleSubmit}>
      <div className="space-y-3 py-2">
        {/* Column header */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Email
          </span>
          <div className="w-8" />
        </div>

        {/* Email rows */}
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={entry.id} className="space-y-1">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={entry.value}
                    onChange={(e) => updateEntry(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index === entries.length - 1) addEntry();
                      }
                    }}
                    className={`pl-8 text-sm ${entry.error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    autoFocus={index === entries.length - 1}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length === 1}
                  tabIndex={-1}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {entry.error && (
                <p className="pl-0.5 text-xs text-destructive">{entry.error}</p>
              )}
            </div>
          ))}
        </div>

        {/* Add more */}
        {entries.length < MAX_EMAIL_ENTRIES && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={addEntry}
          >
            <Plus className="size-3.5" />
            Add another
          </Button>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          {filledCount > 1
            ? `${filledCount} recipients will receive this notification.`
            : 'Add one or more email addresses to receive notifications.'}
        </p>
      </div>
    </form>
  );
}

// ── In-App form ───────────────────────────────────────────────────────────────

function InAppForm({ initialData, onSubmit }: RecipientFormProps) {
  const parsed = recipientInAppDataSchema.safeParse(initialData);

  const form = useForm<RecipientInAppData>({
    resolver: zodResolver(recipientInAppDataSchema),
    defaultValues: parsed.success ? parsed.data : {},
  });

  return (
    <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="py-4">
        <Field>
          <FieldDescription>
            In-app notifications are delivered to the current user by default.
            No further configuration is required.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

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

  function handleFormSubmit(formData: Record<string, unknown>) {
    if (!recipientNode) return;
    updateMutation.mutate({ nodeId: recipientNode.id, data: formData });
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
      <DialogContent className="sm:max-w-lg">
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
                  ? 'Add email addresses to receive workflow notifications.'
                  : 'Configure in-app notification'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isEmail ? (
          <EmailForm
            initialData={recipientNode.data}
            onSubmit={handleFormSubmit}
          />
        ) : (
          <InAppForm
            initialData={recipientNode.data}
            onSubmit={handleFormSubmit}
          />
        )}

        <DialogFooter showCloseButton>
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
