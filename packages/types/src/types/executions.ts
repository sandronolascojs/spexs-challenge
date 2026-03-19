import type { NodeType } from '../enums';

/**
 * Context that flows through the execution graph.
 * Each executor merges its output into the context for downstream nodes.
 */
export type WorkflowContext = Record<string, unknown>;

/**
 * Lean node representation serialized into the BullMQ job payload.
 * Only contains the fields executors actually need — avoids coupling
 * to the full Drizzle `WorkflowNode` row type.
 */
export interface ExecutorNode {
  readonly id: string;
  readonly type: NodeType;
  readonly workflowId: string;
  readonly data: Record<string, unknown>;
}
