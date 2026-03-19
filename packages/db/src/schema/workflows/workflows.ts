import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import {
  createdAtColumn,
  primaryKeyId,
  referenceId,
  updatedAtColumn,
} from '../utils';
import { workflowConnections } from './workflow-connections';
import { workflowNodes } from './workflow-nodes';

export const workflows = pgTable(
  'workflows',
  {
    id: primaryKeyId('id'),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: referenceId('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('workflows_created_by_idx').on(t.createdBy),
    index('workflows_is_active_idx').on(t.isActive),
  ],
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  creator: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
  nodes: many(workflowNodes),
  connections: many(workflowConnections),
}));

export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;
