'use client';

import { useTRPC } from '@/lib/trpc/client';
import type { AlertEventStatus } from '@spexs/types';
import { SMALL_PAGE_SIZE } from '@spexs/types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ── Queries ────────────────────────────────────────────────────────────────────

export function useAlertEvents(params: {
  workflowId?: string;
  page: number;
  pageSize: number;
  status?: AlertEventStatus;
}) {
  const trpc = useTRPC();
  return useQuery(trpc.events.list.queryOptions(params));
}

export function useEventComments(eventId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.events.getComments.queryOptions({ eventId }));
}

export function useStepComments(nodeExecutionId: string) {
  const trpc = useTRPC();
  const queryOptions = trpc.executions.getComments.infiniteQueryOptions(
    { nodeExecutionId, limit: SMALL_PAGE_SIZE },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  return { ...useInfiniteQuery(queryOptions), queryOptions };
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useResolveAlertEvent(workflowId?: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.events.resolve.mutationOptions({
      onSuccess: () => {
        // Invalidate both scoped (per workflow) and global list
        void queryClient.invalidateQueries(trpc.events.list.queryFilter());
      },
    }),
  );
}

export function useSnoozeAlertEvent(workflowId?: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.events.snooze.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.events.list.queryFilter());
      },
    }),
  );
}

export function useAddStepComment(params: {
  nodeExecutionId: string;
  executionId: string;
  workflowId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.events.addStepComment.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.executions.getComments.queryFilter({
            nodeExecutionId: params.nodeExecutionId,
          }),
        );
        void queryClient.invalidateQueries(
          trpc.executions.getDetails.queryFilter({
            executionId: params.executionId,
          }),
        );
      },
    }),
  );
}
