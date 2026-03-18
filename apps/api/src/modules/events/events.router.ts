import {
  addStepCommentSchema,
  listAlertEventsSchema,
  resolveAlertEventSchema,
} from '@spexs/types';
import type { TrpcService } from '../trpc/trpc.service';
import type { EventsService } from './events.service';

export function buildEventsRouter(trpc: TrpcService, service: EventsService) {
  return trpc.router({
    list: trpc.protectedProcedure
      .input(listAlertEventsSchema)
      .query(({ input }) => service.list(input)),

    resolve: trpc.protectedProcedure
      .input(resolveAlertEventSchema)
      .mutation(({ input, ctx }) =>
        service.resolve(input, ctx.session.user.id),
      ),

    addStepComment: trpc.protectedProcedure
      .input(addStepCommentSchema)
      .mutation(({ input, ctx }) =>
        service.addStepComment(input, ctx.session.user.id),
      ),
  });
}
