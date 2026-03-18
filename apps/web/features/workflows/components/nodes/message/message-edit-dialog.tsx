'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useTRPC } from '@/lib/trpc/client';
import {
  NodeType,
  type OutputMessageData,
  outputMessageDataSchema,
} from '@spexs/types';
import { toast } from 'sonner';

import { InputVariablePanel, type InputViewTab } from './input-variable-panel';
import { type VariableItem, flattenOutputData } from './lib/template-utils';
import { MessageOutputPreview } from './message-output-preview';
import { MessageTemplateOverlay } from './message-template-overlay';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageEditDialogProps {
  workflowId: string;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MessageEditDialog({
  workflowId,
  onClose,
}: MessageEditDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [activeInputView, setActiveInputView] =
    useState<InputViewTab>('Schema');

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  const { data: lastExecution } = useQuery(
    trpc.executions.getLastExecution.queryOptions({ workflowId }),
  );

  const messageNode = workflow?.nodes.find(
    (n) => n.type === NodeType.OUTPUT_MESSAGE,
  );

  // Walk connections to find the node wired directly into the message node
  const incomingConnection = workflow?.connections.find(
    (c) => c.toNodeId === messageNode?.id,
  );
  const inputNode = workflow?.nodes.find(
    (n) => n.id === incomingConnection?.fromNodeId,
  );

  // Prefer real execution output over static config data
  const nodeOutputByNodeId = lastExecution?.nodeOutputByNodeId ?? {};
  const inputNodeOutputData = inputNode?.id
    ? (nodeOutputByNodeId[inputNode.id] ?? undefined)
    : undefined;

  // Build variable list from execution output (node-agnostic)
  const variables: VariableItem[] = inputNodeOutputData
    ? flattenOutputData(inputNodeOutputData)
    : [];

  // Build a value map for the output preview (key → resolved string)
  const variableValueMap = new Map<string, string>();
  for (const variable of variables) {
    if (variable.value !== undefined) {
      variableValueMap.set(variable.key, variable.value);
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = useForm<OutputMessageData>({
    resolver: zodResolver(outputMessageDataSchema),
    defaultValues: { template: '' },
  });

  const templateValue =
    useWatch({ control: form.control, name: 'template' }) ?? '';

  // Reset form when node data loads — useEffect ensures useWatch picks up the value
  const messageNodeData = messageNode?.data;
  const formResetRef = useRef(false);
  useEffect(() => {
    if (messageNodeData && !formResetRef.current) {
      const parsed = outputMessageDataSchema.safeParse(messageNodeData);
      if (parsed.success) {
        form.reset(parsed.data);
        formResetRef.current = true;
      }
    }
  }, [messageNodeData, form]);

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

  function handleSubmit(data: OutputMessageData) {
    if (!messageNode) return;
    updateMutation.mutate({ nodeId: messageNode.id, data });
  }

  // ── Variable insertion ────────────────────────────────────────────────────

  const insertVariable = useCallback(
    (variableKey: string) => {
      const currentTemplate = form.getValues('template') ?? '';
      const token = `{{${variableKey}}}`;

      if (cursorPosition !== null) {
        const before = currentTemplate.slice(0, cursorPosition);
        const after = currentTemplate.slice(cursorPosition);
        form.setValue('template', before + token + after);
        setCursorPosition(cursorPosition + token.length);
      } else {
        form.setValue('template', currentTemplate + token);
      }

      requestAnimationFrame(() => textareaRef.current?.focus());
      toast.success(`Inserted ${token}`);
    },
    [form, cursorPosition],
  );

  function copyVariable(variableKey: string) {
    const token = `{{${variableKey}}}`;
    navigator.clipboard.writeText(token);
    toast.success('Copied to clipboard');
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isWorkflowLoading || !messageNode) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="flex h-40 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </DialogContent>
      </Dialog>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[85vh] w-[90vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl"
      >
        <DialogTitle className="sr-only">Edit {messageNode.name}</DialogTitle>

        {/* ─── Top bar ────────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to canvas
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <MessageSquare className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium">{messageNode.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </header>

        {/* ─── Three-panel body ───────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-[280px_1fr_1fr] overflow-hidden">
          {/* LEFT: Input panel */}
          <InputVariablePanel
            inputNodeName={inputNode?.name}
            hasLastExecution={!!lastExecution}
            variables={variables}
            inputNodeOutputData={inputNodeOutputData}
            activeInputView={activeInputView}
            onViewChange={setActiveInputView}
            onInsertVariable={insertVariable}
            onCopyVariable={copyVariable}
          />

          {/* CENTER: Parameters panel */}
          <main className="flex flex-col overflow-hidden border-r border-border">
            <div className="px-6 pt-5 pb-4">
              <h2 className="text-sm font-semibold text-foreground">
                Message Template
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Build your message using variables from the input. Click a
                variable on the left to insert it.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
              <form
                id="message-edit-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-1 flex-col"
              >
                <Controller
                  name="template"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-1 flex-col gap-1.5">
                      <label
                        htmlFor={field.name}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Template
                      </label>
                      <MessageTemplateOverlay
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        fieldName={field.name}
                        fieldRef={(el) => {
                          field.ref(el);
                          textareaRef.current = el;
                        }}
                        isInvalid={fieldState.invalid}
                        cursorPosition={cursorPosition}
                        onCursorChange={setCursorPosition}
                        variables={variables}
                      />
                      {fieldState.invalid && (
                        <p className="text-xs text-destructive">
                          {fieldState.error?.message ?? 'Template is required'}
                        </p>
                      )}
                    </div>
                  )}
                />
              </form>
            </div>
          </main>

          {/* RIGHT: Output panel */}
          <MessageOutputPreview
            template={templateValue}
            variableValueMap={variableValueMap}
            onFocusTextarea={() => textareaRef.current?.focus()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
