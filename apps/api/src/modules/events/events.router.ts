import {
  addStepCommentSchema,
  getEventCommentsSchema,
  listAlertEventsSchema,
  resolveAlertEventSchema,
  snoozeAlertEventSchema,
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

    snooze: trpc.protectedProcedure
      .input(snoozeAlertEventSchema)
      .mutation(({ input }) => service.snooze(input)),

    getComments: trpc.protectedProcedure
      .input(getEventCommentsSchema)
      .query(({ input }) => service.getComments(input)),

    addStepComment: trpc.protectedProcedure
      .input(addStepCommentSchema)
      .mutation(({ input, ctx }) =>
        service.addStepComment(input, ctx.session.user.id),
      ),
  });
}
