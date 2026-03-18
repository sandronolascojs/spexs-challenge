import { z } from 'zod';

// ── Execute workflow schema ───────────────────────────────────────────────────

export const executeWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  triggerData: z.record(z.string(), z.unknown()).default({}),
});

export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;
