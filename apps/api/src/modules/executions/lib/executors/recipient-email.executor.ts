import { type WorkflowContext } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { NodeExecutor } from '../executor-types';
import { isRecord } from '../type-guards';

// Relaxed schema for execution-time validation — allows empty emails array
// so the node can skip gracefully when not yet configured.
const recipientEmailExecutorSchema = z.object({
  emails: z.array(z.string()).default([]),
});

function extractMessageText(context: WorkflowContext): string | null {
  const { message } = context;
  if (isRecord(message) && typeof message.text === 'string') {
    const text = message.text.trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

/**
 * Sends the rendered message to all configured email recipients.
 * If no emails are configured the node is skipped gracefully — the workflow
 * still completes so the alert event is created; the user can add recipients later.
 */
export const recipientEmailExecutor: NodeExecutor = async ({
  node,
  context,
  services,
}) => {
  const parsed = recipientEmailExecutorSchema.safeParse(node.data);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'Recipient email node is not configured. Add at least one recipient email address.',
    });
  }

  // No recipients configured — skip gracefully rather than failing the run
  if (parsed.data.emails.length === 0) {
    return {
      notification: {
        sent: false,
        channel: 'email',
        to: [],
        message: null,
        skipped: true,
        reason: 'No recipient emails configured',
      },
    } satisfies WorkflowContext;
  }

  const messageText = extractMessageText(context);
  if (messageText === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'No message content available. Connect an Output Message node before this recipient.',
    });
  }

  const result = await services.email.send({
    to: parsed.data.emails,
    subject: 'Workflow Alert Notification',
    html: `<p>${messageText}</p>`,
  });

  const output: WorkflowContext = {
    notification: {
      sent: result.sent,
      channel: 'email',
      to: parsed.data.emails,
      message: messageText,
      messageId: result.messageId,
    },
  };

  return output;
};
