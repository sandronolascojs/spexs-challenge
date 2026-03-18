import { Injectable } from '@nestjs/common';
import { DatabaseService, alertEvents, eventComments } from '@spexs/db';
import { AlertEventStatus } from '@spexs/types';
import { type SQL, and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

@Injectable()
export class EventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findEvents(
    pageSize: number,
    offset: number,
    workflowId?: string,
    status?: AlertEventStatus,
  ) {
    const conditions: SQL[] = [];
    if (workflowId) {
      conditions.push(eq(alertEvents.workflowId, workflowId));
    }
    if (status) {
      conditions.push(eq(alertEvents.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.database.db
      .select()
      .from(alertEvents)
      .where(whereClause)
      .orderBy(desc(alertEvents.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [totalResult] = await this.database.db
      .select({ total: sql<number>`count(*)` })
      .from(alertEvents)
      .where(whereClause);

    const total = Number(totalResult?.total ?? 0);

    return { items, total };
  }

  async resolveEvent(eventId: string) {
    const [updated] = await this.database.db
      .update(alertEvents)
      .set({
        status: AlertEventStatus.RESOLVED,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(alertEvents.id, eventId),
          eq(alertEvents.status, AlertEventStatus.OPEN),
        ),
      )
      .returning();

    return updated;
  }

  async createEventComment(eventId: string, userId: string, comment: string) {
    await this.database.db.insert(eventComments).values({
      eventId,
      userId,
      content: comment,
    });
  }
}
