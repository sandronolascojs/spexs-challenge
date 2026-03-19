import { create } from 'zustand';

interface ExecutionState {
  activeExecutionId: string | null;
  setActiveExecutionId: (id: string | null) => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  activeExecutionId: null,
  setActiveExecutionId: (id) => set({ activeExecutionId: id }),
}));
