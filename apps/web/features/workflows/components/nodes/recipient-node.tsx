'use client';

import { BaseHandle } from '@/components/ui/react-flow/base-handle';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/ui/react-flow/base-node';
import { cn } from '@/lib/utils';
import { NotificationChannel } from '@spexs/types';
import { Position } from '@xyflow/react';
import { Bell, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkflowDialogStore } from '../../stores/dialog-store';
import type { RecipientNode as RecipientNodeType } from '../../types/canvas';

type Props = { data: RecipientNodeType['data'] };

type ChannelConfig = {
  label: string;
  Icon: LucideIcon;
  iconClass: string;
  titleClass: string;
};

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  [NotificationChannel.EMAIL]: {
    label: 'Email Notification',
    Icon: Mail,
    iconClass: 'bg-sky-500/10',
    titleClass: 'text-sky-600 dark:text-sky-400',
  },
  [NotificationChannel.IN_APP]: {
    label: 'In-App Notification',
    Icon: Bell,
    iconClass: 'bg-amber-500/10',
    titleClass: 'text-amber-600 dark:text-amber-400',
  },
};

const FALLBACK_CONFIG: ChannelConfig = {
  label: 'Notification',
  Icon: Bell,
  iconClass: 'bg-muted',
  titleClass: 'text-muted-foreground',
};

export function RecipientNode({ data }: Props) {
  const config = CHANNEL_CONFIG[data.channel] ?? FALLBACK_CONFIG;
  const openDialog = useWorkflowDialogStore((state) => state.openDialog);

  return (
    <BaseNode
      data-tour="workflow-recipient-node"
      className={cn(
        'w-80 cursor-pointer bg-card',
        'border border-border/50',
        '[box-shadow:0_0_0_1px_rgba(0,0,0,.02),0_1px_2px_rgba(0,0,0,.03)]',
        'dark:[box-shadow:0_-10px_40px_-10px_#ffffff08_inset] dark:[border:1px_solid_rgba(255,255,255,.08)]',
      )}
      onClick={() =>
        openDialog({
          type: 'edit-recipient',
          data: {
            workflowId: data.workflowId,
            recipientId: data.recipientId,
          },
        })
      }
    >
      <BaseHandle type="target" position={Position.Top} />

      <BaseNodeHeader>
        <div
          className={`flex size-5 items-center justify-center rounded ${config.iconClass}`}
        >
          <config.Icon className={`size-3 ${config.titleClass}`} />
        </div>
        <BaseNodeHeaderTitle
          className={`text-xs uppercase tracking-wider ${config.titleClass}`}
        >
          {config.label}
        </BaseNodeHeaderTitle>
      </BaseNodeHeader>

      <BaseNodeContent>
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Recipient
          </p>
          <p className="truncate font-mono text-sm">{data.recipient}</p>
        </div>
      </BaseNodeContent>
    </BaseNode>
  );
}
