import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { events } from './events';

export const eventComments = pgTable(
  'event_comments',
  {
    id: primaryKeyId('id'),
    eventId: referenceId('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    authorId: referenceId('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    comment: text('comment').notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('event_comments_event_id_idx').on(t.eventId),
    index('event_comments_author_id_idx').on(t.authorId),
  ],
);

export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, {
    fields: [eventComments.eventId],
    references: [events.id],
  }),
  author: one(users, {
    fields: [eventComments.authorId],
    references: [users.id],
  }),
}));

export type EventComment = InferSelectModel<typeof eventComments>;
export type NewEventComment = InferInsertModel<typeof eventComments>;
