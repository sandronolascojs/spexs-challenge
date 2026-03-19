'use client';

import { useTRPC } from '@/lib/trpc/client';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

export function useDashboardStatsSuspense() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.dashboard.stats.queryOptions());
}

export function useDashboardStats() {
  const trpc = useTRPC();
  return useQuery(trpc.dashboard.stats.queryOptions());
}
