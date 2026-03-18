import type { NodeExecutor, WorkflowContext } from '../executor-types';

interface TriggerVarianceNodeData {
  readonly metricName: string;
  readonly baseValue: number;
  readonly deviationPercentage: number;
}

export const triggerVarianceExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const nodeData = node.data as TriggerVarianceNodeData;
  const triggerData = context.triggerData as
    | Record<string, unknown>
    | undefined;
  const currentValue = (triggerData?.value as number) ?? 0;

  const maxDeviation =
    nodeData.baseValue * (nodeData.deviationPercentage / 100);
  const actualDeviation = Math.abs(currentValue - nodeData.baseValue);
  const triggered = actualDeviation > maxDeviation;

  const output: WorkflowContext = {
    trigger: {
      metricName: nodeData.metricName,
      baseValue: nodeData.baseValue,
      deviationPercentage: nodeData.deviationPercentage,
      currentValue,
      actualDeviation,
      triggered,
    },
  };

  return { ...context, ...output };
};
