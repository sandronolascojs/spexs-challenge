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
import { Bell, Mail, Pencil, Trash2, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { mapExecutionStatusToIndicator } from '../../../lib/node-status';
import { useWorkflowDialogStore } from '../../../stores/dialog-store';
import type { WorkflowNodeData } from '../../../types/canvas';
import { NODE_CARD_CLASS } from '../shared/node-card-styles';
import {
  parseRecipientEmailData,
  parseRecipientInAppData,
} from '../shared/parse-node-data';

// ── Channel config (icon + subtitle only — no custom colors) ──────────────────

interface ChannelConfig {
  Icon: LucideIcon;
  subtitle: string;
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  [NodeType.RECIPIENT_EMAIL]: {
    Icon: Mail,
    subtitle: 'Email notification',
  },
  [NodeType.RECIPIENT_IN_APP]: {
    Icon: Bell,
    subtitle: 'In-app notification',
  },
};

const FALLBACK_CHANNEL_CONFIG: ChannelConfig = {
  Icon: Bell,
  subtitle: 'Notification',
};

// ── Sub-content per channel ───────────────────────────────────────────────────

function EmailRecipientContent({ data }: { data: WorkflowNodeData }) {
  const parsed = parseRecipientEmailData(data.nodeData);
  const emails = parsed?.emails ?? [];

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {emails.length > 1 ? `Recipients (${emails.length})` : 'Recipient'}
      </p>
      {emails.length === 0 ? (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <span className="text-xs italic text-muted-foreground">
            No recipients set
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5"
            >
              <Mail className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-xs">{email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InAppRecipientContent({ data }: { data: WorkflowNodeData }) {
  const parsed = parseRecipientInAppData(data.nodeData);
  const userId = parsed?.userId;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        User
      </p>
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
        <User className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs">
          {userId ?? 'Current user'}
        </span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RecipientNodeProps {
  data: WorkflowNodeData;
}

export function RecipientNode({ data }: RecipientNodeProps) {
  const config = CHANNEL_CONFIG[data.nodeType] ?? FALLBACK_CHANNEL_CONFIG;
  const isEmail = data.nodeType === NodeType.RECIPIENT_EMAIL;
  const statusProp = mapExecutionStatusToIndicator(data.executionStatus);

  const { openDialog } = useWorkflowDialogStore();
  const { deleteElements } = useReactFlow();

  return (
    <NodeStatusIndicator status={statusProp}>
      <BaseNode data-tour="workflow-recipient-node" className={NODE_CARD_CLASS}>
        <BaseHandle type="target" position={Position.Top} />

        <BaseNodeHeader className="gap-2.5 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            <config.Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <BaseNodeHeaderTitle className="truncate text-sm font-semibold">
              {data.label}
            </BaseNodeHeaderTitle>
            <p className="text-[10px] text-muted-foreground">
              {config.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
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
              className="size-7 text-muted-foreground hover:text-destructive hover:bg-muted"
              onClick={() => deleteElements({ nodes: [{ id: data.nodeId }] })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </BaseNodeHeader>

        <BaseNodeContent className="pt-1">
          {isEmail ? (
            <EmailRecipientContent data={data} />
          ) : (
            <InAppRecipientContent data={data} />
          )}
        </BaseNodeContent>
      </BaseNode>
    </NodeStatusIndicator>
  );
}
