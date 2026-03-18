import { type WorkflowContext, recipientEmailDataSchema } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import type { NodeExecutor } from '../executor-types';

/**
 * Sends the message to all configured email recipients.
 * When SEND_EMAILS is enabled, sends via Resend; otherwise logs to console.
 */
export const recipientEmailExecutor: NodeExecutor = async ({
  node,
  context,
  services,
}) => {
  const parsed = recipientEmailDataSchema.safeParse(node.data);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid recipient email node data: ${parsed.error.message}`,
    });
  }

  const messageEntry = context.message;
  const messageText =
    messageEntry && typeof messageEntry === 'object' && 'text' in messageEntry
      ? String(messageEntry.text)
      : '';

  const subject = 'Workflow Alert Notification';
  const htmlBody = `<p>${messageText}</p>`;

  const result = await services.email.send({
    to: parsed.data.emails,
    subject,
    html: htmlBody,
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
