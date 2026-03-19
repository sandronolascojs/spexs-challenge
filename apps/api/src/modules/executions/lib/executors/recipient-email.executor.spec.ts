import { NodeType } from '@spexs/types';
import {
  buildExecutorNode,
  buildMockExecutorServices,
} from '../../../../test-utils/factories';
import type { WorkflowContext } from '../executor-types';
import { recipientEmailExecutor } from './recipient-email.executor';

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

function execute(
  data: Record<string, unknown>,
  context: WorkflowContext,
  services = buildMockExecutorServices(),
) {
  return recipientEmailExecutor({
    node: buildExecutorNode({ type: NodeType.RECIPIENT_EMAIL, data }),
    context,
    userId: 'user-1',
    services,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('recipientEmailExecutor', () => {
  it('sends email and returns sent notification context', async () => {
    const services = buildMockExecutorServices();

    const result = await execute(
      { emails: ['test@example.com'] },
      { message: { text: 'Alert: CPU is 95%' } },
      services,
    );
    const notification = getNotification(result);

    expect(notification.sent).toBe(true);
    expect(notification.channel).toBe('email');
    expect(notification.to).toEqual(['test@example.com']);
    expect(notification.message).toBe('Alert: CPU is 95%');
    expect(notification.messageId).toBe('msg-123');
  });

  it('calls EmailService.send with correct payload', async () => {
    const services = buildMockExecutorServices();

    await execute(
      { emails: ['a@test.com', 'b@test.com'] },
      { message: { text: 'Alert!' } },
      services,
    );

    expect(services.email.send).toHaveBeenCalledWith({
      to: ['a@test.com', 'b@test.com'],
      subject: 'Workflow Alert Notification',
      html: '<p>Alert!</p>',
    });
  });

  it('sends to multiple recipients', async () => {
    const services = buildMockExecutorServices();

    await execute(
      { emails: ['a@test.com', 'b@test.com', 'c@test.com'] },
      { message: { text: 'Alert!' } },
      services,
    );

    const [[payload]] = (services.email.send as jest.Mock).mock.calls as [
      [
        {
          to: string[];
          subject: string;
          html: string;
        },
      ],
    ];

    expect(payload.to).toHaveLength(3);
  });

  it('skips gracefully when no emails are configured', async () => {
    const result = await execute(
      { emails: [] },
      { message: { text: 'Alert!' } },
    );
    const notification = getNotification(result);

    expect(notification.sent).toBe(false);
    expect(notification.skipped).toBe(true);
    expect(notification.reason).toBe('No recipient emails configured');
  });

  it('skips gracefully when emails field is absent (defaults to empty array)', async () => {
    const result = await execute({}, { message: { text: 'Alert!' } });
    const notification = getNotification(result);

    expect(notification.sent).toBe(false);
    expect(notification.skipped).toBe(true);
  });

  it('throws PRECONDITION_FAILED when context has no message', async () => {
    await expect(execute({ emails: ['test@example.com'] }, {})).rejects.toThrow(
      'No message content available',
    );
  });

  it('throws PRECONDITION_FAILED when message text is whitespace-only', async () => {
    await expect(
      execute({ emails: ['test@example.com'] }, { message: { text: '   ' } }),
    ).rejects.toThrow('No message content available');
  });

  it('throws PRECONDITION_FAILED when context.message is not a record', async () => {
    await expect(
      execute({ emails: ['test@example.com'] }, { message: 'just a string' }),
    ).rejects.toThrow('No message content available');
  });
});
