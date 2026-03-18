import type { ComparisonOperator } from '@spexs/types';
import type { NodeExecutor, WorkflowContext } from '../executor-types';

interface TriggerThresholdNodeData {
  readonly metricName: string;
  readonly operator: ComparisonOperator;
  readonly thresholdValue: number;
}

function evaluateThreshold(
  value: number,
  operator: ComparisonOperator,
  threshold: number,
): boolean {
  const evaluators: Record<
    ComparisonOperator,
    (v: number, t: number) => boolean
  > = {
    gt: (v, t) => v > t,
    lt: (v, t) => v < t,
    gte: (v, t) => v >= t,
    lte: (v, t) => v <= t,
    eq: (v, t) => v === t,
  };

  return evaluators[operator](value, threshold);
}

export const triggerThresholdExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const nodeData = node.data as TriggerThresholdNodeData;
  const triggerData = context.triggerData as
    | Record<string, unknown>
    | undefined;
  const metricValue = (triggerData?.value as number) ?? 0;

  const triggered = evaluateThreshold(
    metricValue,
    nodeData.operator,
    nodeData.thresholdValue,
  );

  const output: WorkflowContext = {
    trigger: {
      metricName: nodeData.metricName,
      operator: nodeData.operator,
      thresholdValue: nodeData.thresholdValue,
      value: metricValue,
      triggered,
    },
  };

  return { ...context, ...output };
};
