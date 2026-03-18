'use client';

import { useWorkflowDialogStore } from '../../stores/dialog-store';
import { MessageEditDialog } from './message/message-edit-dialog';
import { RecipientEditDialog } from './recipient/recipient-edit-dialog';
import { TriggerEditDialog } from './trigger/trigger-edit-dialog';

export function WorkflowDialogs() {
  const { dialog, isOpen, closeDialog } = useWorkflowDialogStore();

  if (!dialog || !isOpen) return null;

  switch (dialog.type) {
    case 'edit-trigger':
      return (
        <TriggerEditDialog
          workflowId={dialog.data.workflowId}
          onClose={closeDialog}
        />
      );
    case 'edit-message':
      return (
        <MessageEditDialog
          workflowId={dialog.data.workflowId}
          onClose={closeDialog}
        />
      );
    case 'edit-recipient':
      return (
        <RecipientEditDialog
          workflowId={dialog.data.workflowId}
          recipientId={dialog.data.recipientId}
          onClose={closeDialog}
        />
      );
    default:
      return null;
  }
}
