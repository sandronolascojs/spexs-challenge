'use client';

import { BaseHandle } from '@/components/ui/react-flow/base-handle';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/ui/react-flow/base-node';
import { cn } from '@/lib/utils';
import { Position } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWorkflowDialogStore } from '../../stores/dialog-store';
import type { MessageNode as MessageNodeType } from '../../types/canvas';

type Props = { data: MessageNodeType['data'] };

// Matches {{variable}} tokens inside the message template
const VARIABLE_PATTERN = /(\{\{[^}]+\}\})/g;

function renderTemplate(template: string): ReactNode[] {
  // Split preserves the captured groups so we can identify tokens
  const segments = template.split(VARIABLE_PATTERN);
  const renderedSegments: ReactNode[] = [];
  let segmentOffset = 0;

  for (const segment of segments) {
    const segmentKey = `${segment}-${segmentOffset}`;

    if (/^\{\{[^}]+\}\}$/.test(segment)) {
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
  const openDialog = useWorkflowDialogStore((state) => state.openDialog);

  return (
    <BaseNode
      data-tour="workflow-message-node"
      className={cn(
        'w-80 cursor-pointer bg-card',
        'border border-border/50',
        '[box-shadow:0_0_0_1px_rgba(0,0,0,.02),0_1px_2px_rgba(0,0,0,.03)]',
        'dark:[box-shadow:0_-10px_40px_-10px_#ffffff08_inset] dark:[border:1px_solid_rgba(255,255,255,.08)]',
      )}
      onClick={() =>
        openDialog({
          type: 'edit-message',
          data: { workflowId: data.workflowId },
        })
      }
    >
      <BaseHandle type="target" position={Position.Top} />

      <BaseNodeHeader>
        <div className="flex size-5 items-center justify-center rounded bg-emerald-500/10">
          <MessageSquare className="size-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <BaseNodeHeaderTitle className="text-xs uppercase tracking-wider">
          Output Message
        </BaseNodeHeaderTitle>
      </BaseNodeHeader>

      <BaseNodeContent>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Template
          </p>
          <p className="text-sm leading-relaxed">
            {renderTemplate(data.messageTemplate)}
          </p>
        </div>
      </BaseNodeContent>

      <BaseHandle type="source" position={Position.Bottom} />
    </BaseNode>
  );
}
