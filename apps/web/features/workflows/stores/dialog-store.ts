import { useSyncExternalStore } from 'react';

export type WorkflowDialogType =
  | 'edit-trigger'
  | 'edit-message'
  | 'edit-recipient'
  | 'delete-recipient';

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
}

type WorkflowDialogPayload =
  | { type: 'edit-trigger'; data: WorkflowDialogData['edit-trigger'] }
  | { type: 'edit-message'; data: WorkflowDialogData['edit-message'] }
  | { type: 'edit-recipient'; data: WorkflowDialogData['edit-recipient'] }
  | { type: 'delete-recipient'; data: WorkflowDialogData['delete-recipient'] };

interface WorkflowDialogState {
  dialog: WorkflowDialogPayload | null;
  isOpen: boolean;
  openDialog: (dialog: WorkflowDialogPayload) => void;
  closeDialog: () => void;
}

type Listener = () => void;

const listeners = new Set<Listener>();

const storeState: WorkflowDialogState = {
  dialog: null,
  isOpen: false,
  openDialog: (dialog) => {
    storeState.dialog = dialog;
    storeState.isOpen = true;
    emitChanges();
  },
  closeDialog: () => {
    storeState.dialog = null;
    storeState.isOpen = false;
    emitChanges();
  },
};

function emitChanges() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): WorkflowDialogState {
  return storeState;
}

export function useWorkflowDialogStore(): WorkflowDialogState;
export function useWorkflowDialogStore<T>(
  selector: (state: WorkflowDialogState) => T,
): T;
export function useWorkflowDialogStore<T>(
  selector?: (state: WorkflowDialogState) => T,
): T | WorkflowDialogState {
  const getSelectedSnapshot = () => {
    const snapshot = getSnapshot();

    if (!selector) {
      return snapshot as T;
    }

    return selector(snapshot);
  };

  return useSyncExternalStore(
    subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
}
