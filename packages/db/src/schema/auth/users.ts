import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAtColumn, updatedAtColumn } from '../utils';
import { accounts } from './accounts';
import { sessions } from './sessions';

export const users = pgTable(
  'users',
  {
    // Better Auth manages user IDs — no CUID default
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
