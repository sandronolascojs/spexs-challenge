'use client';

import { Button } from '@/components/ui/button';
import { BaseHandle } from '@/components/ui/react-flow/base-handle';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/ui/react-flow/base-node';
import { NodeStatusIndicator } from '@/components/ui/react-flow/node-status-indicator';
import { cn } from '@/lib/utils';
import { Position } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { mapExecutionStatusToIndicator } from '../../lib/node-status';
import { useWorkflowDialogStore } from '../../stores/dialog-store';
import type { WorkflowNodeData } from '../../types/canvas';

type Props = { data: WorkflowNodeData };

// Matches {{variable}} tokens inside the message template
const VARIABLE_PATTERN = /(\\{\\{[^}]+\\}\\})/g;

function renderTemplate(template: string): ReactNode[] {
  const segments = template.split(VARIABLE_PATTERN);
  const renderedSegments: ReactNode[] = [];
  let segmentOffset = 0;

  for (const segment of segments) {
    const segmentKey = `${segment}-${segmentOffset}`;

    if (/^\\{\\{[^}]+\\}\\}$/.test(segment)) {
      renderedSegments.push(
        <code
          key={segmentKey}
          className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[11px] font-semibold text-primary"
        >
          {segment}
        </code>,
      );
    } else {
      renderedSegments.push(<span key={segmentKey}>{segment}</span>);
    }
    segmentOffset += segment.length;
  }

  return renderedSegments;
}

export function MessageNode({ data }: Props) {
  const template = (data.nodeData.template as string) ?? '';
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);

  const { openDialog } = useWorkflowDialogStore();
  const { deleteElements } = useReactFlow();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode
        data-tour="workflow-message-node"
        className={cn(
          'w-80 bg-card',
          'border border-border/50',
          '[box-shadow:0_0_0_1px_rgba(0,0,0,.02),0_1px_2px_rgba(0,0,0,.03)]',
          'dark:[box-shadow:0_-10px_40px_-10px_#ffffff08_inset] dark:[border:1px_solid_rgba(255,255,255,.08)]',
        )}
      >
        <BaseHandle type="target" position={Position.Top} />

        <BaseNodeHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-emerald-500/10">
              <MessageSquare className="size-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <BaseNodeHeaderTitle className="text-xs uppercase tracking-wider">
              {data.label}
            </BaseNodeHeaderTitle>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={() =>
                openDialog({
                  type: 'edit-message',
                  data: { workflowId: data.workflowId },
                })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => deleteElements({ nodes: [{ id: data.nodeId }] })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Template
            </p>
            <p className="text-sm leading-relaxed">
              {template ? (
                renderTemplate(template)
              ) : (
                <span className="text-muted-foreground">No template set</span>
              )}
            </p>
          </div>
        </BaseNodeContent>

        <BaseHandle type="source" position={Position.Bottom} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
