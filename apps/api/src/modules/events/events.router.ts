import {
  type EventListQueryInput,
  addCommentSchema,
  eventListQuerySchema,
  resolveEventSchema,
  triggerThresholdEventSchema,
  triggerVarianceEventSchema,
} from '@spexs/types';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { EventsService } from './events.service';

export function buildEventsRouter(trpc: TrpcService, service: EventsService) {
  return trpc.router({
    getById: trpc.protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => service.getById(input.id)),

    listByWorkflow: trpc.protectedProcedure
      .input(
        z.object({
          workflowId: z.string().min(1),
          query: eventListQuerySchema,
        }),
      )
      .query(({ input }) =>
        service.listByWorkflow(input.workflowId, input.query),
      ),

    triggerThreshold: trpc.protectedProcedure
      .input(triggerThresholdEventSchema)
      .mutation(({ input, ctx }) =>
        service.trigger(input.workflowId, input.payload, ctx.session.user.id),
      ),

    triggerVariance: trpc.protectedProcedure
      .input(triggerVarianceEventSchema)
      .mutation(({ input, ctx }) =>
        service.trigger(input.workflowId, input.payload, ctx.session.user.id),
      ),

    resolve: trpc.protectedProcedure
      .input(resolveEventSchema)
      .mutation(({ input, ctx }) =>
        service.resolve(input.eventId, ctx.session.user.id, input.comment),
      ),

    addComment: trpc.protectedProcedure
      .input(addCommentSchema)
      .mutation(({ input, ctx }) =>
        service.addComment(input.eventId, ctx.session.user.id, input.comment),
      ),
  });
}
