import { NodeExecutionStatus } from '@spexs/types';
import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { nodeExecutionStatusEnum } from '../enums';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflowNodes } from '../workflows/workflow-nodes';
import { executions } from './executions';

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const nodeExecutions = pgTable(
  'node_executions',
  {
    id: primaryKeyId('id'),
    executionId: referenceId('execution_id')
      .notNull()
      .references(() => executions.id, { onDelete: 'cascade' }),
    nodeId: referenceId('node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
    status: nodeExecutionStatusEnum('status')
      .notNull()
      .default(NodeExecutionStatus.PENDING),
    inputData: jsonb('input_data'),
    outputData: jsonb('output_data'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('node_executions_execution_id_idx').on(t.executionId),
    index('node_executions_node_id_idx').on(t.nodeId),
    index('node_executions_status_idx').on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const nodeExecutionsRelations = relations(nodeExecutions, ({ one }) => ({
  execution: one(executions, {
    fields: [nodeExecutions.executionId],
    references: [executions.id],
  }),
  node: one(workflowNodes, {
    fields: [nodeExecutions.nodeId],
    references: [workflowNodes.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type NodeExecution = InferSelectModel<typeof nodeExecutions>;
export type NewNodeExecution = InferInsertModel<typeof nodeExecutions>;
