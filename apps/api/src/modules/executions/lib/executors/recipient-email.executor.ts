import type { NodeExecutor, WorkflowContext } from '../executor-types';

interface RecipientEmailNodeData {
  readonly email: string;
}

/**
 * Sends the message to an email recipient.
 * Currently logs the action — replace with actual email service integration.
 */
export const recipientEmailExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const nodeData = node.data as RecipientEmailNodeData;
  const messageData = context.message as { text: string } | undefined;
  const messageText = messageData?.text ?? '';

  // TODO: integrate with actual email service
  console.log(`[RecipientEmail] Sending to ${nodeData.email}: ${messageText}`);

  const output: WorkflowContext = {
    notification: {
      sent: true,
      channel: 'email',
      to: nodeData.email,
      message: messageText,
    },
  };

  return output;
};
