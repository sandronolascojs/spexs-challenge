import { NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { outputMessageExecutor } from './output-message.executor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMessage(ctx: WorkflowContext): Record<string, unknown> {
  if (
    typeof ctx.message !== 'object' ||
    ctx.message === null ||
    Array.isArray(ctx.message)
  ) {
    throw new Error('Expected message to be a plain object');
  }
  return ctx.message as Record<string, unknown>;
}

function execute(template: string, context: WorkflowContext = {}) {
  return outputMessageExecutor({
    node: buildExecutorNode({
      type: NodeType.OUTPUT_MESSAGE,
      data: { template },
    }),
    context,
    userId: 'user-1',
    services: buildMockExecutorServices(),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('outputMessageExecutor', () => {
  it('interpolates simple template variables from context', async () => {
    const result = await execute('CPU is {{trigger.value}}%', {
      trigger: { value: 95, metricName: 'cpu_usage' },
    });
    const message = getMessage(result);

    expect(message.text).toBe('CPU is 95%');
    expect(message.template).toBe('CPU is {{trigger.value}}%');
  });

  it('interpolates nested context values', async () => {
    const result = await execute(
      'Alert: {{trigger.metricName}} is {{trigger.value}} (threshold: {{trigger.thresholdValue}})',
      {
        trigger: { metricName: 'cpu_usage', value: 95, thresholdValue: 80 },
      },
    );
    const message = getMessage(result);

    expect(message.text).toBe('Alert: cpu_usage is 95 (threshold: 80)');
  });

  it('renders empty string for variables not present in context', async () => {
    const result = await execute('Value: {{missing.key}}', {});
    const message = getMessage(result);

    expect(message.text).toBe('Value: ');
  });

  it('preserves static text with no template variables', async () => {
    const result = await execute('This is a plain message', {});
    const message = getMessage(result);

    expect(message.text).toBe('This is a plain message');
  });

  it('returns the original template alongside the rendered text', async () => {
    const template = 'CPU: {{trigger.value}}';
    const result = await execute(template, { trigger: { value: 50 } });
    const message = getMessage(result);

    expect(message.template).toBe(template);
  });

  it('throws when template field is missing from node data', async () => {
    await expect(
      outputMessageExecutor({
        node: buildExecutorNode({ type: NodeType.OUTPUT_MESSAGE, data: {} }),
        context: {},
        userId: 'user-1',
        services: buildMockExecutorServices(),
      }),
    ).rejects.toThrow('Invalid output message node data');
  });

  it('throws when template is an empty string', async () => {
    await expect(execute('')).rejects.toThrow(
      'Invalid output message node data',
    );
  });
});
