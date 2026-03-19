import { AlertEventStatus } from '@spexs/types';
import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { alertEventStatusEnum } from '../enums';
import { executions } from '../executions/executions';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflows } from '../workflows/workflows';

export const alertEvents = pgTable(
  'alert_events',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    status: alertEventStatusEnum('status')
      .notNull()
      .default(AlertEventStatus.OPEN),
    triggerData: jsonb('trigger_data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    stepLogs: jsonb('step_logs').$type<unknown[]>().notNull().default([]),
    executionId: referenceId('execution_id').references(() => executions.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    /** Set when status = SNOOZED. Null for OPEN and RESOLVED events. */
    snoozedUntil: timestamp('snoozed_until', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (t) => [
    index('alert_events_workflow_id_idx').on(t.workflowId),
    index('alert_events_status_idx').on(t.status),
    index('alert_events_execution_id_idx').on(t.executionId),
    index('alert_events_snoozed_until_idx').on(t.snoozedUntil),
    /** Covers findOpenAlertEvent(workflowId, status IN [OPEN, SNOOZED]) */
    index('alert_events_workflow_id_status_idx').on(t.workflowId, t.status),
  ],
);

export const eventComments = pgTable(
  'event_comments',
  {
    id: primaryKeyId('id'),
    eventId: referenceId('event_id')
      .notNull()
      .references(() => alertEvents.id, { onDelete: 'cascade' }),
    userId: referenceId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('event_comments_event_id_idx').on(t.eventId),
    index('event_comments_user_id_idx').on(t.userId),
  ],
);

export const alertEventsRelations = relations(alertEvents, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [alertEvents.workflowId],
    references: [workflows.id],
  }),
  execution: one(executions, {
    fields: [alertEvents.executionId],
    references: [executions.id],
  }),
  comments: many(eventComments),
}));

export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(alertEvents, {
    fields: [eventComments.eventId],
    references: [alertEvents.id],
  }),
  user: one(users, {
    fields: [eventComments.userId],
    references: [users.id],
  }),
}));

export type AlertEvent = InferSelectModel<typeof alertEvents>;
export type NewAlertEvent = InferInsertModel<typeof alertEvents>;

export type EventComment = InferSelectModel<typeof eventComments>;
export type NewEventComment = InferInsertModel<typeof eventComments>;
