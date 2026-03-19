import type { NodeExecutor, WorkflowContext } from '../executor-types';
import { isRecord } from '../type-guards';

/**
 * Manual trigger executor — fired when the user clicks "Execute Workflow"
 * on the canvas node. Always triggers downstream nodes (triggered: true).
 * Any key/value pairs passed via triggerData are forwarded into context.trigger
 * so downstream nodes can reference them as {{trigger.someKey}} etc.
 */
export const manualTriggerExecutor: NodeExecutor = async ({ context }) => {
  const forwardedData: Record<string, unknown> = isRecord(context.triggerData)
    ? context.triggerData
    : {};

  const output: WorkflowContext = {
    trigger: {
      triggered: true,
      source: 'manual',
      ...forwardedData,
    },
  };

  return output;
};
