'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/trpc/client';
import { TriggerType } from '@spexs/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import type { WorkflowListItem } from '../types/canvas';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries(trpc.workflows.list.queryFilter());

  const toggleMutation = useMutation(
    trpc.workflows.toggleActive.mutationOptions({ onSuccess: invalidate }),
  );

  const deleteMutation = useMutation(
    trpc.workflows.delete.mutationOptions({ onSuccess: invalidate }),
  );

  const isBusy = toggleMutation.isPending || deleteMutation.isPending;
  const isThreshold = workflow.triggerType === TriggerType.THRESHOLD;
  const triggerLabel = isThreshold ? 'Threshold' : 'Variance';
  const conditionSummary = isThreshold
    ? `${triggerLabel} · ${workflow.metricName ?? 'n/a'} ${operatorSymbol(workflow.operator)} ${formatNumberValue(workflow.thresholdValue)}`
    : `${triggerLabel} · base ${formatNumberValue(workflow.baseValue)} · deviation ±${formatNumberValue(workflow.deviationPercentage)}%`;

  return (
    <div className="group relative flex h-52 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_55%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
            <GitBranch className="size-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/workflows/${workflow.id}`}
                  className="line-clamp-1 text-base leading-tight font-semibold tracking-tight hover:underline"
                >
                  {workflow.name}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {triggerLabel} trigger
                </p>
              </div>

              <DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-70 transition-opacity hover:opacity-100 group-hover:opacity-100"
                  render={<DropdownMenuTrigger />}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Workflow options</span>
                </Button>
                <DropdownMenuContent align="end" sideOffset={8}>
                  <DropdownMenuItem
                    render={<Link href={`/workflows/${workflow.id}`} />}
                  >
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      deleteMutation.mutate({ id: workflow.id });
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Condition
          </p>
          <p className="mt-1 truncate font-mono text-xs font-semibold text-foreground">
            {conditionSummary}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={workflow.isActive ? 'default' : 'secondary'}
              className="h-5 border-0 px-2 text-[10px] font-medium"
            >
              {workflow.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {workflow.isActive && (
              <Badge className="h-5 border-0 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Sparkles className="mr-1 size-2.5" />
                Live
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Enabled
            </span>
            <Switch
              checked={workflow.isActive}
              disabled={isBusy}
              onCheckedChange={(isActive) => {
                toggleMutation.mutate({ id: workflow.id, isActive });
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
              aria-label={
                workflow.isActive ? 'Deactivate workflow' : 'Activate workflow'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const MemoizedWorkflowCard = memo(WorkflowCard);

function operatorSymbol(op: string | null): string {
  const map: Record<string, string> = {
    gt: '>',
    lt: '<',
    gte: '≥',
    lte: '≤',
    eq: '=',
  };
  return op ? (map[op] ?? op) : '?';
}

function formatNumberValue(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return `${value}`;
}
