import {
  createWorkflowSchema,
  deleteRecipientSchema,
  deleteWorkflowSchema,
  toggleActiveSchema,
  updateWorkflowCanvasSchema,
  updateWorkflowSchema,
  workflowListQuerySchema,
} from '@spexs/types';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { WorkflowsService } from './workflows.service';

/**
 * Builds the workflows tRPC sub-router.
 *
 * Kept as a plain function (not an Injectable) to avoid a circular dependency:
 * WorkflowsModule ← TrpcModule → WorkflowsModule. TrpcRouter calls this
 * function directly, passing its already-injected TrpcService and WorkflowsService.
 */
export function buildWorkflowsRouter(
  trpc: TrpcService,
  service: WorkflowsService,
) {
  return trpc.router({
    list: trpc.protectedProcedure
      .input(workflowListQuerySchema)
      .query(({ ctx, input }) =>
        service.listByUser(ctx.session.user.id, input),
      ),

    getById: trpc.protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => service.getById(input.id)),

    create: trpc.protectedProcedure
      .input(createWorkflowSchema)
      .mutation(({ input, ctx }) => service.create(input, ctx.session.user.id)),

    update: trpc.protectedProcedure
      .input(updateWorkflowSchema)
      .mutation(({ input, ctx }) => service.update(input, ctx.session.user.id)),

    updateCanvas: trpc.protectedProcedure
      .input(updateWorkflowCanvasSchema)
      .mutation(({ input, ctx }) =>
        service.updateCanvas(input, ctx.session.user.id),
      ),

    toggleActive: trpc.protectedProcedure
      .input(toggleActiveSchema)
      .mutation(({ input, ctx }) =>
        service.toggleActive(input.id, input.isActive, ctx.session.user.id),
      ),

    delete: trpc.protectedProcedure
      .input(deleteWorkflowSchema)
      .mutation(({ input, ctx }) =>
        service.delete(input.id, ctx.session.user.id),
      ),

    deleteRecipient: trpc.protectedProcedure
      .input(deleteRecipientSchema)
      .mutation(({ input, ctx }) =>
        service.deleteRecipient(
          input.workflowId,
          input.recipientId,
          ctx.session.user.id,
        ),
      ),
  });
}
