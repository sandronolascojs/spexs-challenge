import type { NodeExecutor, WorkflowContext } from '../executor-types';

/**
 * Creates an in-app notification for the user.
 * Currently logs the action — replace with actual notification service.
 */
export const recipientInAppExecutor: NodeExecutor = async ({
  node,
  context,
  userId,
}) => {
  const messageEntry = context.message;
  const messageText =
    messageEntry !== null &&
    typeof messageEntry === 'object' &&
    'text' in messageEntry &&
    typeof messageEntry.text === 'string'
      ? messageEntry.text
      : '';

  // TODO: integrate with actual in-app notification service
  console.log(
    `[RecipientInApp] Notifying user ${userId} (node ${node.id}): ${messageText}`,
  );

  const output: WorkflowContext = {
    notification: {
      sent: true,
      channel: 'in_app',
      userId,
      message: messageText,
    },
  };

  return output;
};
