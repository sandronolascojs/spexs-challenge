'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  Hash,
  Loader2,
  MessageSquare,
  Type,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { NodeType, outputMessageDataSchema } from '@spexs/types';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Matches `{{variable.key}}` tokens inside a template string. */
const VARIABLE_TOKEN_PATTERN = /(\{\{[^}]+\}\})/g;

const INPUT_VIEW_TABS = ['Schema', 'Table', 'JSON'] as const;
type InputViewTab = (typeof INPUT_VIEW_TABS)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageEditDialogProps {
  workflowId: string;
  onClose: () => void;
}

type FormValues = z.infer<typeof outputMessageDataSchema>;

interface VariableItem {
  /** Dot-notation path used in `{{...}}` templates, e.g. `trigger.metricName` */
  key: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Actual runtime value from the last execution (undefined when no run yet) */
  value?: string;
  type: 'string' | 'number' | 'boolean' | 'object';
}

// ── Variable extraction ───────────────────────────────────────────────────────

/**
 * Recursively flattens a JSON object into dot-notation paths.
 * Skips the `triggered` boolean (internal engine flag) and null values.
 *
 * Example:
 *   { trigger: { metricName: "cpu", value: 95 } }
 *   → [{ key: "trigger.metricName", value: "cpu", type: "string" }, ...]
 */
function flattenOutputData(
  obj: Record<string, unknown>,
  prefix = '',
  depth = 0,
): VariableItem[] {
  const MAX_DEPTH = 4;
  const items: VariableItem[] = [];

  for (const [rawKey, rawValue] of Object.entries(obj)) {
    if (rawValue === null || rawValue === undefined) continue;
    // Skip internal engine flags
    if (rawKey === 'triggered' || rawKey === 'triggerData') continue;

    const dotKey = prefix ? `${prefix}.${rawKey}` : rawKey;
    const label = dotKey;

    if (typeof rawValue === 'string') {
      items.push({ key: dotKey, label, value: rawValue, type: 'string' });
    } else if (typeof rawValue === 'number') {
      items.push({
        key: dotKey,
        label,
        value: String(rawValue),
        type: 'number',
      });
    } else if (typeof rawValue === 'boolean') {
      items.push({
        key: dotKey,
        label,
        value: String(rawValue),
        type: 'boolean',
      });
    } else if (typeof rawValue === 'object' && depth < MAX_DEPTH) {
      // Recurse into nested objects
      items.push(
        ...flattenOutputData(
          rawValue as Record<string, unknown>,
          dotKey,
          depth + 1,
        ),
      );
    }
  }

  return items;
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

interface ResolvedSegment {
  /** Stable key derived from character offset — safe to use as React key. */
  key: string;
  text: string;
  /** True when the value was resolved from config (static preview value). */
  isResolved: boolean;
  /** True when the token exists but has no static preview value (runtime-only). */
  isDynamic: boolean;
}

/**
 * Splits a template into segments, resolving known static values and
 * marking runtime-only tokens so they can be highlighted differently.
 * Each segment has a stable `key` built from its character offset.
 */
function resolveTemplateSegments(
  template: string,
  variableMap: Map<string, string>,
): ResolvedSegment[] {
  const parts = template.split(VARIABLE_TOKEN_PATTERN);
  const segments: ResolvedSegment[] = [];
  let offset = 0;

  for (const part of parts) {
    VARIABLE_TOKEN_PATTERN.lastIndex = 0;
    if (VARIABLE_TOKEN_PATTERN.test(part)) {
      const variableKey = part.slice(2, -2);
      const resolved = variableMap.get(variableKey);
      if (resolved !== undefined) {
        segments.push({
          key: `resolved-${offset}`,
          text: resolved,
          isResolved: true,
          isDynamic: false,
        });
      } else {
        segments.push({
          key: `dynamic-${offset}`,
          text: part,
          isResolved: false,
          isDynamic: true,
        });
      }
    } else {
      segments.push({
        key: `text-${offset}`,
        text: part,
        isResolved: false,
        isDynamic: false,
      });
    }
    offset += part.length;
  }

  return segments;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VariableTypeIndicator({
  type,
}: {
  type: 'string' | 'number' | 'boolean' | 'object';
}) {
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
        type === 'string'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : type === 'number'
            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}
    >
      {type === 'string' ? (
        <Type className="size-3" />
      ) : (
        <Hash className="size-3" />
      )}
    </span>
  );
}

