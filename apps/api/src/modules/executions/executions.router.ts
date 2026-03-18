import { executeWorkflowSchema } from '@spexs/types';
import { z } from 'zod';
import type { TrpcService } from '../trpc/trpc.service';
import type { ExecutionsService } from './executions.service';

/**
 * Builds the executions tRPC sub-router.
 *
 * Kept as a plain function (not an Injectable) to avoid circular dependency:
 * ExecutionsModule ← TrpcModule → ExecutionsModule.
 */
export function buildExecutionsRouter(
  trpc: TrpcService,
  service: ExecutionsService,
) {
  return trpc.router({
    execute: trpc.protectedProcedure
      .input(executeWorkflowSchema)
      .mutation(({ input, ctx }) =>
        service.execute(
          input.workflowId,
          input.triggerData,
          ctx.session.user.id,
        ),
      ),

    getProgress: trpc.protectedProcedure
      .input(z.object({ executionId: z.string().min(1) }))
      .query(({ input }) => service.getProgress(input.executionId)),

    retry: trpc.protectedProcedure
      .input(z.object({ executionId: z.string().min(1) }))
      .mutation(({ input, ctx }) =>
        service.retryExecution(input.executionId, ctx.session.user.id),
      ),
  });
}
