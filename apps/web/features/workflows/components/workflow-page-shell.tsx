'use client';

import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTRPC } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { workflowTabParser } from '../lib/search-params';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowHistoryView } from './workflow-history-view';

// ── Inline-editable workflow name ─────────────────────────────────────────────

function EditableWorkflowName({
  workflowId,
  name,
}: {
  workflowId: string;
  name: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const updateMutation = useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        void queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
        setIsEditing(false);
      },
    }),
  );

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: workflowId, name: trimmed });
  }, [draft, name, workflowId, updateMutation]);

  const handleCancel = useCallback(() => {
    setDraft(name);
    setIsEditing(false);
  }, [name]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSave();
      } else if (event.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  if (isEditing) {
    return (
      <span className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateMutation.isPending}
          className="h-7 w-48 text-sm"
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Check className="size-3.5 text-emerald-500" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
        >
          <X className="size-3.5 text-muted-foreground" />
        </Button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors',
        'hover:bg-muted',
      )}
    >
      <span className="text-sm font-medium">{name}</span>
      <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

interface WorkflowPageShellProps {
  workflowId: string;
}

export function WorkflowPageShell({ workflowId }: WorkflowPageShellProps) {
  const trpc = useTRPC();

  const [tab, setTab] = useQueryState(
    'tab',
    workflowTabParser.withDefault('canvas').withOptions({ shallow: false }),
  );

  const { data: workflow } = useQuery(
    trpc.workflows.getById.queryOptions({ id: workflowId }),
  );

  const workflowName = workflow?.name ?? 'Loading…';

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as typeof tab)}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <DashboardTopNavbar
        withBorder
        items={[
          { id: 'workflows', label: 'Workflows', href: '/workflows' },
          {
            id: 'workflow-detail',
            label: (
              <EditableWorkflowName
                workflowId={workflowId}
                name={workflowName}
              />
            ),
          },
        ]}
      >
        <TabsList>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="history">Executions</TabsTrigger>
        </TabsList>
      </DashboardTopNavbar>

      <TabsContent value="canvas" className="mt-0 flex-1 overflow-hidden">
        <WorkflowCanvas workflowId={workflowId} />
      </TabsContent>

      <TabsContent value="history" className="mt-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Execution History
            </h2>
            <p className="text-sm text-muted-foreground">
              Past workflow executions and their results.
            </p>
          </div>
          <WorkflowHistoryView workflowId={workflowId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
