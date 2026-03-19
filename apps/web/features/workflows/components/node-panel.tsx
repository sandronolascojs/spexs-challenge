'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NodeType } from '@spexs/types';
import { useReactFlow } from '@xyflow/react';
import {
  Bell,
  ChevronRight,
  Mail,
  MessageSquare,
  Play,
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useAddNode } from '../hooks/http/use-workflows';
import { useWorkflowDialogStore } from '../stores/dialog-store';
import type { WorkflowNodeRow } from '../types/canvas';

// ── Node type catalog ─────────────────────────────────────────────────────────

interface NodeCatalogEntry {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultData: Record<string, unknown>;
}

interface NodeCatalogSection {
  id: string;
  label: string;
  items: NodeCatalogEntry[];
}

const NODE_CATALOG_SECTIONS: NodeCatalogSection[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    items: [
      {
        type: NodeType.MANUAL_TRIGGER,
        label: 'Manual Trigger',
        description: 'Start the workflow manually on demand',
        icon: Play,
        defaultData: {},
      },
      {
        type: NodeType.TRIGGER_THRESHOLD,
        label: 'Threshold Trigger',
        description: 'Fire when a metric exceeds a threshold',
        icon: Zap,
        defaultData: { metricName: '', operator: 'gt', thresholdValue: 0 },
      },
      {
        type: NodeType.TRIGGER_VARIANCE,
        label: 'Variance Trigger',
        description: 'Fire when a metric deviates from baseline',
        icon: TrendingUp,
        defaultData: { metricName: '', baseValue: 0, deviationPercentage: 10 },
      },
    ],
  },
  {
    id: 'messages',
    label: 'Messages',
    items: [
      {
        type: NodeType.OUTPUT_MESSAGE,
        label: 'Output Message',
        description: 'Format a message using upstream data',
        icon: MessageSquare,
        defaultData: {
          template: 'Alert: {{trigger.metricName}} is {{trigger.value}}',
        },
      },
    ],
  },
  {
    id: 'recipients',
    label: 'Recipients',
    items: [
      {
        type: NodeType.RECIPIENT_EMAIL,
        label: 'Email Recipient',
        description: 'Send the message via email',
        icon: Mail,
        defaultData: { email: '' },
      },
      {
        type: NodeType.RECIPIENT_IN_APP,
        label: 'In-App Notification',
        description: 'Send an in-app notification',
        icon: Bell,
        defaultData: {},
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface NodePanelProps {
  workflowId: string;
  existingNodes?: WorkflowNodeRow[];
}

const TRIGGER_NODE_TYPES = new Set([
  NodeType.MANUAL_TRIGGER,
  NodeType.TRIGGER_THRESHOLD,
  NodeType.TRIGGER_VARIANCE,
]);

export function NodePanel({ workflowId, existingNodes = [] }: NodePanelProps) {
  const { isNodePanelOpen, setNodePanelOpen } = useWorkflowDialogStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    triggers: true,
    messages: true,
    recipients: true,
  });

  const addNodeMutation = useAddNode(workflowId);

  const { getNodes, screenToFlowPosition } = useReactFlow();

  function calculateNewNodePosition() {
    const flowContainer = document.querySelector('.react-flow');
    if (!flowContainer) return { x: 250, y: 250 };

    const { width, height, left, top } = flowContainer.getBoundingClientRect();
    const screenCenter = { x: left + width / 2, y: top + height / 2 };
    const basePosition = screenToFlowPosition(screenCenter);

    let candidateX = basePosition.x - 75;
    let candidateY = basePosition.y - 40;

    const existingNodes = getNodes();
    let hasOverlap = true;
    while (hasOverlap) {
      // eslint-disable-next-line no-loop-func
      hasOverlap = existingNodes.some(
        (node) =>
          Math.abs(node.position.x - candidateX) < 10 &&
          Math.abs(node.position.y - candidateY) < 10,
      );
      if (hasOverlap) {
        candidateX += 30;
        candidateY += 30;
      }
    }

    return { x: candidateX, y: candidateY };
  }

  function handleAddNode(entry: NodeCatalogEntry) {
    addNodeMutation.mutate(
      {
        workflowId,
        type: entry.type,
        name: entry.label,
        data: entry.defaultData,
        position: calculateNewNodePosition(),
      },
      { onSuccess: () => setNodePanelOpen(false) },
    );
  }

  function toggleSection(sectionId: string) {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  const hasTrigger = existingNodes.some((n) => TRIGGER_NODE_TYPES.has(n.type));

  const filteredSections = NODE_CATALOG_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (entry) =>
        entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <Sheet open={isNodePanelOpen} onOpenChange={setNodePanelOpen}>
      <SheetContent
        side="left"
        className="flex w-80 flex-col gap-0 p-0 sm:w-96"
      >
        <SheetHeader className="border-b border-border/50 px-5 pb-4 pt-5">
          <SheetTitle className="text-base">Add Node</SheetTitle>
          <SheetDescription className="text-xs">
            Select a node type to add to your workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border/50 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No nodes found</p>
              </div>
            ) : (
              filteredSections.map((section) => {
                const isOpen = openSections[section.id] ?? true;

                return (
                  <Collapsible
                    key={section.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/50">
                        <ChevronRight
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-90',
                          )}
                        />
                        <span className="text-sm font-medium">
                          {section.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({section.items.length})
                        </span>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="space-y-0.5 pb-1 pl-6 pr-2">
                        {section.items.map((entry) => {
                          const isTriggerEntry = TRIGGER_NODE_TYPES.has(
                            entry.type,
                          );
                          const isDisabled =
                            addNodeMutation.isPending ||
                            (isTriggerEntry && hasTrigger);

                          return (
                            <button
                              key={entry.type}
                              type="button"
                              className={cn(
                                'flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors',
                                'hover:bg-accent/50',
                                'disabled:cursor-not-allowed disabled:opacity-40',
                              )}
                              onClick={() => handleAddNode(entry)}
                              disabled={isDisabled}
                              title={
                                isTriggerEntry && hasTrigger
                                  ? 'A trigger node is already present in this workflow'
                                  : undefined
                              }
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                                <entry.icon className="size-4 text-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {entry.label}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {isTriggerEntry && hasTrigger
                                    ? 'Only one trigger allowed per workflow'
                                    : entry.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
