import { createId } from '@paralleldrive/cuid2';
import { text, timestamp } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Reusable column builders — keep schema DRY and consistent.
// ---------------------------------------------------------------------------

/**
 * Primary key column: text with auto-generated CUID2.
 */
export function primaryKeyId(columnName: string) {
  return text(columnName).primaryKey().$defaultFn(createId);
}

/**
 * Foreign key / reference column: plain text, no default.
 * Chain .notNull() and .references() at the call site.
 */
export function referenceId(columnName: string) {
  return text(columnName);
}

/**
 * Timestamp column with timezone in date mode.
 */
function timestampWithTimezone(columnName: string) {
  return timestamp(columnName, { withTimezone: true, mode: 'date' });
}

/**
 * created_at: defaults to now, not null.
 */
export function createdAtColumn() {
  return timestampWithTimezone('created_at').notNull().defaultNow();
}

/**
 * updated_at: defaults to now, not null.
 * NOTE: Drizzle does not auto-update this on writes.
 * Set it explicitly in the repository/service layer via `new Date()`.
 */
export function updatedAtColumn() {
  return timestampWithTimezone('updated_at').notNull().defaultNow();
}
