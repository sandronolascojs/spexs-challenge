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
import { NodeType } from '@spexs/types';
import { Position, useReactFlow } from '@xyflow/react';
import { Bell, Mail, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { mapExecutionStatusToIndicator } from '../../../lib/node-status';
import { useWorkflowDialogStore } from '../../../stores/dialog-store';
import type { WorkflowNodeData } from '../../../types/canvas';
import { NODE_CARD_CLASS } from '../shared/node-card-styles';
import {
  parseRecipientEmailData,
  parseRecipientInAppData,
} from '../shared/parse-node-data';

// ── Channel visual configuration ──────────────────────────────────────────────

interface ChannelVisualConfig {
  label: string;
  Icon: LucideIcon;
  iconClass: string;
  titleClass: string;
}

const CHANNEL_CONFIG: Record<string, ChannelVisualConfig> = {
  [NodeType.RECIPIENT_EMAIL]: {
    label: 'Email Notification',
    Icon: Mail,
    iconClass: 'bg-sky-500/10',
    titleClass: 'text-sky-600 dark:text-sky-400',
  },
  [NodeType.RECIPIENT_IN_APP]: {
    label: 'In-App Notification',
    Icon: Bell,
    iconClass: 'bg-amber-500/10',
    titleClass: 'text-amber-600 dark:text-amber-400',
  },
};

const FALLBACK_CHANNEL_CONFIG: ChannelVisualConfig = {
  label: 'Notification',
  Icon: Bell,
  iconClass: 'bg-muted',
  titleClass: 'text-muted-foreground',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface RecipientNodeProps {
  data: WorkflowNodeData;
}

function getRecipientDescription(data: WorkflowNodeData): string {
  const isEmail = data.nodeType === NodeType.RECIPIENT_EMAIL;

  if (isEmail) {
    const parsed = parseRecipientEmailData(data.nodeData);
    if (!parsed?.emails.length) return '\u2014';
    if (parsed.emails.length === 1) return parsed.emails[0];
    return `${parsed.emails[0]} +${parsed.emails.length - 1}`;
  }

  const parsed = parseRecipientInAppData(data.nodeData);
  return parsed?.userId ?? 'Current user';
}

export function RecipientNode({ data }: RecipientNodeProps) {
  const config = CHANNEL_CONFIG[data.nodeType] ?? FALLBACK_CHANNEL_CONFIG;
  const isEmail = data.nodeType === NodeType.RECIPIENT_EMAIL;
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);
  const description = getRecipientDescription(data);

  const { openDialog } = useWorkflowDialogStore();
  const { deleteElements } = useReactFlow();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode data-tour="workflow-recipient-node" className={NODE_CARD_CLASS}>
        <BaseHandle type="target" position={Position.Top} />

        <BaseNodeHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex size-5 items-center justify-center rounded ${config.iconClass}`}
            >
              <config.Icon className={`size-3 ${config.titleClass}`} />
            </div>
            <BaseNodeHeaderTitle
              className={`text-xs uppercase tracking-wider ${config.titleClass}`}
            >
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
                  type: 'edit-recipient',
                  data: {
                    workflowId: data.workflowId,
                    recipientId: data.nodeId,
                  },
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
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isEmail ? 'Email' : 'User'}
            </p>
            <p className="truncate font-mono text-sm">{description}</p>
          </div>
        </BaseNodeContent>
      </BaseNode>
    </NodeStatusIndicator>
  );
}
