import { Injectable } from '@nestjs/common';
import { events, DatabaseService, eventComments } from '@spexs/db';
import {
  type EventListQueryInput,
  EventStatus,
  type TriggerPayload,
  calculatePaginationMeta,
} from '@spexs/types';
import { and, desc, eq, sql } from 'drizzle-orm';

@Injectable()
export class EventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string) {
    const [event] = await this.database.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) return null;

    const comments = await this.database.db
      .select()
      .from(eventComments)
      .where(eq(eventComments.eventId, id))
      .orderBy(desc(eventComments.createdAt));

    return { ...event, comments };
  }

  async findByWorkflowId(workflowId: string, query: EventListQueryInput) {
    const offset = (query.page - 1) * query.pageSize;

    const conditions = [eq(events.workflowId, workflowId)];

    if (query.status) {
      conditions.push(eq(events.status, query.status));
    }

    const eventList = await this.database.db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.openedAt))
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database.db
      .select({ total: sql<number>`count(*)` })
      .from(events)
      .where(and(...conditions));

    const total = Number(totalResult?.total ?? 0);
    const meta = calculatePaginationMeta(query.page, query.pageSize, total);

    return { items: eventList, meta };
  }

  async findOpenEventByWorkflowId(workflowId: string) {
    const [event] = await this.database.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.workflowId, workflowId),
          eq(events.status, EventStatus.OPEN),
        ),
      )
      .limit(1);

    return event ?? null;
  }

  async create(eventData: {
    workflowId: string;
    triggerPayload: TriggerPayload;
    triggeredBy: string;
  }) {
    const [created] = await this.database.db
      .insert(events)
      .values({
        workflowId: eventData.workflowId,
        triggerPayload: eventData.triggerPayload,
        triggeredBy: eventData.triggeredBy,
        status: EventStatus.OPEN,
      })
      .returning();

    return created;
  }

  async updateStatus(
    id: string,
    data: { status: EventStatus; resolvedBy: string | null },
  ) {
    const [updated] = await this.database.db
      .update(events)
      .set({
        status: data.status,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.status === EventStatus.RESOLVED ? new Date() : null,
      })
      .where(eq(events.id, id))
      .returning();

    return updated ?? null;
  }

  async addComment(data: {
    eventId: string;
    authorId: string;
    comment: string;
  }) {
    const [created] = await this.database.db
      .insert(eventComments)
      .values({
        eventId: data.eventId,
        authorId: data.authorId,
        comment: data.comment,
      })
      .returning();

    return created;
  }

  async findCommentsByEventId(eventId: string) {
    return this.database.db
      .select()
      .from(eventComments)
      .where(eq(eventComments.eventId, eventId))
      .orderBy(desc(eventComments.createdAt));
  }
}
