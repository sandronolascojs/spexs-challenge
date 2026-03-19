import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { alertEvents } from '../events/alert-events';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflows } from '../workflows/workflows';

export const notifications = pgTable(
  'notifications',
  {
    id: primaryKeyId('id'),
    userId: referenceId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workflowId: referenceId('workflow_id').references(() => workflows.id, {
      onDelete: 'set null',
    }),
    eventId: referenceId('event_id').references(() => alertEvents.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('notifications_user_id_idx').on(t.userId),
    index('notifications_is_read_idx').on(t.isRead),
    index('notifications_created_at_idx').on(t.createdAt),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  workflow: one(workflows, {
    fields: [notifications.workflowId],
    references: [workflows.id],
  }),
  event: one(alertEvents, {
    fields: [notifications.eventId],
    references: [alertEvents.id],
  }),
}));

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
