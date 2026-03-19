import { NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { triggerVarianceExecutor } from './trigger-variance.executor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function execute(
  data: Record<string, unknown>,
  triggerData: Record<string, unknown> = {},
) {
  const context: WorkflowContext = { triggerData };
  return triggerVarianceExecutor({
    node: buildExecutorNode({ type: NodeType.TRIGGER_VARIANCE, data }),
    context,
    userId: 'user-1',
    services: buildMockExecutorServices(),
  });
}

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

describe('triggerVarianceExecutor', () => {
  const BASE_DATA: Record<string, unknown> = {
    metricName: 'memory_usage',
    baseValue: 100,
    deviationPercentage: 20,
  };

  it('triggers when deviation exceeds allowed percentage', async () => {
    // base=100, deviation=20% → max allowed=20. current=125 → actual=25 > 20
    const result = await execute(BASE_DATA, { value: 125 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(125);
    expect(trigger.metricName).toBe('memory_usage');
    expect(trigger.baseValue).toBe(100);
    expect(trigger.deviationPercentage).toBe(20);
  });

  it('does not trigger when deviation is within allowed range', async () => {
    // base=100, deviation=20% → max=20. current=110 → actual=10 ≤ 20
    const result = await execute(BASE_DATA, { value: 110 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
    expect(trigger.value).toBe(110);
  });

  it('does not trigger when deviation is exactly at the boundary', async () => {
    // base=100, deviation=20% → max=20. current=120 → actual=20 NOT > 20
    const result = await execute(BASE_DATA, { value: 120 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
  });

  it('triggers when value drops significantly below base', async () => {
    // base=100, deviation=20% → max=20. current=70 → actual=30 > 20
    const result = await execute(BASE_DATA, { value: 70 });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(70);
  });

  it('exposes actualDeviation and currentValue on the trigger', async () => {
    const result = await execute(BASE_DATA, { value: 130 });
    const trigger = getTrigger(result);

    expect(trigger.actualDeviation).toBe(30);
    expect(trigger.currentValue).toBe(130);
  });

  it('defaults metric value to 0 when triggerData has no value field', async () => {
    // base=100, current=0 → actual=100 > 20 → triggers
    const result = await execute(BASE_DATA, {});
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.value).toBe(0);
  });

  it('does not trigger when deviationPercentage is 100%', async () => {
    // base=100, deviation=100% → max=100. current=199 → actual=99 ≤ 100
    const result = await execute(
      { ...BASE_DATA, deviationPercentage: 100 },
      { value: 199 },
    );
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(false);
  });

  it('throws when baseValue is missing from node data', async () => {
    await expect(
      execute({ metricName: 'cpu', deviationPercentage: 10 }),
    ).rejects.toThrow('Invalid trigger variance node data');
  });

  it('throws when node data is empty', async () => {
    await expect(execute({})).rejects.toThrow(
      'Invalid trigger variance node data',
    );
  });
});
