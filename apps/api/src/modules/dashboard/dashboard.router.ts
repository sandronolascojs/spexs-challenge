import type { TrpcService } from '../trpc/trpc.service';
import type { DashboardService } from './dashboard.service';

export function buildDashboardRouter(
  trpc: TrpcService,
  service: DashboardService,
) {
  return trpc.router({
    stats: trpc.protectedProcedure.query(({ ctx }) =>
      service.getStats(ctx.session.user.id),
    ),
  });
}
