import { ExecutionStatus } from '@spexs/types';
import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { executionStatusEnum } from '../enums';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflows } from '../workflows/workflows';

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const executions = pgTable(
  'executions',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    status: executionStatusEnum('status')
      .notNull()
      .default(ExecutionStatus.PENDING),
    triggeredBy: referenceId('triggered_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    triggerData: jsonb('trigger_data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    error: text('error'),
    output: jsonb('output').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('executions_workflow_id_idx').on(t.workflowId),
    index('executions_status_idx').on(t.status),
    index('executions_triggered_by_idx').on(t.triggeredBy),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const executionsRelations = relations(executions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  triggeredByUser: one(users, {
    fields: [executions.triggeredBy],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Execution = InferSelectModel<typeof executions>;
export type NewExecution = InferInsertModel<typeof executions>;
