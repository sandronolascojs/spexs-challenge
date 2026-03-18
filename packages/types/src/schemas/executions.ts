import { z } from 'zod';

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
