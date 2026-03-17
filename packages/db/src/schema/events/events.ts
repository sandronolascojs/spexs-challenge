import type { TriggerPayload } from '@spexs/types';
import { EventStatus } from '@spexs/types';
import { relations, sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { eventStatusEnum } from '../enums';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflows } from '../workflows/workflows';
import { eventComments } from './event-comments';

export const events = pgTable(
  'events',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    status: eventStatusEnum('status').notNull().default(EventStatus.OPEN),
    triggerPayload: jsonb('trigger_payload').$type<TriggerPayload>().notNull(),
    triggeredBy: referenceId('triggered_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    resolvedBy: referenceId('resolved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('events_workflow_id_idx').on(t.workflowId),
    index('events_status_idx').on(t.status),
    index('events_triggered_by_idx').on(t.triggeredBy),
    // Partial unique index: only one open event per workflow at a time.
    // Uses sql`` because DDL statements do not support parameterized values.
    uniqueIndex('events_one_open_per_workflow_idx')
      .on(t.workflowId)
      .where(sql`${t.status} = 'open'`),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [events.workflowId],
    references: [workflows.id],
  }),
  triggeredByUser: one(users, {
    fields: [events.triggeredBy],
    references: [users.id],
    relationName: 'triggeredBy',
  }),
  resolvedByUser: one(users, {
    fields: [events.resolvedBy],
    references: [users.id],
    relationName: 'resolvedBy',
  }),
  comments: many(eventComments),
}));

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;
