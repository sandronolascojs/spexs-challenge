import { Injectable } from '@nestjs/common';
import { DatabaseService, alertEvents, eventComments, users } from '@spexs/db';
import {
  AlertEventStatus,
  EVENT_SORT_FIELDS,
  SORT_DIRECTIONS,
} from '@spexs/types';
import type { SortDirection } from '@spexs/types';
import {
  type Column,
  type SQL,
  and,
  asc,
  desc,
  eq,
  inArray,
  lte,
} from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const EVENT_COLUMN_MAP: Record<string, Column> = {
  [EVENT_SORT_FIELDS.OPENED_AT]: alertEvents.createdAt,
  [EVENT_SORT_FIELDS.RESOLVED_AT]: alertEvents.resolvedAt,
  [EVENT_SORT_FIELDS.STATUS]: alertEvents.status,
};

function buildEventOrderBy(sortBy?: string, sortDirection?: SortDirection) {
  const column = sortBy
    ? (EVENT_COLUMN_MAP[sortBy] ?? alertEvents.createdAt)
    : alertEvents.createdAt;
  return sortDirection === SORT_DIRECTIONS.ASC ? asc(column) : desc(column);
}

@Injectable()
export class EventsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findEvents(
    pageSize: number,
    offset: number,
    workflowId?: string,
    status?: AlertEventStatus,
    sortBy?: string,
    sortDirection?: SortDirection,
  ) {
    const conditions: SQL[] = [];
    if (workflowId) {
      conditions.push(eq(alertEvents.workflowId, workflowId));
    }
    if (status) {
      conditions.push(eq(alertEvents.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy = buildEventOrderBy(sortBy, sortDirection);

    const [items, [totalResult]] = await Promise.all([
      this.database.db
        .select()
        .from(alertEvents)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      this.database.db
        .select({ total: sql<number>`count(*)` })
        .from(alertEvents)
        .where(whereClause),
    ]);

    const total = Number(totalResult?.total ?? 0);

    return { items, total };
  }

  async resolveEvent(eventId: string) {
    // Allow resolving both OPEN and SNOOZED events — a user may resolve
    // a snoozed alert early without waiting for the snooze period to expire.
    const resolvableStatuses = [
      AlertEventStatus.OPEN,
      AlertEventStatus.SNOOZED,
    ];

    const [updated] = await this.database.db
      .update(alertEvents)
      .set({
        status: AlertEventStatus.RESOLVED,
        resolvedAt: new Date(),
        snoozedUntil: null,
      })
      .where(
        and(
          eq(alertEvents.id, eventId),
          inArray(alertEvents.status, resolvableStatuses),
        ),
      )
      .returning();

    return updated;
  }

  async snoozeEvent(eventId: string, snoozedUntil: Date) {
    const [updated] = await this.database.db
      .update(alertEvents)
      .set({ status: AlertEventStatus.SNOOZED, snoozedUntil })
      .where(
        and(
          eq(alertEvents.id, eventId),
          eq(alertEvents.status, AlertEventStatus.OPEN),
        ),
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Find all SNOOZED events whose snooze period has expired.
   * Called by the cron task every minute to reopen them.
   */
  async findExpiredSnoozedEvents() {
    return this.database.db
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.status, AlertEventStatus.SNOOZED),
          lte(alertEvents.snoozedUntil, new Date()),
        ),
      );
  }

  async reopenEvent(eventId: string) {
    await this.database.db
      .update(alertEvents)
      .set({ status: AlertEventStatus.OPEN, snoozedUntil: null })
      .where(eq(alertEvents.id, eventId));
  }

  /**
   * Batch-reopen multiple events in a single UPDATE statement.
   * Replaces the N+1 pattern of calling reopenEvent per row.
   */
  async reopenEventsByIds(eventIds: string[]) {
    if (eventIds.length === 0) return;

    await this.database.db
      .update(alertEvents)
      .set({ status: AlertEventStatus.OPEN, snoozedUntil: null })
      .where(inArray(alertEvents.id, eventIds));
  }

  async createEventComment(eventId: string, userId: string, content: string) {
    await this.database.db.insert(eventComments).values({
      eventId,
      userId,
      content,
    });
  }

  async findEventComments(eventId: string) {
    const comments = await this.database.db
      .select()
      .from(eventComments)
      .where(eq(eventComments.eventId, eventId))
      .orderBy(asc(eventComments.createdAt));

    if (comments.length === 0) return [];

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const commentUsers = await this.database.db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users)
      .where(inArray(users.id, userIds));

    const userById = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      userId: c.userId,
      userName: userById[c.userId]?.name ?? 'Unknown',
      userImage: userById[c.userId]?.image ?? null,
    }));
  }
}
