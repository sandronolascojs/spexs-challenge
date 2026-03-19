import {
  addConnectionSchema,
  addNodeSchema,
  createWorkflowSchema,
  deleteWorkflowSchema,
  removeConnectionSchema,
  removeNodeSchema,
  toggleActiveSchema,
  updateNodeDataSchema,
  updateNodePositionSchema,
  updateWorkflowSchema,
  workflowListQuerySchema,
} from '@spexs/types';
import { z } from 'zod';
import type { TrpcService } from '../trpc/trpc.service';
import type { WorkflowsService } from './workflows.service';

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
    // ── Workflow CRUD ────────────────────────────────────────────────────
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
      .mutation(({ input, ctx }) =>
        service.create(input.name, input.template, ctx.session.user.id),
      ),

    update: trpc.protectedProcedure
      .input(updateWorkflowSchema)
      .mutation(({ input, ctx }) =>
        service.update(input.id, input.name, ctx.session.user.id),
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

    // ── Node CRUD ───────────────────────────────────────────────────────
    addNode: trpc.protectedProcedure
      .input(addNodeSchema)
      .mutation(({ input, ctx }) =>
        service.addNode(
          input.workflowId,
          {
            type: input.type,
            name: input.name,
            data: input.data,
            position: input.position,
          },
          ctx.session.user.id,
        ),
      ),

    removeNode: trpc.protectedProcedure
      .input(removeNodeSchema)
      .mutation(({ input, ctx }) =>
        service.removeNode(input.nodeId, ctx.session.user.id),
      ),

    updateNodeData: trpc.protectedProcedure
      .input(updateNodeDataSchema)
      .mutation(({ input, ctx }) =>
        service.updateNodeData(input.nodeId, input.data, ctx.session.user.id),
      ),

    updateNodePosition: trpc.protectedProcedure
      .input(updateNodePositionSchema)
      .mutation(({ input, ctx }) =>
        service.updateNodePosition(
          input.nodeId,
          input.position,
          ctx.session.user.id,
        ),
      ),

    // ── Connection CRUD ─────────────────────────────────────────────────
    addConnection: trpc.protectedProcedure
      .input(addConnectionSchema)
      .mutation(({ input, ctx }) =>
        service.addConnection(input, ctx.session.user.id),
      ),

    removeConnection: trpc.protectedProcedure
      .input(removeConnectionSchema)
      .mutation(({ input, ctx }) =>
        service.removeConnection(input.connectionId, ctx.session.user.id),
      ),
  });
}
