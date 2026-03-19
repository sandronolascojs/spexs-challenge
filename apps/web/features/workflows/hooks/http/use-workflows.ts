'use client';

import { useTRPC } from '@/lib/trpc/client';
import type {
  AddConnectionInput,
  AddNodeInput,
  RemoveConnectionInput,
  RemoveNodeInput,
  ToggleActiveInput,
  UpdateNodeDataInput,
  UpdateNodePositionInput,
  UpdateWorkflowInput,
  WorkflowListQueryInput,
} from '@spexs/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';

// ── Queries ────────────────────────────────────────────────────────────────────

export function useWorkflowList(params: WorkflowListQueryInput) {
  const trpc = useTRPC();
  return useQuery(trpc.workflows.list.queryOptions(params));
}

export function useWorkflow(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.workflows.getById.queryOptions({ id }));
}

export function useWorkflowSuspense(id: string) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workflows.getById.queryOptions({ id }));
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useCreateWorkflow() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(trpc.workflows.list.queryFilter()),
    }),
  );
}

export function useUpdateWorkflow(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        void queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
      },
    }),
  );
}

export function useToggleWorkflowActive(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.toggleActive.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        );
        void queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
      },
    }),
  );
}

export function useDeleteWorkflow() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.delete.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(trpc.workflows.list.queryFilter()),
    }),
  );
}

export function useAddNode(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.addNode.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

export function useRemoveNode(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.removeNode.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

export function useUpdateNodeData(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.updateNodeData.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

export function useUpdateNodePosition(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.updateNodePosition.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

export function useAddConnection(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.addConnection.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

export function useRemoveConnection(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.removeConnection.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflowId }),
        ),
    }),
  );
}

// Explicit re-exports of input types used by callers
export type {
  AddConnectionInput,
  AddNodeInput,
  RemoveConnectionInput,
  RemoveNodeInput,
  ToggleActiveInput,
  UpdateNodeDataInput,
  UpdateNodePositionInput,
  UpdateWorkflowInput,
  WorkflowListQueryInput,
};
