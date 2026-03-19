'use client';

import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { Button } from '@/components/ui/button';
import { WorkflowTemplate, createWorkflowSchema } from '@spexs/types';
import { GitBranch, Plus, Sigma } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useRef } from 'react';
import { useCreateWorkflow } from '../hooks/http/use-workflows';
import { WORKFLOW_MODES, workflowModeParser } from '../lib/search-params';

// ── Template definitions ──────────────────────────────────────────────────────

interface TemplateConfig {
  template: WorkflowTemplate;
  name: string;
  title: string;
  description: string;
  bullets: readonly string[];
  icon: typeof GitBranch;
}

const TEMPLATES: readonly TemplateConfig[] = [
  {
    template: WorkflowTemplate.THRESHOLD,
    name: 'CPU Threshold Alert',
    title: 'Threshold Alert',
    description: 'Fires when a metric crosses a fixed limit.',
    bullets: ['Static threshold rule', 'Operator-aware trigger', 'Fast setup'],
    icon: GitBranch,
  },
  {
    template: WorkflowTemplate.VARIANCE,
    name: 'Memory Variance Watch',
    title: 'Variance Watch',
    description: 'Fires when a metric deviates from a baseline.',
    bullets: ['Baseline + deviation', 'Noise-resistant trigger', 'Trend-aware'],
    icon: Sigma,
  },
] as const;

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  config,
  disabled,
  onSelect,
}: {
  config: TemplateConfig;
  disabled: boolean;
  onSelect: (config: TemplateConfig) => void;
}) {
  const Icon = config.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(config)}
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
        <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>

      <h3 className="mb-1 text-base font-semibold tracking-tight">
        {config.title}
      </h3>
      <p className="mb-5 text-sm text-muted-foreground">{config.description}</p>

      <ul className="mt-auto space-y-1.5">
        {config.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="size-1 shrink-0 rounded-full bg-primary/50" />
            {bullet}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CreateWorkflowView() {
  const router = useRouter();
  const [mode] = useQueryState(
    'mode',
    workflowModeParser.withOptions({ shallow: false }),
  );
  const hasAutoCreatedRef = useRef(false);

  const createMutation = useCreateWorkflow();

  function handleSelect(config: TemplateConfig) {
    const parsed = createWorkflowSchema.safeParse({
      name: config.name,
      template: config.template,
    });
    if (parsed.success) {
      createMutation.mutate(parsed.data, {
        onSuccess: () => router.push('/workflows'),
      });
    }
  }

  const handleScratch = useCallback(() => {
    const parsed = createWorkflowSchema.safeParse({
      name: 'Untitled Workflow',
      template: WorkflowTemplate.SCRATCH,
    });
    if (parsed.success) {
      createMutation.mutate(parsed.data, {
        onSuccess: () => router.push('/workflows'),
      });
    }
  }, [createMutation, router]);

  useEffect(() => {
    if (mode !== WORKFLOW_MODES.SCRATCH || hasAutoCreatedRef.current) return;
    hasAutoCreatedRef.current = true;
    handleScratch();
  }, [mode, handleScratch]);

  return (
    <>
      <DashboardTopNavbar
        items={[
          { id: 'workflows', label: 'Workflows', href: '/workflows' },
          { id: 'new-workflow', label: 'New Workflow' },
        ]}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Workflow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start from a template or build from scratch.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((config) => (
            <TemplateCard
              key={config.template}
              config={config}
              disabled={createMutation.isPending}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={handleScratch}
          className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-transparent px-6 py-8 transition-all hover:border-primary/40 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
            <Plus className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Start from scratch</p>
            <p className="text-xs text-muted-foreground">
              Blank canvas, you configure everything.
            </p>
          </div>
        </button>

        {createMutation.error && (
          <p className="text-sm text-destructive">
            {createMutation.error.message}
          </p>
        )}
      </div>
    </>
  );
}
