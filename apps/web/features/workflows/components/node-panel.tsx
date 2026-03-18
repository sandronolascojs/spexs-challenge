'use client';

import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTRPC } from '@/lib/trpc/client';
import { NodeType } from '@spexs/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactFlow } from '@xyflow/react';
import {
  Bell,
  Mail,
  MessageSquare,
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useWorkflowDialogStore } from '../stores/dialog-store';

// ── Node type catalog ─────────────────────────────────────────────────────────

interface NodeCatalogEntry {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  defaultData: Record<string, unknown>;
}

const NODE_CATALOG: NodeCatalogEntry[] = [
  {
    type: NodeType.TRIGGER_THRESHOLD,
    label: 'Threshold Trigger',
    description: 'Fire when a metric exceeds a threshold',
    icon: Zap,
    iconClass: 'text-primary bg-primary/10',
    defaultData: { metricName: '', operator: 'gt', thresholdValue: 0 },
  },
  {
    type: NodeType.TRIGGER_VARIANCE,
    label: 'Variance Trigger',
    description: 'Fire when a metric deviates from baseline',
    icon: TrendingUp,
    iconClass: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
    defaultData: { metricName: '', baseValue: 0, deviationPercentage: 10 },
  },
  {
    type: NodeType.OUTPUT_MESSAGE,
    label: 'Output Message',
    description: 'Format a message using upstream data',
    icon: MessageSquare,
    iconClass: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
    defaultData: {
      template: 'Alert: {{trigger.metricName}} is {{trigger.value}}',
    },
  },
  {
    type: NodeType.RECIPIENT_EMAIL,
    label: 'Email Recipient',
    description: 'Send the message via email',
    icon: Mail,
    iconClass: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
    defaultData: { email: '' },
  },
  {
    type: NodeType.RECIPIENT_IN_APP,
    label: 'In-App Notification',
    description: 'Send an in-app notification',
    icon: Bell,
    iconClass: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
    defaultData: {},
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface NodePanelProps {
  workflowId: string;
}

export function NodePanel({ workflowId }: NodePanelProps) {
  const { isNodePanelOpen, setNodePanelOpen } = useWorkflowDialogStore();
  const [searchQuery, setSearchQuery] = useState('');
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const addNodeMutation = useMutation(
    trpc.workflows.addNode.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        setNodePanelOpen(false);
      },
    }),
  );

  const { getNodes, screenToFlowPosition } = useReactFlow();

  function calculateNewNodePosition() {
    // 1. Get the DOM container of the React Flow canvas to find its center in pixel space
    const flowContainer = document.querySelector('.react-flow');
    if (!flowContainer) return { x: 250, y: 250 }; // Fallback

    const { width, height, left, top } = flowContainer.getBoundingClientRect();

    // Calculate the absolute center of the screen viewport for the flow canvas
    const screenCenter = {
      x: left + width / 2,
      y: top + height / 2,
    };

    // 2. Convert screen pixels to flow internal coordinates (accounting for zoom and pan)
    const basePosition = screenToFlowPosition(screenCenter);

    // Offset slightly so the node's visual center matches the screen center (assuming ~150px wide node)
    let candidateX = basePosition.x - 75;
    let candidateY = basePosition.y - 40;

    // 3. Prevent stacking: if a node already exists roughly exactly here, slide it down+right by 30px
    const existingNodes = getNodes();
    let hasOverlap = true;

    while (hasOverlap) {
      // eslint-disable-next-line no-loop-func
      hasOverlap = existingNodes.some((node) => {
        // give it a 10px buffer
        return (
          Math.abs(node.position.x - candidateX) < 10 &&
          Math.abs(node.position.y - candidateY) < 10
        );
      });

      if (hasOverlap) {
        candidateX += 30;
        candidateY += 30;
      }
    }

    return { x: candidateX, y: candidateY };
  }

  function handleAddNode(entry: NodeCatalogEntry) {
    addNodeMutation.mutate({
      workflowId,
      type: entry.type,
      name: entry.label,
      data: entry.defaultData,
      position: calculateNewNodePosition(),
    });
  }

  const filteredCatalog = NODE_CATALOG.filter(
    (entry) =>
      entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Sheet open={isNodePanelOpen} onOpenChange={setNodePanelOpen}>
      <SheetContent side="left" className="flex w-80 flex-col sm:w-96">
        <div className="p-6 pb-4">
          <SheetHeader>
            <SheetTitle>Add Node</SheetTitle>
            <SheetDescription>
              Select a node type to add to your workflow.
            </SheetDescription>
          </SheetHeader>
          <div className="relative mt-4">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              className="bg-accent/50 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-6 pt-0">
          {filteredCatalog.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No nodes found...
            </p>
          ) : (
            filteredCatalog.map((entry) => (
              <button
                key={entry.type}
                type="button"
                className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card p-3 text-left transition-colors hover:bg-accent"
                onClick={() => handleAddNode(entry)}
                disabled={addNodeMutation.isPending}
              >
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${entry.iconClass}`}
                >
                  <entry.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.description}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
