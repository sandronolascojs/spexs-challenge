import { create } from 'zustand';

export type WorkflowDialogType =
  | 'edit-trigger'
  | 'edit-message'
  | 'edit-recipient'
  | 'delete-recipient'
  | 'run-trigger';

export interface WorkflowDialogData {
  'edit-trigger': {
    workflowId: string;
  };
  'edit-message': {
    workflowId: string;
  };
  'edit-recipient': {
    workflowId: string;
    recipientId: string;
  };
  'delete-recipient': {
    workflowId: string;
    recipientId: string;
  };
  'run-trigger': {
    workflowId: string;
  };
}

type WorkflowDialogPayload =
  | { type: 'edit-trigger'; data: WorkflowDialogData['edit-trigger'] }
  | { type: 'edit-message'; data: WorkflowDialogData['edit-message'] }
  | { type: 'edit-recipient'; data: WorkflowDialogData['edit-recipient'] }
  | { type: 'delete-recipient'; data: WorkflowDialogData['delete-recipient'] }
  | { type: 'run-trigger'; data: WorkflowDialogData['run-trigger'] };

interface WorkflowDialogState {
  // Modal dialogs
  dialog: WorkflowDialogPayload | null;
  isOpen: boolean;
  openDialog: (dialog: WorkflowDialogPayload) => void;
  closeDialog: () => void;

  // Node Panel Sheet
  isNodePanelOpen: boolean;
  setNodePanelOpen: (isOpen: boolean) => void;
}

export const useWorkflowDialogStore = create<WorkflowDialogState>((set) => ({
  dialog: null,
  isOpen: false,
  openDialog: (dialog) => set({ dialog, isOpen: true }),
  closeDialog: () => set({ dialog: null, isOpen: false }),

  isNodePanelOpen: false,
  setNodePanelOpen: (isOpen) => set({ isNodePanelOpen: isOpen }),
}));
