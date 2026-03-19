import { Injectable } from '@nestjs/common';
import type { NewNotification } from '@spexs/db';
import type {
  CreateNotificationInput,
  ListNotificationsInput,
  MarkNotificationReadInput,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async create(input: CreateNotificationInput) {
    const data: NewNotification = {
      userId: input.userId,
      workflowId: input.workflowId ?? null,
      eventId: input.eventId ?? null,
      title: input.title,
      message: input.message,
    };

    return this.repository.create(data);
  }

  async list(input: ListNotificationsInput, userId: string) {
    const { page, pageSize, isRead } = input;

    const { items, total } = await this.repository.findByUserId(userId, {
      page,
      pageSize,
      isRead,
    });

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async countUnread(userId: string) {
    const count = await this.repository.countUnread(userId);
    return { count };
  }

  async markRead(input: MarkNotificationReadInput, userId: string) {
    const updated = await this.repository.markRead(
      input.notificationId,
      userId,
    );

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }

    return updated;
  }

  async markAllRead(userId: string) {
    await this.repository.markAllRead(userId);
    return { success: true };
  }
}
