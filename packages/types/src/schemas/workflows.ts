import { z } from 'zod';
import { SORT_DIRECTIONS, WORKFLOW_SORT_FIELDS } from '../constants/pagination';
import { ComparisonOperator, NodeType } from '../enums/workflows';
import {
  createPaginatedResponseSchema,
  paginationQuerySchema,
} from './pagination';

// ── Node data schemas (per NodeType) ──────────────────────────────────────────

export const triggerThresholdDataSchema = z.object({
  metricName: z.string().min(1),
  operator: z.enum(ComparisonOperator),
  thresholdValue: z.number(),
});

export const triggerVarianceDataSchema = z.object({
  metricName: z.string().min(1),
  baseValue: z.number(),
  deviationPercentage: z.number().min(0).max(100),
});

export const outputMessageDataSchema = z.object({
  template: z.string().min(1),
});

export const recipientEmailDataSchema = z.object({
  email: z.email(),
});

export const recipientInAppDataSchema = z.object({
  userId: z.string().optional(),
});

// ── Node position ─────────────────────────────────────────────────────────────

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// ── Node CRUD schemas ─────────────────────────────────────────────────────────

export const addNodeSchema = z.object({
  workflowId: z.string().min(1),
  type: z.enum(NodeType),
  name: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  position: nodePositionSchema,
});

export const removeNodeSchema = z.object({
  nodeId: z.string().min(1),
});

export const updateNodeDataSchema = z.object({
  nodeId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const updateNodePositionSchema = z.object({
  nodeId: z.string().min(1),
  position: nodePositionSchema,
});

// ── Connection CRUD schemas ───────────────────────────────────────────────────

export const addConnectionSchema = z.object({
  workflowId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  fromOutput: z.string().default('main'),
  toInput: z.string().default('main'),
});

export const removeConnectionSchema = z.object({
  connectionId: z.string().min(1),
});

// ── Workflow CRUD schemas (slimmed) ───────────────────────────────────────────

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateWorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
});

export const toggleActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export const deleteWorkflowSchema = z.object({
  id: z.string().min(1),
});

// ── Workflow list query ───────────────────────────────────────────────────────

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

// ── Workflow list item (for response typing) ──────────────────────────────────

const workflowListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  nodeCount: z.number(),
});

export const paginatedWorkflowListSchema = createPaginatedResponseSchema(
  workflowListItemSchema,
);

// ── Inferred types ────────────────────────────────────────────────────────────

export type TriggerThresholdData = z.infer<typeof triggerThresholdDataSchema>;
export type TriggerVarianceData = z.infer<typeof triggerVarianceDataSchema>;
export type OutputMessageData = z.infer<typeof outputMessageDataSchema>;
export type RecipientEmailData = z.infer<typeof recipientEmailDataSchema>;
export type RecipientInAppData = z.infer<typeof recipientInAppDataSchema>;
export type NodePosition = z.infer<typeof nodePositionSchema>;

export type AddNodeInput = z.infer<typeof addNodeSchema>;
export type RemoveNodeInput = z.infer<typeof removeNodeSchema>;
export type UpdateNodeDataInput = z.infer<typeof updateNodeDataSchema>;
export type UpdateNodePositionInput = z.infer<typeof updateNodePositionSchema>;

export type AddConnectionInput = z.infer<typeof addConnectionSchema>;
export type RemoveConnectionInput = z.infer<typeof removeConnectionSchema>;

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type WorkflowListQueryInput = z.infer<typeof workflowListQuerySchema>;
export type PaginatedWorkflowList = z.infer<typeof paginatedWorkflowListSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;
export type DeleteWorkflowInput = z.infer<typeof deleteWorkflowSchema>;
