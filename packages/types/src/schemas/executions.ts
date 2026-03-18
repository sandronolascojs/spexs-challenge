import { z } from 'zod';
import { NodeExecutionStatus } from '../enums/workflows';

// ── Execute workflow schema ───────────────────────────────────────────────────

export const executeWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  triggerData: z.record(z.string(), z.unknown()).default({}),
});

export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;

// ── Get last execution schema ─────────────────────────────────────────────────

export const getLastExecutionSchema = z.object({
  workflowId: z.string().min(1),
});

export type GetLastExecutionInput = z.infer<typeof getLastExecutionSchema>;

// ── Get execution details schema ──────────────────────────────────────────────

export const getExecutionDetailsSchema = z.object({
  executionId: z.string().min(1),
});

export type GetExecutionDetailsInput = z.infer<
  typeof getExecutionDetailsSchema
>;

// ── Add step comment schema ───────────────────────────────────────────────────

export const addStepCommentSchema = z.object({
  nodeExecutionId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export type AddStepCommentInput = z.infer<typeof addStepCommentSchema>;

// ── Node progress (cached in Redis during execution) ──────────────────────────

export const nodeProgressEntrySchema = z.object({
  nodeId: z.string(),
  status: z.nativeEnum(NodeExecutionStatus),
  error: z.string().optional(),
  outputData: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

/** Single node's progress entry stored in Redis and returned by getProgress. */
export type NodeProgressEntry = z.infer<typeof nodeProgressEntrySchema>;

/** Map of nodeId → progress entry. Returned by `executions.getProgress`. */
export type NodeProgressMap = Record<string, NodeProgressEntry>;