function InputVariableRow({
  variable,
  onInsert,
  onCopy,
}: {
  variable: VariableItem;
  onInsert: (key: string) => void;
  onCopy: (key: string) => void;
}) {
  return (
    <div
      className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted cursor-pointer"
      onClick={() => onInsert(variable.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onInsert(variable.key);
      }}
    >
      <VariableTypeIndicator type={variable.type} />

      <div className="flex-1 overflow-hidden">
        <span className="block truncate font-mono text-xs font-medium text-foreground">
          {variable.key}
        </span>
        {variable.value !== undefined ? (
          <span className="block truncate text-xs text-muted-foreground">
            {variable.value}
          </span>
        ) : (
          <span className="block truncate text-xs text-muted-foreground/50 italic">
            runtime value
          </span>
        )}
      </div>

      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onCopy(variable.key);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            onCopy(variable.key);
          }
        }}
      >
        <Copy className="size-3" />
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MessageEditDialog({
  workflowId,
  onClose,
}: MessageEditDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [activeInputView, setActiveInputView] =
    useState<InputViewTab>('Schema');

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  // Load the last execution so we can show real runtime values in the variable panel
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

  // Prefer real execution output over static config data.
  // nodeOutputByNodeId maps nodeId → the outputData that executor stored.
  const nodeOutputByNodeId = lastExecution?.nodeOutputByNodeId ?? {};
  const inputNodeOutputData = inputNode?.id
    ? (nodeOutputByNodeId[inputNode.id] as Record<string, unknown> | undefined)
    : undefined;

  // Build variable list: if we have real execution output, flatten it (node-agnostic).
  // Fall back to an empty list if no execution has run yet.
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

  const hasLastExecution = !!lastExecution;
  const hasVariables = variables.length > 0;

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = useForm<FormValues>({
    resolver: zodResolver(outputMessageDataSchema),
    defaultValues: { template: '' },
  });

  const templateValue =
    useWatch({ control: form.control, name: 'template' }) ?? '';

  useEffect(() => {
    if (messageNode?.data) {
      form.reset(messageNode.data as FormValues);
    }
  }, [messageNode, form]);

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
    if (!messageNode) return;
    updateMutation.mutate({
      nodeId: messageNode.id,
      data: data as Record<string, unknown>,
    });
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

      // Refocus the textarea after insertion
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

  function handleTextareaSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    setCursorPosition(e.currentTarget.selectionStart);
  }

  function handleTextareaScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (bgRef.current) {
      bgRef.current.scrollTop = e.currentTarget.scrollTop;
      bgRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
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
        className="flex h-[85vh] w-[90vw] max-w-[95vw] sm:max-w-[90vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Edit {messageNode.name}</DialogTitle>
        {/* ─── Top bar ──────────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to canvas
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <MessageSquare className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium">{messageNode.name}</span>
            </div>
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
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </header>

        {/* ─── Three-panel body ─────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-[280px_1fr_1fr] overflow-hidden">
          {/* ─── LEFT: Input panel ──────────────────────────────────────────── */}
          <aside className="flex flex-col overflow-hidden border-r border-border bg-muted/30">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Input
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {inputNode?.name ?? 'No input connected'}
                </span>
              </div>
              {hasLastExecution && (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Last run
                </span>
              )}
            </div>

            {/* View tabs */}
            <div className="flex items-center gap-1 px-4 pb-3">
              {INPUT_VIEW_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveInputView(tab)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeInputView === tab
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Item count / status */}
            <div className="border-t border-border px-4 py-2">
              {hasVariables ? (
                <span className="text-xs text-muted-foreground">
                  {variables.length} {variables.length === 1 ? 'item' : 'items'}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  {!inputNode
                    ? 'No node connected'
                    : !hasLastExecution
                      ? 'Run workflow to see values'
                      : 'No output from last run'}
                </span>
              )}
            </div>

            {/* Variable list / JSON view */}
            <ScrollArea className="flex-1">
              {activeInputView === 'JSON' ? (
                <div className="px-3 pb-4">
                  <pre className="rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground overflow-auto max-h-[60vh]">
                    {inputNodeOutputData
                      ? JSON.stringify(inputNodeOutputData, null, 2)
                      : '// No execution data yet.\n// Trigger the workflow to populate output.'}
                  </pre>
                </div>
              ) : (
                <div className="space-y-0.5 px-2 pb-4">
                  {hasVariables ? (
                    variables.map((variable) => (
                      <InputVariableRow
                        key={variable.key}
                        variable={variable}
                        onInsert={insertVariable}
                        onCopy={copyVariable}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <p className="text-xs text-muted-foreground/60">
                        {!inputNode
                          ? 'Connect a node to use its output as variables.'
                          : 'Trigger the workflow once to load available variables.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* ─── CENTER: Parameters panel ───────────────────────────────────── */}
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
              {/* Template overlay textarea */}
              <form
                id="message-edit-form"
                onSubmit={form.handleSubmit(onSubmit)}
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
                      <div className="group relative flex flex-1 overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary/20">
                        {/* Background div rendering colored tokens */}
                        <div
                          ref={bgRef}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 z-0 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-foreground"
                        >
                          {!templateValue ? (
                            <span className="text-muted-foreground/40">
                              e.g. Alert: {'{{trigger.metricName}}'} has reached{' '}
                              {'{{trigger.value}}'}
                            </span>
                          ) : (
                            (() => {
                              const parts = templateValue.split(
                                VARIABLE_TOKEN_PATTERN,
                              );
                              let charOffset = 0;
                              return parts.map((segment) => {
                                const key = `bg-${charOffset}`;
                                charOffset += segment.length;
                                VARIABLE_TOKEN_PATTERN.lastIndex = 0;
                                if (VARIABLE_TOKEN_PATTERN.test(segment)) {
                                  return (
                                    <mark
                                      key={key}
                                      className="bg-primary/20 text-primary"
                                    >
                                      {segment}
                                    </mark>
                                  );
                                }
                                return <span key={key}>{segment}</span>;
                              });
                            })()
                          )}
                          {/* Empty spacing suffix to allow scrolling past final newline */}
                          {templateValue.endsWith('\n') ? <br /> : null}
                        </div>

                        {/* Foreground invisible textarea that captures typing/selection */}
                        <Textarea
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            textareaRef.current = el;
                          }}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          className={cn(
                            'absolute inset-0 z-10 resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-transparent caret-foreground shadow-none outline-none focus-visible:ring-0',
                          )}
                          onSelect={handleTextareaSelect}
                          onClick={handleTextareaSelect}
                          onScroll={handleTextareaScroll}
                        />
                      </div>
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

          {/* ─── RIGHT: Output panel ────────────────────────────────────────── */}
          <aside className="relative flex flex-col overflow-hidden bg-muted/20">
            <div className="px-6 pt-5 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Output
              </span>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 pb-6">
                {templateValue ? (
                  <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Resolved Preview
                      </span>
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                        Live
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {resolveTemplateSegments(
                        templateValue,
                        variableValueMap,
                      ).map((segment) => {
                        if (segment.isDynamic) {
                          return (
                            <span
                              key={segment.key}
                              className="rounded bg-primary/20 px-1 font-semibold text-primary"
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        if (segment.isResolved) {
                          return (
                            <span
                              key={segment.key}
                              className="rounded bg-emerald-500/15 px-0.5 text-emerald-700 dark:text-emerald-400"
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        return (
                          <span key={segment.key} className="text-foreground">
                            {segment.text}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="size-5 text-muted-foreground" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Write a template to see the output preview
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      or{' '}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                        onClick={() => textareaRef.current?.focus()}
                      >
                        start typing
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
