import { NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { recipientInAppExecutor } from './recipient-in-app.executor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNotification(ctx: WorkflowContext): Record<string, unknown> {
  if (
    typeof ctx.notification !== 'object' ||
    ctx.notification === null ||
    Array.isArray(ctx.notification)
  ) {
    throw new Error('Expected notification to be a plain object');
  }
  return ctx.notification as Record<string, unknown>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('recipientInAppExecutor', () => {
  const MOCK_NODE = buildExecutorNode({ type: NodeType.RECIPIENT_IN_APP });

  it('creates an in-app notification with the rendered message', async () => {
    const services = buildMockExecutorServices();
    const context: WorkflowContext = {
      message: { text: 'Alert: CPU is 95%' },
      trigger: { value: 95 },
    };

    const result = await recipientInAppExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services,
    });

    expect(services.notifications.create).toHaveBeenCalledWith({
      userId: 'user-1',
      workflowId: 'wf-1',
      eventId: undefined,
      title: 'Alert triggered',
      message: 'Alert: CPU is 95%',
    });

    const notification = getNotification(result);
    expect(notification.sent).toBe(true);
    expect(notification.channel).toBe('in_app');
    expect(notification.userId).toBe('user-1');
    expect(notification.message).toBe('Alert: CPU is 95%');
  });

  it('uses fallback message text when context.message is absent', async () => {
    const services = buildMockExecutorServices();

    await recipientInAppExecutor({
      node: MOCK_NODE,
      context: {},
      userId: 'user-1',
      services,
    });

    expect(services.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'A workflow alert condition was met.',
      }),
    );
  });

  it('extracts activeEventId from context and passes it to notifications', async () => {
    const services = buildMockExecutorServices();
    const context: WorkflowContext = {
      message: { text: 'Alert!' },
      activeEventId: 'event-123',
    };

    await recipientInAppExecutor({
      node: MOCK_NODE,
      context,
      userId: 'user-1',
      services,
    });

    expect(services.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-123' }),
    );
  });

  it('does not call EmailService', async () => {
    const services = buildMockExecutorServices();

    await recipientInAppExecutor({
      node: MOCK_NODE,
      context: { message: { text: 'test' } },
      userId: 'user-1',
      services,
    });

    expect(services.email.send).not.toHaveBeenCalled();
  });

  it('uses the node workflowId when creating the notification', async () => {
    const services = buildMockExecutorServices();
    const node = buildExecutorNode({
      type: NodeType.RECIPIENT_IN_APP,
      workflowId: 'wf-custom',
    });

    await recipientInAppExecutor({
      node,
      context: { message: { text: 'Test' } },
      userId: 'user-1',
      services,
    });

    expect(services.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-custom' }),
    );
  });
});
