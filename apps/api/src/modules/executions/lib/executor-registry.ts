import { NodeType } from '@spexs/types';
import type { NodeExecutor } from './executor-types';
import { outputMessageExecutor } from './executors/output-message.executor';
import { recipientEmailExecutor } from './executors/recipient-email.executor';
import { recipientInAppExecutor } from './executors/recipient-in-app.executor';
import { triggerThresholdExecutor } from './executors/trigger-threshold.executor';
import { triggerVarianceExecutor } from './executors/trigger-variance.executor';

/**
 * Maps each NodeType to its executor function.
 * Add new node types here as they are implemented.
 */
const EXECUTOR_REGISTRY: Record<NodeType, NodeExecutor> = {
  [NodeType.TRIGGER_THRESHOLD]: triggerThresholdExecutor,
  [NodeType.TRIGGER_VARIANCE]: triggerVarianceExecutor,
  [NodeType.OUTPUT_MESSAGE]: outputMessageExecutor,
  [NodeType.RECIPIENT_EMAIL]: recipientEmailExecutor,
  [NodeType.RECIPIENT_IN_APP]: recipientInAppExecutor,
};

/**
 * Returns the executor for the given node type.
 * Throws if the node type has no registered executor.
 */
export function getNodeExecutor(nodeType: NodeType): NodeExecutor {
  const executor = EXECUTOR_REGISTRY[nodeType];

  if (!executor) {
    throw new Error(`No executor registered for node type: ${nodeType}`);
  }

  return executor;
}
