'use client';

import { useTRPC } from '@/lib/trpc/client';
import { ExecutionStatus } from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Queries ────────────────────────────────────────────────────────────────────

export function useLastExecution(workflowId: string) {
  const trpc = useTRPC();
  return useQuery(
    trpc.executions.getLastExecution.queryOptions({ workflowId }),
  );
}

export function useExecutionDetails(executionId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.executions.getDetails.queryOptions({ executionId }));
}

/**
 * Polls execution progress while it is running.
 * Polling stops automatically when the execution leaves the RUNNING state.
 */
export function useExecutionProgress(
  executionId: string | null,
  enabled = true,
) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.executions.getProgress.queryOptions({
      executionId: executionId ?? '',
    }),
    enabled: !!executionId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.executionStatus;
      return status === ExecutionStatus.RUNNING ? 500 : false;
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useExecuteWorkflow(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.executions.execute.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.executions.getLastExecution.queryFilter({ workflowId }),
        );
      },
    }),
  );
}

export function useRetryExecution(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.executions.retry.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.executions.getLastExecution.queryFilter({ workflowId }),
        );
      },
    }),
  );
}
