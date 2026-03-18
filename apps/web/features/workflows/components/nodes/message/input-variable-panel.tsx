'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Copy, Hash, Type } from 'lucide-react';
import type { VariableItem } from './lib/template-utils';

// ── Sub-components ────────────────────────────────────────────────────────────

function VariableTypeIndicator({ type }: { type: VariableItem['type'] }) {
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
      className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
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
          <span className="block truncate text-xs italic text-muted-foreground/50">
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

// ── View tabs ─────────────────────────────────────────────────────────────────

const INPUT_VIEW_TABS = ['Schema', 'Table', 'JSON'] as const;
type InputViewTab = (typeof INPUT_VIEW_TABS)[number];

// ── Main panel ────────────────────────────────────────────────────────────────

interface InputVariablePanelProps {
  inputNodeName: string | undefined;
  hasLastExecution: boolean;
  variables: VariableItem[];
  inputNodeOutputData: Record<string, unknown> | undefined;
  activeInputView: InputViewTab;
  onViewChange: (tab: InputViewTab) => void;
  onInsertVariable: (key: string) => void;
  onCopyVariable: (key: string) => void;
}

export { INPUT_VIEW_TABS, type InputViewTab };

export function InputVariablePanel({
  inputNodeName,
  hasLastExecution,
  variables,
  inputNodeOutputData,
  activeInputView,
  onViewChange,
  onInsertVariable,
  onCopyVariable,
}: InputVariablePanelProps) {
  const hasVariables = variables.length > 0;

  return (
    <aside className="flex flex-col overflow-hidden border-r border-border bg-muted/30">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Input
          </span>
          <span className="text-[10px] text-muted-foreground">
            {inputNodeName ?? 'No input connected'}
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
            onClick={() => onViewChange(tab)}
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
          <span className="text-xs italic text-muted-foreground/60">
            {!inputNodeName
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
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
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
                  onInsert={onInsertVariable}
                  onCopy={onCopyVariable}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground/60">
                  {!inputNodeName
                    ? 'Connect a node to use its output as variables.'
                    : 'Trigger the workflow once to load available variables.'}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
