'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Panel } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useState } from 'react';
import type { WorkflowWithRecipients } from '../types/canvas';
import { TriggerDialog } from './trigger-dialog';

interface TriggerWorkflowButtonProps {
  workflow: WorkflowWithRecipients;
}

export function TriggerWorkflowButton({
  workflow,
}: TriggerWorkflowButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isInactive = !workflow.isActive;

  return (
    <>
      <Panel position="bottom-right" className="!m-4">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className={cn(isInactive && 'pointer-events-none opacity-50')}
              disabled={isInactive}
              onClick={() => setIsDialogOpen(true)}
            >
              <Play className="size-4" />
              Trigger
            </Button>
          </TooltipTrigger>
          {isInactive && (
            <TooltipContent side="top">
              <p className="text-xs">
                Activate the workflow before triggering events.
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </Panel>

      <TriggerDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workflow={workflow}
      />
    </>
  );
}
