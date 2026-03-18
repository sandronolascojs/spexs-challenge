import { z } from 'zod';
import { SORT_DIRECTIONS, WORKFLOW_SORT_FIELDS } from '../constants/pagination';
import {
  ComparisonOperator,
  NotificationChannel,
  TriggerType,
  WorkflowCanvasNodeKind,
} from '../enums/workflows';
import {
  createPaginatedResponseSchema,
  paginationQuerySchema,
} from './pagination';

// ── Shared sub-schemas ────────────────────────────────────────────────────────

export const workflowRecipientSchema = z.object({
  channel: z.enum([NotificationChannel.EMAIL, NotificationChannel.IN_APP]),
  recipient: z.string().min(1),
});

export const workflowCanvasNodePositionSchema = z.object({
  nodeId: z.string().min(1),
  kind: z.nativeEnum(WorkflowCanvasNodeKind),
  x: z.number(),
  y: z.number(),
});

export const workflowCanvasEdgeSchema = z.object({
  edgeId: z.string().min(1),
  sourceNodeId: z.string().min(1).nullable(),
  targetNodeId: z.string().min(1).nullable(),
  sourceHandleId: z.string().min(1).nullable(),
  targetHandleId: z.string().min(1).nullable(),
});

export const workflowCanvasStateSchema = z.object({
  nodePositions: z.array(workflowCanvasNodePositionSchema),
  edges: z.array(workflowCanvasEdgeSchema),
});

// ── Create ────────────────────────────────────────────────────────────────────
// Discriminated union so TypeScript narrows trigger-specific fields correctly.

const workflowBaseSchema = z.object({
  name: z.string().min(1).max(255),
  messageTemplate: z.string().min(1),
  recipients: z.array(workflowRecipientSchema).min(1),
});

export const createWorkflowSchema = z.discriminatedUnion('triggerType', [
  workflowBaseSchema.extend({
    triggerType: z.literal(TriggerType.THRESHOLD),
    metricName: z.string().min(1),
    operator: z.nativeEnum(ComparisonOperator),
    thresholdValue: z.number(),
  }),
  workflowBaseSchema.extend({
    triggerType: z.literal(TriggerType.VARIANCE),
    baseValue: z.number(),
    deviationPercentage: z.number().min(0).max(100),
  }),
]);

export const workflowListQuerySchema = paginationQuerySchema.extend({
  sortBy: z
    .enum([
      WORKFLOW_SORT_FIELDS.NAME,
      WORKFLOW_SORT_FIELDS.CREATED_AT,
      WORKFLOW_SORT_FIELDS.UPDATED_AT,
      WORKFLOW_SORT_FIELDS.STATUS,
    ])
    .default(WORKFLOW_SORT_FIELDS.CREATED_AT),
  sortDirection: z
    .enum([SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC])
    .default(SORT_DIRECTIONS.DESC),
});

export const updateWorkflowSchema = z.discriminatedUnion('triggerType', [
  workflowBaseSchema.extend({
    id: z.string().min(1),
    triggerType: z.literal(TriggerType.THRESHOLD),
    metricName: z.string().min(1),
    operator: z.nativeEnum(ComparisonOperator),
    thresholdValue: z.number(),
  }),
  workflowBaseSchema.extend({
    id: z.string().min(1),
    triggerType: z.literal(TriggerType.VARIANCE),
    baseValue: z.number(),
    deviationPercentage: z.number().min(0).max(100),
  }),
]);

// ── Update ────────────────────────────────────────────────────────────────────

export const toggleActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export const deleteWorkflowSchema = z.object({
  id: z.string().min(1),
});

export const updateWorkflowCanvasSchema = z.object({
  id: z.string().min(1),
  canvasState: workflowCanvasStateSchema,
});

const workflowListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  triggerType: z.nativeEnum(TriggerType),
  metricName: z.string().nullable(),
  operator: z.nativeEnum(ComparisonOperator).nullable(),
  thresholdValue: z.number().nullable(),
  baseValue: z.number().nullable(),
  deviationPercentage: z.number().nullable(),
  messageTemplate: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  recipients: z.array(
    z.object({
      id: z.string(),
      workflowId: z.string(),
      channel: z.nativeEnum(NotificationChannel),
      recipient: z.string(),
      createdAt: z.date(),
    }),
  ),
});

export const paginatedWorkflowListSchema = createPaginatedResponseSchema(
  workflowListItemSchema,
);

// ── Inferred types (use these instead of hand-writing interfaces) ─────────────

export type WorkflowRecipientInput = z.infer<typeof workflowRecipientSchema>;
export type WorkflowCanvasNodePosition = z.infer<
  typeof workflowCanvasNodePositionSchema
>;
export type WorkflowCanvasEdge = z.infer<typeof workflowCanvasEdgeSchema>;
export type WorkflowCanvasState = z.infer<typeof workflowCanvasStateSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type WorkflowListQueryInput = z.infer<typeof workflowListQuerySchema>;
export type PaginatedWorkflowList = z.infer<typeof paginatedWorkflowListSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type UpdateWorkflowCanvasInput = z.infer<
  typeof updateWorkflowCanvasSchema
>;
export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;
export type DeleteWorkflowInput = z.infer<typeof deleteWorkflowSchema>;
