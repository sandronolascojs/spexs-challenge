import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { nodeTypeEnum } from '../enums';
import {
  createdAtColumn,
  primaryKeyId,
  referenceId,
  updatedAtColumn,
} from '../utils';
import { workflows } from './workflows';

// ---------------------------------------------------------------------------
// Node position stored inside the JSONB `position` column.
// ---------------------------------------------------------------------------

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const workflowNodes = pgTable(
  'workflow_nodes',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    type: nodeTypeEnum('type').notNull(),
    name: text('name').notNull(),
    data: jsonb('data').notNull().default({}),
    position: jsonb('position').$type<WorkflowNodePosition>().notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('workflow_nodes_workflow_id_idx').on(t.workflowId),
    index('workflow_nodes_type_idx').on(t.type),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const workflowNodesRelations = relations(workflowNodes, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowNodes.workflowId],
    references: [workflows.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type WorkflowNode = InferSelectModel<typeof workflowNodes>;
export type NewWorkflowNode = InferInsertModel<typeof workflowNodes>;
