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
import {
  GitBranch,
  Layers,
  MoreHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import {
  useDeleteWorkflow,
  useToggleWorkflowActive,
} from '../hooks/http/use-workflows';
import type { WorkflowListItem } from '../types/canvas';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const toggleMutation = useToggleWorkflowActive(workflow.id);
  const deleteMutation = useDeleteWorkflow();

  const isBusy = toggleMutation.isPending || deleteMutation.isPending;

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
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="size-3" />
                  <span>
                    {workflow.nodeCount} node
                    {workflow.nodeCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-70 transition-opacity hover:opacity-100 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Workflow options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8}>
                  <DropdownMenuItem asChild>
                    <Link href={`/workflows/${workflow.id}`}>View Details</Link>
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
