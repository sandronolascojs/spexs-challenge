import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type NewNotification,
  notifications,
  users,
} from '@spexs/db';
import type { ListNotificationsInput } from '@spexs/types';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(data: NewNotification) {
    const [created] = await this.database.db
      .insert(notifications)
      .values(data)
      .returning();

    return created;
  }

  async findByUserId(
    userId: string,
    input: Pick<ListNotificationsInput, 'page' | 'pageSize' | 'isRead'>,
  ) {
    const conditions = [eq(notifications.userId, userId)];

    if (input.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, input.isRead));
    }

    const whereClause = and(...conditions);
    const offset = (input.page - 1) * input.pageSize;

    const [items, [totalResult]] = await Promise.all([
      this.database.db
        .select({
          id: notifications.id,
          title: notifications.title,
          message: notifications.message,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          workflowId: notifications.workflowId,
          eventId: notifications.eventId,
        })
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(input.pageSize)
        .offset(offset),
      this.database.db
        .select({ total: sql<number>`count(*)` })
        .from(notifications)
        .where(whereClause),
    ]);

    return { items, total: Number(totalResult?.total ?? 0) };
  }

  async countUnread(userId: string) {
    const [result] = await this.database.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );

    return result?.total ?? 0;
  }

  async markRead(notificationId: string, userId: string) {
    const [updated] = await this.database.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  async markAllRead(userId: string) {
    await this.database.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
  }
}
