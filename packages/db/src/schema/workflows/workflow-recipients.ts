import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { notificationChannelEnum } from '../enums';
import { createdAtColumn, primaryKeyId, referenceId } from '../utils';
import { workflows } from './workflows';

export const workflowRecipients = pgTable(
  'workflow_recipients',
  {
    id: primaryKeyId('id'),
    workflowId: referenceId('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    recipient: text('recipient').notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('workflow_recipients_workflow_id_idx').on(t.workflowId),
    uniqueIndex('workflow_recipients_unique_idx').on(
      t.workflowId,
      t.channel,
      t.recipient,
    ),
  ],
);

export const workflowRecipientsRelations = relations(
  workflowRecipients,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowRecipients.workflowId],
      references: [workflows.id],
    }),
  }),
);

export type WorkflowRecipient = InferSelectModel<typeof workflowRecipients>;
export type NewWorkflowRecipient = InferInsertModel<typeof workflowRecipients>;
