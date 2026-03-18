import type { ExecutorNode, WorkflowContext } from '@spexs/types';
import type { EmailService } from '../../email/email.service';

// Re-export pure domain types so existing importers don't break
export type { ExecutorNode, WorkflowContext } from '@spexs/types';

/**
 * Injectable services available to executors at runtime.
 * Passed from the processor so executors stay testable (no direct DI).
 */
export interface ExecutorServices {
  readonly email: EmailService;
}

/**
 * Input provided to each node executor.
 */
export interface NodeExecutorInput {
  /** Lean node data (id, type, workflowId, data) */
  readonly node: ExecutorNode;
  /** Accumulated context from all upstream nodes */
  readonly context: WorkflowContext;
  /** ID of the user who triggered the execution */
  readonly userId: string;
  /** Injectable services (email, etc.) */
  readonly services: ExecutorServices;
}

/**
 * A function that executes the logic for a specific node type.
 * Returns a new context that will be merged into the execution context.
 */
export type NodeExecutor = (
  input: NodeExecutorInput,
) => Promise<WorkflowContext>;
