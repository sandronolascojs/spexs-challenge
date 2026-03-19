'use client';

import { useSession } from '@/lib/auth/auth-client';
import { useTRPC } from '@/lib/trpc/client';
import type { AlertEventStatus } from '@spexs/types';
import { SMALL_PAGE_SIZE } from '@spexs/types';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepComment {
  id: string;
  nodeExecutionId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  content: string;
  createdAt: Date;
}

interface StepCommentsPage {
  items: StepComment[];
  nextCursor: string | null;
}

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
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Must match the exact key used by useStepComments
  const infiniteFilter = trpc.executions.getComments.infiniteQueryFilter({
    nodeExecutionId: params.nodeExecutionId,
    limit: SMALL_PAGE_SIZE,
  });

  return useMutation(
    trpc.events.addStepComment.mutationOptions({
      onMutate: async ({ content }) => {
        // Cancel any in-flight refetch so it doesn't overwrite the optimistic insert
        await queryClient.cancelQueries(infiniteFilter);

        // Snapshot for rollback on error
        const previousData = queryClient.getQueryData<
          InfiniteData<StepCommentsPage, string | null>
        >(infiniteFilter.queryKey);

        // Build the optimistic comment
        const optimisticComment: StepComment = {
          id: `optimistic-${Date.now()}`,
          nodeExecutionId: params.nodeExecutionId,
          userId: session?.user.id ?? '',
          userName: session?.user.name ?? 'You',
          userImage: session?.user.image ?? null,
          content,
          createdAt: new Date(),
        };

        // Prepend to the first page so it appears immediately at the top
        queryClient.setQueryData<InfiniteData<StepCommentsPage, string | null>>(
          infiniteFilter.queryKey,
          (old) => {
            if (!old) return old;
            const [firstPage, ...rest] = old.pages;
            if (!firstPage) return old;
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  items: [optimisticComment, ...firstPage.items],
                },
                ...rest,
              ],
            };
          },
        );

        return { previousData };
      },

      onError: (_err, _vars, context) => {
        // Roll back the optimistic insert
        if (context?.previousData !== undefined) {
          queryClient.setQueryData(
            infiniteFilter.queryKey,
            context.previousData,
          );
        }
      },

      onSuccess: () => {
        // Replace the optimistic entry with the real server data
        void queryClient.invalidateQueries(infiniteFilter);
        // Also refresh execution details (comment count badge, etc.)
        void queryClient.invalidateQueries(
          trpc.executions.getDetails.queryFilter({
            executionId: params.executionId,
          }),
        );
      },
    }),
  );
}
