'use client';

import { useTRPC } from '@/lib/trpc/client';
import { SMALL_PAGE_SIZE } from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const UNREAD_REFETCH_INTERVAL_MS = 30_000;

export function useUnreadNotificationCount() {
  const trpc = useTRPC();
  return useQuery(
    trpc.notifications.unreadCount.queryOptions(undefined, {
      refetchInterval: UNREAD_REFETCH_INTERVAL_MS,
    }),
  );
}

export function useNotifications(params?: { isRead?: boolean }) {
  const trpc = useTRPC();
  return useQuery(
    trpc.notifications.list.queryOptions({
      page: 1,
      pageSize: SMALL_PAGE_SIZE,
      isRead: params?.isRead,
    }),
  );
}

export function useMarkNotificationRead() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.notifications.markRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.notifications.list.queryFilter(),
        );
        void queryClient.invalidateQueries(
          trpc.notifications.unreadCount.queryFilter(),
        );
      },
    }),
  );
}

export function useMarkAllNotificationsRead() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.notifications.list.queryFilter(),
        );
        void queryClient.invalidateQueries(
          trpc.notifications.unreadCount.queryFilter(),
        );
      },
    }),
  );
}
