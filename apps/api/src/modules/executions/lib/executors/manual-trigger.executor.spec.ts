import { NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { manualTriggerExecutor } from './manual-trigger.executor';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

describe('manualTriggerExecutor', () => {
  const MOCK_NODE = buildExecutorNode({ type: NodeType.MANUAL_TRIGGER });
  const SERVICES = buildMockExecutorServices();

  it('always sets triggered to true regardless of context', async () => {
    const context: WorkflowContext = { triggerData: {} };
    const result = await manualTriggerExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services: SERVICES,
    });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.source).toBe('manual');
  });

  it('forwards all triggerData key/values into context.trigger', async () => {
    const context: WorkflowContext = {
      triggerData: { value: 42, customKey: 'hello' },
    };
    const result = await manualTriggerExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services: SERVICES,
    });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.source).toBe('manual');
    expect(trigger.value).toBe(42);
    expect(trigger.customKey).toBe('hello');
  });

  it('handles non-record triggerData gracefully (no crash)', async () => {
    const context: WorkflowContext = { triggerData: 'invalid' };
    const result = await manualTriggerExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services: SERVICES,
    });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.source).toBe('manual');
  });

  it('handles missing triggerData gracefully', async () => {
    const context: WorkflowContext = {};
    const result = await manualTriggerExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services: SERVICES,
    });
    const trigger = getTrigger(result);

    expect(trigger.triggered).toBe(true);
    expect(trigger.source).toBe('manual');
  });
});
