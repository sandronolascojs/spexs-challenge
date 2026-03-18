import type { WorkflowCanvasState } from '@spexs/types';
import { relations } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { comparisonOperatorEnum, triggerTypeEnum } from '../enums';
import { events } from '../events/events';
import {
  createdAtColumn,
  primaryKeyId,
  referenceId,
  updatedAtColumn,
} from '../utils';
import { workflowRecipients } from './workflow-recipients';

export const workflows = pgTable(
  'workflows',
  {
    id: primaryKeyId('id'),
    name: text('name').notNull(),
    triggerType: triggerTypeEnum('trigger_type').notNull(),

    // Threshold-specific (required when triggerType = 'threshold')
    metricName: text('metric_name'),
    operator: comparisonOperatorEnum('operator'),
    thresholdValue: doublePrecision('threshold_value'),

    // Variance-specific (required when triggerType = 'variance')
    baseValue: doublePrecision('base_value'),
    deviationPercentage: doublePrecision('deviation_percentage'),

    messageTemplate: text('message_template').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    canvasState: jsonb('canvas_state').$type<WorkflowCanvasState>().notNull(),

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
  recipients: many(workflowRecipients),
  events: many(events),
}));

export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;
