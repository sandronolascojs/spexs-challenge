import { ComparisonOperator, triggerThresholdDataSchema } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import type { NodeExecutor, WorkflowContext } from '../executor-types';

function evaluateThreshold(
  value: number,
  operator: ComparisonOperator,
  threshold: number,
): boolean {
  const evaluators: Record<
    ComparisonOperator,
    (v: number, t: number) => boolean
  > = {
    [ComparisonOperator.GREATER_THAN]: (v, t) => v > t,
    [ComparisonOperator.LESS_THAN]: (v, t) => v < t,
    [ComparisonOperator.GREATER_THAN_OR_EQUAL]: (v, t) => v >= t,
    [ComparisonOperator.LESS_THAN_OR_EQUAL]: (v, t) => v <= t,
    [ComparisonOperator.EQUAL]: (v, t) => v === t,
  };

  return evaluators[operator](value, threshold);
}

function extractMetricValue(context: WorkflowContext): number {
  const triggerData = context.triggerData;
  if (
    triggerData !== null &&
    typeof triggerData === 'object' &&
    'value' in triggerData
  ) {
    const val = triggerData.value;
    return typeof val === 'number' ? val : 0;
  }
  return 0;
}

export const triggerThresholdExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const parsed = triggerThresholdDataSchema.safeParse(node.data);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid trigger threshold node data: ${parsed.error.message}`,
    });
  }

  const metricValue = extractMetricValue(context);

  const triggered = evaluateThreshold(
    metricValue,
    parsed.data.operator,
    parsed.data.thresholdValue,
  );

  const output: WorkflowContext = {
    trigger: {
      metricName: parsed.data.metricName,
      operator: parsed.data.operator,
      thresholdValue: parsed.data.thresholdValue,
      value: metricValue,
      triggered,
    },
  };

  return output;
};
