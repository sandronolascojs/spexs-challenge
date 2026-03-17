import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAtColumn, updatedAtColumn } from '../utils';

export const verifications = pgTable(
  'verifications',
  {
    // Better Auth manages verification IDs
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;
