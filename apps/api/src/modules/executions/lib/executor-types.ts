import type { WorkflowNode } from '@spexs/db';

/**
 * Context that flows through the execution graph.
 * Each executor merges its output into the context for downstream nodes.
 */
export type WorkflowContext = Record<string, unknown>;

/**
 * Input provided to each node executor.
 */
export interface NodeExecutorInput {
  /** The database node row (type, data, id) */
  readonly node: WorkflowNode;
  /** Accumulated context from all upstream nodes */
  readonly context: WorkflowContext;
  /** ID of the user who triggered the execution */
  readonly userId: string;
}

/**
 * A function that executes the logic for a specific node type.
 * Returns a new context that will be merged into the execution context.
 */
export type NodeExecutor = (
  input: NodeExecutorInput,
) => Promise<WorkflowContext>;
