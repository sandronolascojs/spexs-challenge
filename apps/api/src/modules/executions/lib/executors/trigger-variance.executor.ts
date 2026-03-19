import { triggerVarianceDataSchema } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import type { NodeExecutor, WorkflowContext } from '../executor-types';
import { isRecordWithValue } from '../type-guards';

function extractMetricValue(context: WorkflowContext): number {
  return isRecordWithValue(context.triggerData) &&
    typeof context.triggerData.value === 'number'
    ? context.triggerData.value
    : 0;
}

export const triggerVarianceExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const parsed = triggerVarianceDataSchema.safeParse(node.data);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid trigger variance node data: ${parsed.error.message}`,
    });
  }

  const currentValue = extractMetricValue(context);

  const maxDeviation =
    parsed.data.baseValue * (parsed.data.deviationPercentage / 100);
  const actualDeviation = Math.abs(currentValue - parsed.data.baseValue);
  const triggered = actualDeviation > maxDeviation;

  const output: WorkflowContext = {
    trigger: {
      metricName: parsed.data.metricName,
      baseValue: parsed.data.baseValue,
      deviationPercentage: parsed.data.deviationPercentage,
      value: currentValue,
      currentValue,
      actualDeviation,
      triggered,
    },
  };

  return output;
};
