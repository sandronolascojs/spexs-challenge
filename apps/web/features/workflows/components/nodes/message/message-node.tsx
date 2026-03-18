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
import { Position, useReactFlow } from '@xyflow/react';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { mapExecutionStatusToIndicator } from '../../../lib/node-status';
import { useWorkflowDialogStore } from '../../../stores/dialog-store';
import type { WorkflowNodeData } from '../../../types/canvas';
import { NODE_CARD_CLASS } from '../shared/node-card-styles';
import { parseOutputMessageData } from '../shared/parse-node-data';
import { VARIABLE_TOKEN_PATTERN } from '../shared/variable-token-pattern';

interface MessageNodeProps {
  data: WorkflowNodeData;
}

/**
 * Splits a template by `{{variable}}` tokens and renders them
 * as highlighted `<code>` elements.
 */
function renderTemplate(template: string): ReactNode[] {
  const segments = template.split(VARIABLE_TOKEN_PATTERN);
  const rendered: ReactNode[] = [];
  let charOffset = 0;

  for (const segment of segments) {
    const segmentKey = `seg-${charOffset}`;
    charOffset += segment.length;

    VARIABLE_TOKEN_PATTERN.lastIndex = 0;
    if (VARIABLE_TOKEN_PATTERN.test(segment)) {
      rendered.push(
        <code
          key={segmentKey}
          className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[11px] font-semibold text-primary"
        >
          {segment}
        </code>,
      );
    } else {
      rendered.push(<span key={segmentKey}>{segment}</span>);
    }
  }

  return rendered;
}

export function MessageNode({ data }: MessageNodeProps) {
  const parsed = parseOutputMessageData(data.nodeData);
  const template = parsed?.template ?? '';
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);

  const { openDialog } = useWorkflowDialogStore();
  const { deleteElements } = useReactFlow();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode data-tour="workflow-message-node" className={NODE_CARD_CLASS}>
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
