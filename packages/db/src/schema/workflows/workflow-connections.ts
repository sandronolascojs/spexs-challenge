import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflowNodes } from './workflow-nodes';
import { workflows } from './workflows';

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const workflowConnections = pgTable(
  'workflow_connections',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    fromNodeId: referenceId('from_node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
    toNodeId: referenceId('to_node_id')
      .notNull()
      .references(() => workflowNodes.id, { onDelete: 'cascade' }),
    fromOutput: text('from_output').notNull().default('main'),
    toInput: text('to_input').notNull().default('main'),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('workflow_connections_workflow_id_idx').on(t.workflowId),
    uniqueIndex('workflow_connections_unique_idx').on(
      t.fromNodeId,
      t.toNodeId,
      t.fromOutput,
      t.toInput,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const workflowConnectionsRelations = relations(
  workflowConnections,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowConnections.workflowId],
      references: [workflows.id],
    }),
    fromNode: one(workflowNodes, {
      fields: [workflowConnections.fromNodeId],
      references: [workflowNodes.id],
      relationName: 'outputConnections',
    }),
    toNode: one(workflowNodes, {
      fields: [workflowConnections.toNodeId],
      references: [workflowNodes.id],
      relationName: 'inputConnections',
    }),
  }),
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type WorkflowConnection = InferSelectModel<typeof workflowConnections>;
export type NewWorkflowConnection = InferInsertModel<
  typeof workflowConnections
>;
