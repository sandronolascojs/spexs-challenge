import { ComparisonOperator, NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { triggerThresholdExecutor } from './trigger-threshold.executor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function execute(
  data: Record<string, unknown>,
  triggerData: Record<string, unknown> = {},
) {
  const context: WorkflowContext = { triggerData };
  return triggerThresholdExecutor({
    node: buildExecutorNode({ type: NodeType.TRIGGER_THRESHOLD, data }),
    context,
    userId: 'user-1',
    services: buildMockExecutorServices(),
  });
}

/** Type guard: narrows result.trigger to a record so we can assert fields. */
function getTrigger(ctx: WorkflowContext): Record<string, unknown> {
  if (
    typeof ctx.trigger !== 'object' ||
    ctx.trigger === null ||
    Array.isArray(ctx.trigger)
  ) {
    throw new Error('Expected trigger to be a plain object');
  }
  return ctx.trigger as Record<string, unknown>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('triggerThresholdExecutor', () => {
  const BASE_DATA: Record<string, unknown> = {
    metricName: 'cpu_usage',
    operator: ComparisonOperator.GREATER_THAN,
    thresholdValue: 80,
  };

  it('triggers when value exceeds threshold (gt)', async () => {
    const result = await execute(BASE_DATA, { value: 95 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(95);
    expect(trigger.thresholdValue).toBe(80);
    expect(trigger.metricName).toBe('cpu_usage');
  });

  it('does not trigger when value is below threshold (gt)', async () => {
    const result = await execute(BASE_DATA, { value: 50 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
    expect(trigger.value).toBe(50);
  });

  it('does not trigger when value equals threshold for strict gt', async () => {
    const result = await execute(BASE_DATA, { value: 80 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
    expect(trigger.value).toBe(80);
  });

  it('triggers for LESS_THAN when value is below threshold', async () => {
    const result = await execute(
      {
        ...BASE_DATA,
        operator: ComparisonOperator.LESS_THAN,
        thresholdValue: 20,
      },
      { value: 10 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(10);
  });

  it('triggers for GREATER_THAN_OR_EQUAL when value equals threshold', async () => {
    const result = await execute(
      { ...BASE_DATA, operator: ComparisonOperator.GREATER_THAN_OR_EQUAL },
      { value: 80 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(80);
  });

  it('triggers for LESS_THAN_OR_EQUAL when value equals threshold', async () => {
    const result = await execute(
      { ...BASE_DATA, operator: ComparisonOperator.LESS_THAN_OR_EQUAL },
      { value: 80 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
  });

  it('triggers for EQUAL when value matches threshold exactly', async () => {
    const result = await execute(
      { ...BASE_DATA, operator: ComparisonOperator.EQUAL, thresholdValue: 42 },
      { value: 42 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(42);
  });

  it('does not trigger for EQUAL when values differ', async () => {
    const result = await execute(
      { ...BASE_DATA, operator: ComparisonOperator.EQUAL, thresholdValue: 42 },
      { value: 43 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
  });

  it('defaults metric value to 0 when triggerData has no value', async () => {
    const result = await execute(BASE_DATA, {});
    const trigger = getTrigger(result);

    expect(trigger.value).toBe(0);
    expect(trigger.triggered).toBe(false);
  });

  it('defaults metric value to 0 when triggerData is not a record', async () => {
    const context: WorkflowContext = { triggerData: 'not-a-record' };
    const result = await triggerThresholdExecutor({
      node: buildExecutorNode({
        type: NodeType.TRIGGER_THRESHOLD,
        data: BASE_DATA,
      }),
      context,
      userId: 'user-1',
      services: buildMockExecutorServices(),
    });
    const trigger = getTrigger(result);

    expect(trigger.value).toBe(0);
  });

  it('throws when metricName is missing from node data', async () => {
    await expect(
      execute({
        operator: ComparisonOperator.GREATER_THAN,
        thresholdValue: 80,
      }),
    ).rejects.toThrow('Invalid trigger threshold node data');
  });

  it('throws when node data is empty', async () => {
    await expect(execute({})).rejects.toThrow(
      'Invalid trigger threshold node data',
    );
  });
});
