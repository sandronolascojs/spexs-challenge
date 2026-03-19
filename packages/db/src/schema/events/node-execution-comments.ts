import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { nodeExecutions } from '../executions/node-executions';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';

export const nodeExecutionComments = pgTable(
  'node_execution_comments',
  {
    id: primaryKeyId('id'),
    nodeExecutionId: referenceId('node_execution_id')
      .notNull()
      .references(() => nodeExecutions.id, { onDelete: 'cascade' }),
    userId: referenceId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('node_execution_comments_node_execution_id_idx').on(
      t.nodeExecutionId,
    ),
    index('node_execution_comments_user_id_idx').on(t.userId),
  ],
);

export const nodeExecutionCommentsRelations = relations(
  nodeExecutionComments,
  ({ one }) => ({
    nodeExecution: one(nodeExecutions, {
      fields: [nodeExecutionComments.nodeExecutionId],
      references: [nodeExecutions.id],
    }),
    user: one(users, {
      fields: [nodeExecutionComments.userId],
      references: [users.id],
    }),
  }),
);

export type NodeExecutionComment = InferSelectModel<
  typeof nodeExecutionComments
>;
export type NewNodeExecutionComment = InferInsertModel<
  typeof nodeExecutionComments
>;
