import {
  listNotificationsSchema,
  markNotificationReadSchema,
} from '@spexs/types';
import type { TrpcService } from '../trpc/trpc.service';
import type { NotificationsService } from './notifications.service';

export function buildNotificationsRouter(
  trpc: TrpcService,
  service: NotificationsService,
) {
  return trpc.router({
    list: trpc.protectedProcedure
      .input(listNotificationsSchema)
      .query(({ input, ctx }) => service.list(input, ctx.session.user.id)),

    unreadCount: trpc.protectedProcedure.query(({ ctx }) =>
      service.countUnread(ctx.session.user.id),
    ),

    markRead: trpc.protectedProcedure
      .input(markNotificationReadSchema)
      .mutation(({ input, ctx }) =>
        service.markRead(input, ctx.session.user.id),
      ),

    markAllRead: trpc.protectedProcedure.mutation(({ ctx }) =>
      service.markAllRead(ctx.session.user.id),
    ),
  });
}
