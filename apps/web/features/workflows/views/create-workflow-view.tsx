'use client';

import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTRPC } from '@/lib/trpc/client';
import { type CreateWorkflowInput, createWorkflowSchema } from '@spexs/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDashed, GitBranch, Sigma, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const WORKFLOW_TEMPLATE_IDS = {
  THRESHOLD: 'threshold-template',
  VARIANCE: 'variance-template',
  SCRATCH: 'scratch-template',
} as const;

type WorkflowTemplateId =
  (typeof WORKFLOW_TEMPLATE_IDS)[keyof typeof WORKFLOW_TEMPLATE_IDS];

interface WorkflowTemplate {
  id: WorkflowTemplateId;
  title: string;
  description: string;
  highlights: readonly string[];
  icon: typeof GitBranch;
  input: CreateWorkflowInput;
}

const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: WORKFLOW_TEMPLATE_IDS.THRESHOLD,
    title: 'Threshold Alert',
    description:
      'Best for fixed limits such as CPU, memory, latency, and queue depth.',
    highlights: [
      'Static threshold rule',
      'Operator-aware trigger',
      'Fast setup',
    ],
    icon: GitBranch,
    input: {
      name: 'CPU Threshold Alert',
    },
  },
  {
    id: WORKFLOW_TEMPLATE_IDS.VARIANCE,
    title: 'Variance Watch',
    description:
      'Best for anomaly-style detection against a baseline and tolerance.',
    highlights: [
      'Baseline + deviation',
      'Noise-resistant trigger',
      'Great for trends',
    ],
    icon: Sigma,
    input: {
      name: 'Memory Variance Watch',
    },
  },
  {
    id: WORKFLOW_TEMPLATE_IDS.SCRATCH,
    title: 'Create From Scratch',
    description:
      'Create an empty starter workflow and configure everything in the canvas.',
    highlights: ['Blank start', 'Canvas-first editing', 'Agnostic structure'],
    icon: CircleDashed,
    input: {
      name: 'Untitled Workflow',
    },
  },
];

const SCRATCH_MODE = 'scratch';

function getTemplateById(id: WorkflowTemplateId): WorkflowTemplate {
  const template = WORKFLOW_TEMPLATES.find((item) => item.id === id);
  if (!template) {
    return WORKFLOW_TEMPLATES[0];
  }
  return template;
}

function TemplateCard({
  template,
  disabled,
  onSelect,
}: {
  template: WorkflowTemplate;
  disabled: boolean;
  onSelect: (template: WorkflowTemplate) => void;
}) {
  const Icon = template.icon;

  return (
    <Card
      className="cursor-pointer border-border/60 transition hover:border-primary/60 hover:shadow-sm"
      onClick={() => {
        if (!disabled) {
          onSelect(template);
        }
      }}
    >
      <CardHeader>
        <div className="mb-1 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <CardTitle>{template.title}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {template.highlights.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/70" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CreateWorkflowView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoCreatedFromModeRef = useRef(false);

  const createMutation = useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
        router.push('/workflows');
      },
    }),
  );

  function createWorkflowFromTemplate(template: WorkflowTemplate) {
    const parsedInput = createWorkflowSchema.safeParse(template.input);
    if (!parsedInput.success) {
      return;
    }

    createMutation.mutate(parsedInput.data);
  }

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode !== SCRATCH_MODE || hasAutoCreatedFromModeRef.current) {
      return;
    }

    const scratchTemplate = getTemplateById(WORKFLOW_TEMPLATE_IDS.SCRATCH);
    const parsedInput = createWorkflowSchema.safeParse(scratchTemplate.input);
    if (!parsedInput.success) {
      return;
    }

    hasAutoCreatedFromModeRef.current = true;
    createMutation.mutate(parsedInput.data);
  }, [createMutation, searchParams]);

  return (
    <>
      <DashboardTopNavbar
        items={[
          { id: 'workflows', label: 'Workflows', href: '/workflows' },
          { id: 'new-workflow', label: 'New Workflow' },
        ]}
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pt-0">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Create Workflow
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a starting point. Selecting any card creates the workflow
                immediately and sends you back to the list.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              disabled={createMutation.isPending}
              onSelect={createWorkflowFromTemplate}
            />
          ))}
        </div>

        {createMutation.error && (
          <p className="text-sm text-destructive">
            {createMutation.error.message}
          </p>
        )}

        {createMutation.isPending && (
          <p className="text-sm text-muted-foreground">Creating workflow…</p>
        )}
      </div>
    </>
  );
}
