import {
  executeWorkflowSchema,
  getExecutionDetailsSchema,
  getLastExecutionSchema,
  getStepCommentsSchema,
} from '@spexs/types';
import type { TrpcService } from '../trpc/trpc.service';
import type { ExecutionsService } from './executions.service';

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
      .input(getExecutionDetailsSchema)
      .query(({ input }) => service.getProgress(input.executionId)),

    getLastExecution: trpc.protectedProcedure
      .input(getLastExecutionSchema)
      .query(({ input }) => service.getLastExecutionStatus(input.workflowId)),

    getDetails: trpc.protectedProcedure
      .input(getExecutionDetailsSchema)
      .query(({ input }) => service.getExecutionDetails(input.executionId)),

    retry: trpc.protectedProcedure
      .input(getExecutionDetailsSchema)
      .mutation(({ input, ctx }) =>
        service.retryExecution(input.executionId, ctx.session.user.id),
      ),

    getComments: trpc.protectedProcedure
      .input(getStepCommentsSchema)
      .query(({ input }) => service.getStepComments(input)),
  });
}
